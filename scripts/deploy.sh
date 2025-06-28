#!/bin/bash

# Support-docs AWS Deployment Script
# 実行前に AWS CLI 認証情報を設定してください

set -e  # エラー時に停止

echo "🚀 Support-docs AWS デプロイメント開始"

# 変数設定
PROJECT_NAME="support-docs"
AWS_REGION="ap-northeast-1"
INSTANCE_TYPE="t3.medium"
DB_INSTANCE_CLASS="db.t3.small"
KEY_PAIR_NAME="support-docs-key"

# 色付きアウトプット関数
print_status() {
    echo -e "\n\033[1;34m[INFO]\033[0m $1"
}

print_success() {
    echo -e "\033[1;32m[SUCCESS]\033[0m $1"
}

print_warning() {
    echo -e "\033[1;33m[WARNING]\033[0m $1"
}

print_error() {
    echo -e "\033[1;31m[ERROR]\033[0m $1"
}

# AWS CLI 確認
check_aws_cli() {
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI がインストールされていません"
        print_status "AWS CLI をインストールしてから再実行してください"
        exit 1
    fi
    
    if ! aws sts get-caller-identity &> /dev/null; then
        print_error "AWS認証情報が設定されていません" 
        print_status "aws configure を実行してから再実行してください"
        exit 1
    fi
    
    print_success "AWS CLI 認証OK"
}

# VPC・セキュリティグループ作成
create_security_groups() {
    print_status "セキュリティグループを作成中..."
    
    # デフォルトVPC ID取得
    VPC_ID=$(aws ec2 describe-vpcs --filters "Name=isDefault,Values=true" \
        --query 'Vpcs[0].VpcId' --output text --region $AWS_REGION)
    
    if [ "$VPC_ID" = "None" ]; then
        print_error "デフォルトVPCが見つかりません"
        exit 1
    fi
    
    # EC2セキュリティグループ作成
    EC2_SG_ID=$(aws ec2 create-security-group \
        --group-name "${PROJECT_NAME}-ec2-sg" \
        --description "Security group for ${PROJECT_NAME} EC2 instance" \
        --vpc-id $VPC_ID \
        --query 'GroupId' --output text --region $AWS_REGION 2>/dev/null || \
        aws ec2 describe-security-groups \
        --filters "Name=group-name,Values=${PROJECT_NAME}-ec2-sg" \
        --query 'SecurityGroups[0].GroupId' --output text --region $AWS_REGION)
    
    # EC2セキュリティグループルール追加
    aws ec2 authorize-security-group-ingress \
        --group-id $EC2_SG_ID \
        --protocol tcp --port 22 --cidr 0.0.0.0/0 \
        --region $AWS_REGION 2>/dev/null || true
    
    aws ec2 authorize-security-group-ingress \
        --group-id $EC2_SG_ID \
        --protocol tcp --port 80 --cidr 0.0.0.0/0 \
        --region $AWS_REGION 2>/dev/null || true
    
    aws ec2 authorize-security-group-ingress \
        --group-id $EC2_SG_ID \
        --protocol tcp --port 443 --cidr 0.0.0.0/0 \
        --region $AWS_REGION 2>/dev/null || true
    
    # RDSセキュリティグループ作成
    RDS_SG_ID=$(aws ec2 create-security-group \
        --group-name "${PROJECT_NAME}-rds-sg" \
        --description "Security group for ${PROJECT_NAME} RDS instance" \
        --vpc-id $VPC_ID \
        --query 'GroupId' --output text --region $AWS_REGION 2>/dev/null || \
        aws ec2 describe-security-groups \
        --filters "Name=group-name,Values=${PROJECT_NAME}-rds-sg" \
        --query 'SecurityGroups[0].GroupId' --output text --region $AWS_REGION)
    
    # RDSセキュリティグループルール追加 (EC2からのみアクセス許可)
    aws ec2 authorize-security-group-ingress \
        --group-id $RDS_SG_ID \
        --protocol tcp --port 5432 \
        --source-group $EC2_SG_ID \
        --region $AWS_REGION 2>/dev/null || true
    
    print_success "セキュリティグループ作成完了: EC2=$EC2_SG_ID, RDS=$RDS_SG_ID"
}

# S3バケット作成
create_s3_bucket() {
    print_status "S3バケットを作成中..."
    
    BUCKET_NAME="${PROJECT_NAME}-files-$(date +%s)"
    
    aws s3 mb s3://$BUCKET_NAME --region $AWS_REGION
    
    # バケットポリシー設定 (プライベート)
    aws s3api put-public-access-block \
        --bucket $BUCKET_NAME \
        --public-access-block-configuration \
        "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
    
    # バージョニング有効化
    aws s3api put-bucket-versioning \
        --bucket $BUCKET_NAME \
        --versioning-configuration Status=Enabled
    
    print_success "S3バケット作成完了: $BUCKET_NAME"
}

