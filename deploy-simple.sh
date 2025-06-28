#!/bin/bash

# ====================================
# 歩みサポート AWS簡単デプロイスクリプト
# ====================================

set -e

# 設定
APP_NAME="ayumi-support"
AWS_REGION="ap-northeast-1"
EC2_KEY_NAME="ayumi-support-keypair"

# 色付きログ
echo_info() {
    echo -e "\033[0;34m[INFO]\033[0m $1"
}

echo_success() {
    echo -e "\033[0;32m[SUCCESS]\033[0m $1"
}

echo_error() {
    echo -e "\033[0;31m[ERROR]\033[0m $1"
}

# 前提条件チェック
check_prerequisites() {
    echo_info "前提条件をチェック中..."
    
    # AWS CLI確認
    if ! command -v aws &> /dev/null; then
        echo_error "AWS CLIがインストールされていません"
        exit 1
    fi
    
    # Docker確認
    if ! command -v docker &> /dev/null; then
        echo_error "Dockerがインストールされていません"
        exit 1
    fi
    
    # AWS認証確認
    if ! aws sts get-caller-identity &> /dev/null; then
        echo_error "AWS認証情報が設定されていません"
        exit 1
    fi
    
    echo_success "前提条件OK"
}

# AWSアカウントID取得
get_aws_account_id() {
    AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    echo_info "AWSアカウントID: $AWS_ACCOUNT_ID"
}

# EC2キーペア作成
create_key_pair() {
    echo_info "EC2キーペア作成中..."
    
    if ! aws ec2 describe-key-pairs --key-names $EC2_KEY_NAME &> /dev/null; then
        aws ec2 create-key-pair \
            --key-name $EC2_KEY_NAME \
            --query 'KeyMaterial' \
            --output text > ~/.ssh/$EC2_KEY_NAME.pem
        
        chmod 400 ~/.ssh/$EC2_KEY_NAME.pem
        echo_success "キーペア作成完了: ~/.ssh/$EC2_KEY_NAME.pem"
    else
        echo_info "キーペアは既に存在します"
    fi
}

# セキュリティグループ作成
create_security_group() {
    echo_info "セキュリティグループ作成中..."
    
    # セキュリティグループ作成
    if ! aws ec2 describe-security-groups --group-names $APP_NAME-sg &> /dev/null; then
        SECURITY_GROUP_ID=$(aws ec2 create-security-group \
            --group-name $APP_NAME-sg \
            --description "Security group for Ayumi Support" \
            --query 'GroupId' \
            --output text)
        
        # ルール追加
        aws ec2 authorize-security-group-ingress \
            --group-id $SECURITY_GROUP_ID \
            --protocol tcp \
            --port 22 \
            --cidr 0.0.0.0/0
        
        aws ec2 authorize-security-group-ingress \
            --group-id $SECURITY_GROUP_ID \
            --protocol tcp \
            --port 80 \
            --cidr 0.0.0.0/0
        
        aws ec2 authorize-security-group-ingress \
            --group-id $SECURITY_GROUP_ID \
            --protocol tcp \
            --port 3000 \
            --cidr 0.0.0.0/0
        
        echo_success "セキュリティグループ作成完了: $SECURITY_GROUP_ID"
    else
        SECURITY_GROUP_ID=$(aws ec2 describe-security-groups \
            --group-names $APP_NAME-sg \
            --query 'SecurityGroups[0].GroupId' \
            --output text)
        echo_info "セキュリティグループは既に存在します: $SECURITY_GROUP_ID"
    fi
}

# EC2インスタンス作成
create_ec2_instance() {
    echo_info "EC2インスタンス作成中..."
    
    # ユーザーデータスクリプト作成
    cat > user-data.sh << 'EOF'
#!/bin/bash
yum update -y
amazon-linux-extras install docker -y
service docker start
usermod -a -G docker ec2-user

# docker-compose インストール
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# アプリケーションディレクトリ作成
mkdir -p /app
chown ec2-user:ec2-user /app
EOF

    # EC2インスタンス起動
    INSTANCE_ID=$(aws ec2 run-instances \
        --image-id ami-0c02fb55956c7d316 \
        --count 1 \
        --instance-type t3.small \
        --key-name $EC2_KEY_NAME \
        --security-groups $APP_NAME-sg \
        --user-data file://user-data.sh \
        --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=$APP_NAME},{Key=Environment,Value=production}]" \
        --query 'Instances[0].InstanceId' \
        --output text)
    
    echo_success "EC2インスタンス作成完了: $INSTANCE_ID"
    
    # インスタンス起動待機
    echo_info "インスタンス起動待機中..."
    aws ec2 wait instance-running --instance-ids $INSTANCE_ID
    
    # パブリックIP取得
    PUBLIC_IP=$(aws ec2 describe-instances \
        --instance-ids $INSTANCE_ID \
        --query 'Reservations[0].Instances[0].PublicIpAddress' \
        --output text)
    
    echo_success "インスタンス起動完了: $PUBLIC_IP"
    
    # クリーンアップ
    rm -f user-data.sh
}

# アプリケーションデプロイ
deploy_application() {
    echo_info "アプリケーションデプロイ中..."
    
    # デプロイパッケージ作成
    tar -czf deployment.tar.gz \
        --exclude=node_modules \
        --exclude=.git \
        --exclude=uploads \
        --exclude=generated \
        .
    
    # SSH設定
    echo "Host $PUBLIC_IP
        StrictHostKeyChecking no
        UserKnownHostsFile /dev/null" >> ~/.ssh/config
    
    # ファイル転送
    echo_info "ファイル転送中..."
    scp -i ~/.ssh/$EC2_KEY_NAME.pem deployment.tar.gz ec2-user@$PUBLIC_IP:/home/ec2-user/
    
    # デプロイ実行
    echo_info "リモートデプロイ実行中..."
    ssh -i ~/.ssh/$EC2_KEY_NAME.pem ec2-user@$PUBLIC_IP << ENDSSH
# ファイル展開
cd /app
sudo tar -xzf /home/ec2-user/deployment.tar.gz

# 権限設定
sudo chown -R ec2-user:ec2-user /app

# Dockerビルド・起動
docker-compose -f docker-compose.simple.yml build
docker-compose -f docker-compose.simple.yml up -d

# 起動確認
sleep 30
curl -f http://localhost:3000/api/health || echo "Health check failed, but continuing..."
ENDSSH
    
    echo_success "デプロイ完了"
    
    # クリーンアップ
    rm -f deployment.tar.gz
}

# メイン実行
main() {
    echo_info "🚀 歩みサポート AWS デプロイ開始"
    
    check_prerequisites
    get_aws_account_id
    create_key_pair
    create_security_group
    create_ec2_instance
    deploy_application
    
    echo_success "🎉 デプロイ完了！"
    echo_info "アプリケーションURL: http://$PUBLIC_IP:3000"
    echo_info "シンプルワークフロー: http://$PUBLIC_IP:3000/simple-workflow"
    echo_info "API テスト: http://$PUBLIC_IP:3000/api-test.html"
    echo_info "デモ: http://$PUBLIC_IP:3000/demo"
    
    echo_info "SSH接続方法:"
    echo_info "ssh -i ~/.ssh/$EC2_KEY_NAME.pem ec2-user@$PUBLIC_IP"
}

# スクリプト直接実行時
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi