# SupportDocs AWS Production Deployment Guide

## 🎯 概要

この手順書では、SupportDocsアプリケーションをAWS本番環境にデプロイする方法を説明します。

## 📋 前提条件

### 必要なツール
- [AWS CLI v2](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)
- [Docker](https://docs.docker.com/get-docker/)
- [docker-compose](https://docs.docker.com/compose/install/)
- SSH クライアント

### AWSアカウント要件
- 管理者権限を持つIAMユーザー
- 月額予算: $100-200（小規模運用）
- サポートプラン: Developer以上推奨

## 🚀 デプロイ手順

### Step 1: 環境設定

1. **リポジトリをクローン**
   ```bash
   git clone <your-repository-url>
   cd support-docs
   ```

2. **環境変数ファイルを作成**
   ```bash
   cp .env.production.template .env.production
   ```

3. **.env.production を編集**
   ```bash
   # 必須項目を設定
   DOMAIN=your-domain.com
   OPENAI_API_KEY=sk-your-openai-key
   ANTHROPIC_API_KEY=sk-ant-your-anthropic-key
   DB_PASSWORD=your-secure-password
   JWT_SECRET=your-jwt-secret-32-chars-min
   ```

### Step 2: AWS認証設定

```bash
# AWS CLIを設定
aws configure

# 入力項目:
# AWS Access Key ID: AKIA...
# AWS Secret Access Key: ...
# Default region name: ap-northeast-1
# Default output format: json
```

### Step 3: SSL証明書準備

#### Option A: Let's Encrypt (推奨)
```bash
# Certbotをインストール
sudo apt-get install certbot

# 証明書を取得
sudo certbot certonly --standalone -d your-domain.com

# 証明書をコピー
mkdir -p ssl
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ssl/cert.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem ssl/key.pem
```

#### Option B: AWS Certificate Manager
```bash
# ACMで証明書をリクエスト
aws acm request-certificate \
    --domain-name your-domain.com \
    --subject-alternative-names www.your-domain.com \
    --validation-method DNS
```

### Step 4: 自動デプロイ実行

```bash
# デプロイスクリプトに実行権限を付与
chmod +x aws-deploy.sh

# デプロイを実行
./aws-deploy.sh
```

### Step 5: 手動デプロイ（詳細制御が必要な場合）

#### 5.1 ECRリポジトリ作成
```bash
aws ecr create-repository \
    --repository-name support-docs-production \
    --region ap-northeast-1
```

#### 5.2 Dockerイメージビルド・プッシュ
```bash
# ECRにログイン
aws ecr get-login-password --region ap-northeast-1 | \
docker login --username AWS --password-stdin YOUR_ACCOUNT_ID.dkr.ecr.ap-northeast-1.amazonaws.com

# イメージをビルド
docker build -t support-docs-production .

# タグ付け
docker tag support-docs-production:latest \
YOUR_ACCOUNT_ID.dkr.ecr.ap-northeast-1.amazonaws.com/support-docs-production:latest

# プッシュ
docker push YOUR_ACCOUNT_ID.dkr.ecr.ap-northeast-1.amazonaws.com/support-docs-production:latest
```

#### 5.3 RDSデータベース作成
```bash
aws rds create-db-instance \
    --db-instance-identifier support-docs-postgres \
    --db-instance-class db.t3.micro \
    --engine postgres \
    --engine-version 15.4 \
    --master-username supportdocs \
    --master-user-password "your-secure-password" \
    --allocated-storage 20 \
    --storage-encrypted \
    --backup-retention-period 7
```

#### 5.4 S3バケット作成
```bash
# ファイルストレージ用バケット
aws s3 mb s3://support-docs-files-prod-YOUR_ACCOUNT_ID --region ap-northeast-1

# バックアップ用バケット
aws s3 mb s3://support-docs-backups-prod-YOUR_ACCOUNT_ID --region ap-northeast-1

# 暗号化設定
aws s3api put-bucket-encryption \
    --bucket support-docs-files-prod-YOUR_ACCOUNT_ID \
    --server-side-encryption-configuration '{
        "Rules": [
            {
                "ApplyServerSideEncryptionByDefault": {
                    "SSEAlgorithm": "AES256"
                }
            }
        ]
    }'
```

#### 5.5 EC2インスタンス起動
```bash
# キーペア作成
aws ec2 create-key-pair \
    --key-name support-docs-keypair \
    --query 'KeyMaterial' \
    --output text > ~/.ssh/support-docs-keypair.pem

chmod 400 ~/.ssh/support-docs-keypair.pem

# セキュリティグループ作成
aws ec2 create-security-group \
    --group-name support-docs-sg \
    --description "Security group for SupportDocs"

# ルール追加
aws ec2 authorize-security-group-ingress \
    --group-name support-docs-sg \
    --protocol tcp \
    --port 22 \
    --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
    --group-name support-docs-sg \
    --protocol tcp \
    --port 80 \
    --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
    --group-name support-docs-sg \
    --protocol tcp \
    --port 443 \
    --cidr 0.0.0.0/0
```

### Step 6: アプリケーションデプロイ

```bash
# EC2インスタンスにSSH接続
ssh -i ~/.ssh/support-docs-keypair.pem ec2-user@YOUR_EC2_IP

# Docker & docker-composeインストール
sudo yum update -y
sudo amazon-linux-extras install docker -y
sudo service docker start
sudo usermod -a -G docker ec2-user

# docker-composeインストール
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# アプリケーションファイル配置
mkdir -p /app
cd /app

# 設定ファイルをアップロード（別ターミナル）
scp -i ~/.ssh/support-docs-keypair.pem docker-compose.production.yml ec2-user@YOUR_EC2_IP:/app/
scp -i ~/.ssh/support-docs-keypair.pem .env.production ec2-user@YOUR_EC2_IP:/app/

# ECRからイメージプル（EC2上で実行）
aws ecr get-login-password --region ap-northeast-1 | docker login --username AWS --password-stdin YOUR_ACCOUNT_ID.dkr.ecr.ap-northeast-1.amazonaws.com

# アプリケーション起動
docker-compose -f docker-compose.production.yml up -d
```

## 🔍 デプロイ後の確認

### ヘルスチェック
```bash
curl -f http://YOUR_EC2_IP/api/health
curl -f https://your-domain.com/api/health
```

### ログ確認
```bash
# アプリケーションログ
docker-compose -f docker-compose.production.yml logs app

# Nginxログ
docker-compose -f docker-compose.production.yml logs nginx
```

### 動作確認
1. **ランディングページ**: https://your-domain.com
2. **デモページ**: https://your-domain.com/demo
3. **管理画面**: https://your-domain.com/api-test.html

## 📊 監視・メンテナンス

### CloudWatch設定
```bash
# CloudWatchエージェント設定
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
    -a fetch-config \
    -m ec2 \
    -c file:/app/aws/cloudwatch-config.json \
    -s
```

### バックアップ設定
```bash
# 日次バックアップcron設定
echo "0 2 * * * /app/scripts/backup.sh" | crontab -
```

### 自動スケーリング設定
```bash
# Auto Scaling Groupの作成
aws autoscaling create-auto-scaling-group \
    --auto-scaling-group-name support-docs-asg \
    --launch-template LaunchTemplateName=support-docs-template \
    --min-size 1 \
    --max-size 3 \
    --desired-capacity 1
```

## 💰 コスト最適化

### リソース料金見積もり（月額）
- **EC2 t3.small**: $15-20
- **RDS db.t3.micro**: $15-20  
- **S3ストレージ**: $5-10
- **CloudWatch**: $5-10
- **データ転送**: $10-20
- **合計**: $50-80/月

### コスト削減のコツ
1. **リザーブドインスタンス**で30-60%節約
2. **Spot Instance**で開発環境のコストを削減
3. **S3 Intelligent-Tiering**で古いファイルのコストを削減
4. **CloudWatch Logs retention**を適切に設定

## 🔒 セキュリティ設定

### WAF設定
```bash
# Web ACL作成
aws wafv2 create-web-acl \
    --name support-docs-waf \
    --description "WAF for SupportDocs"
```

### VPC設定
```bash
# プライベートサブネット作成
aws ec2 create-subnet \
    --vpc-id vpc-12345678 \
    --cidr-block 10.0.1.0/24 \
    --availability-zone ap-northeast-1a
```

## 🚨 トラブルシューティング

### よくある問題と解決方法

1. **Docker build失敗**
   ```bash
   # キャッシュをクリア
   docker system prune -a
   ```

2. **RDS接続エラー**
   ```bash
   # セキュリティグループを確認
   aws ec2 describe-security-groups --group-names support-docs-sg
   ```

3. **SSL証明書エラー**
   ```bash
   # 証明書の有効期限を確認
   openssl x509 -in ssl/cert.pem -text -noout
   ```

## 📞 サポート

- **緊急時**: CloudWatch Alarms で自動通知
- **一般サポート**: GitHub Issues
- **商用サポート**: enterprise@support-docs.com

---

## 🎉 デプロイ完了！

デプロイが成功すると、以下のURLでアクセス可能になります：

- **顧客向けサイト**: https://your-domain.com
- **デモサイト**: https://your-domain.com/demo  
- **管理画面**: https://your-domain.com/api-test.html

月間数千面談を処理し、数百万円の人件費削減を実現する準備が整いました！