# IAMロール作成
create_iam_role() {
    print_status "IAMロールを作成中..."
    
    # 信頼ポリシー
    cat > trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ec2.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF
    
    # S3アクセスポリシー
    cat > s3-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::${BUCKET_NAME}/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket"
      ],
      "Resource": "arn:aws:s3:::${BUCKET_NAME}"
    }
  ]
}
EOF
    
    # IAMロール作成
    aws iam create-role \
        --role-name "${PROJECT_NAME}-ec2-role" \
        --assume-role-policy-document file://trust-policy.json \
        --region $AWS_REGION 2>/dev/null || true
    
    # ポリシーアタッチ
    aws iam put-role-policy \
        --role-name "${PROJECT_NAME}-ec2-role" \
        --policy-name "S3Access" \
        --policy-document file://s3-policy.json \
        --region $AWS_REGION
    
    # インスタンスプロファイル作成
    aws iam create-instance-profile \
        --instance-profile-name "${PROJECT_NAME}-ec2-profile" \
        --region $AWS_REGION 2>/dev/null || true
    
    aws iam add-role-to-instance-profile \
        --instance-profile-name "${PROJECT_NAME}-ec2-profile" \
        --role-name "${PROJECT_NAME}-ec2-role" \
        --region $AWS_REGION 2>/dev/null || true
    
    # クリーンアップ
    rm trust-policy.json s3-policy.json
    
    print_success "IAMロール作成完了"
}

# RDS作成
create_rds() {
    print_status "RDS PostgreSQLを作成中..."
    
    DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    
    aws rds create-db-instance \
        --db-instance-identifier "${PROJECT_NAME}-db" \
        --db-instance-class $DB_INSTANCE_CLASS \
        --engine postgres \
        --engine-version 15.4 \
        --master-username postgres \
        --master-user-password "$DB_PASSWORD" \
        --allocated-storage 20 \
        --storage-type gp2 \
        --vpc-security-group-ids $RDS_SG_ID \
        --db-name support_docs \
        --backup-retention-period 7 \
        --storage-encrypted \
        --region $AWS_REGION 2>/dev/null || print_warning "RDSインスタンスが既に存在します"
    
    print_success "RDS作成開始 (完了まで10-15分程度かかります)"
    print_status "DB パスワード: $DB_PASSWORD"
    
    # パスワードをファイルに保存
    echo "DB_PASSWORD=$DB_PASSWORD" > .env.deploy
}

# キーペア作成
create_key_pair() {
    print_status "EC2キーペアを作成中..."
    
    if [ ! -f "${KEY_PAIR_NAME}.pem" ]; then
        aws ec2 create-key-pair \
            --key-name $KEY_PAIR_NAME \
            --query 'KeyMaterial' --output text \
            --region $AWS_REGION > "${KEY_PAIR_NAME}.pem"
        
        chmod 400 "${KEY_PAIR_NAME}.pem"
        print_success "キーペア作成完了: ${KEY_PAIR_NAME}.pem"
    else
        print_warning "キーペアファイルが既に存在します: ${KEY_PAIR_NAME}.pem"
    fi
}

# EC2インスタンス作成
create_ec2() {
    print_status "EC2インスタンスを作成中..."
    
    # 最新のUbuntu AMI ID取得
    AMI_ID=$(aws ec2 describe-images \
        --owners 099720109477 \
        --filters \
        "Name=name,Values=ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*" \
        "Name=state,Values=available" \
        --query 'Images|sort_by(@, &CreationDate)[-1]|ImageId' \
        --output text --region $AWS_REGION)
    
    # ユーザーデータスクリプト作成
    cat > user-data.sh << 'EOF'
#!/bin/bash
apt update && apt upgrade -y

# Node.js 18インストール
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# PM2インストール
npm install -g pm2

# 必要パッケージインストール
apt-get install -y \
  libnss3-dev \
  libgconf-2-4 \
  libxss1 \
  libxtst6 \
  libxrandr2 \
  libasound2-dev \
  libpangocairo-1.0-0 \
  libatk1.0-0 \
  libcairo-gobject2 \
  libgtk-3-0 \
  libgdk-pixbuf2.0-0 \
  nginx \
  git \
  postgresql-client \
  unzip

# Chrome インストール
wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add -
echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google.list
apt-get update && apt-get install -y google-chrome-stable

# アプリケーションディレクトリ作成
mkdir -p /opt/support-docs
chown ubuntu:ubuntu /opt/support-docs

# 完了通知
echo "EC2 setup completed" > /home/ubuntu/setup-complete.txt
EOF
    
    # EC2インスタンス起動
    INSTANCE_ID=$(aws ec2 run-instances \
        --image-id $AMI_ID \
        --count 1 \
        --instance-type $INSTANCE_TYPE \
        --key-name $KEY_PAIR_NAME \
        --security-group-ids $EC2_SG_ID \
        --iam-instance-profile Name="${PROJECT_NAME}-ec2-profile" \
        --user-data file://user-data.sh \
        --tag-specifications \
        "ResourceType=instance,Tags=[{Key=Name,Value=${PROJECT_NAME}-server},{Key=Project,Value=${PROJECT_NAME}}]" \
        --query 'Instances[0].InstanceId' \
        --output text --region $AWS_REGION)
    
    rm user-data.sh
    
    print_success "EC2インスタンス作成完了: $INSTANCE_ID"
    
    # インスタンス起動待機
    print_status "インスタンスの起動を待機中..."
    aws ec2 wait instance-running --instance-ids $INSTANCE_ID --region $AWS_REGION
    
    # Elastic IP割り当て
    print_status "Elastic IPを割り当て中..."
    ALLOCATION_ID=$(aws ec2 allocate-address \
        --domain vpc \
        --query 'AllocationId' \
        --output text --region $AWS_REGION)
    
    aws ec2 associate-address \
        --instance-id $INSTANCE_ID \
        --allocation-id $ALLOCATION_ID \
        --region $AWS_REGION
    
    PUBLIC_IP=$(aws ec2 describe-addresses \
        --allocation-ids $ALLOCATION_ID \
        --query 'Addresses[0].PublicIp' \
        --output text --region $AWS_REGION)
    
    print_success "Elastic IP割り当て完了: $PUBLIC_IP"
    
    echo "INSTANCE_ID=$INSTANCE_ID" >> .env.deploy
    echo "PUBLIC_IP=$PUBLIC_IP" >> .env.deploy
}

# 環境変数ファイル生成
generate_env_file() {
    print_status "本番用環境変数ファイルを生成中..."
    
    # RDS エンドポイント取得
    print_status "RDSエンドポイントを取得中..."
    while true; do
        RDS_ENDPOINT=$(aws rds describe-db-instances \
            --db-instance-identifier "${PROJECT_NAME}-db" \
            --query 'DBInstances[0].Endpoint.Address' \
            --output text --region $AWS_REGION 2>/dev/null)
        
        if [ "$RDS_ENDPOINT" != "None" ] && [ "$RDS_ENDPOINT" != "" ]; then
            break
        fi
        
        print_status "RDS起動中... 30秒後に再確認"
        sleep 30
    done
    
    # デプロイ用環境変数ファイル生成
    cat > .env.production << EOF
NODE_ENV=production
PORT=5000
CLIENT_URL=https://your-domain.com

# データベース設定
DB_HOST=$RDS_ENDPOINT
DB_PORT=5432
DB_NAME=support_docs
DB_USER=postgres
DB_PASSWORD=$DB_PASSWORD

# AWS設定
AWS_REGION=$AWS_REGION
AWS_S3_BUCKET=$BUCKET_NAME

# API設定 (実際のキーに置き換えてください)
OPENAI_API_KEY=your-openai-api-key-here
ANTHROPIC_API_KEY=your-anthropic-api-key-here

# セキュリティ設定 (実際の値に置き換えてください)
JWT_SECRET=$(openssl rand -base64 64)
CORS_ORIGIN=https://your-domain.com

# Puppeteer設定
PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome
EOF
    
    print_success "環境変数ファイル生成完了: .env.production"
    echo "RDS_ENDPOINT=$RDS_ENDPOINT" >> .env.deploy
}

# デプロイメント手順表示
show_deployment_instructions() {
    print_success "🎉 AWS インフラ構築完了！"
    
    echo -e "\n📋 次のステップ:"
    echo "1. .env.production ファイルを編集して実際のAPIキーを設定"
    echo "2. 以下のコマンドでEC2にアプリケーションをデプロイ:"
    echo ""
    echo "   # SSH接続"
    echo "   ssh -i ${KEY_PAIR_NAME}.pem ubuntu@$PUBLIC_IP"
    echo ""
    echo "   # アプリケーション配置"
    echo "   cd /opt/support-docs"
    echo "   git clone [あなたのリポジトリURL] ."
    echo "   npm install --production"
    echo "   cp .env.production .env"
    echo "   nano .env  # APIキーを実際の値に編集"
    echo ""
    echo "   # サービス起動"
    echo "   pm2 start server/index.js --name support-docs"
    echo "   pm2 startup && pm2 save"
    echo ""
    echo "3. ドメイン設定とSSL証明書取得"
    echo "4. Nginx設定"
    echo ""
    echo "📊 リソース情報:"
    echo "   EC2 IP: $PUBLIC_IP"
    echo "   RDS Endpoint: $RDS_ENDPOINT"
    echo "   S3 Bucket: $BUCKET_NAME"
    echo ""
    echo "💰 推定月額コスト: $75-90 USD"
    echo ""
    echo "📝 詳細手順: deployment/aws-deploy-checklist.md を参照"
}

# メイン実行
main() {
    print_status "Support-docs AWS デプロイメント開始"
    
    check_aws_cli
    create_security_groups
    create_s3_bucket
    create_iam_role
    create_key_pair
    create_rds
    create_ec2
    generate_env_file
    show_deployment_instructions
    
    print_success "🚀 デプロイメント準備完了！"
}

# スクリプト実行
main "$@"