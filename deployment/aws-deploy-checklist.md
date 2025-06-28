# AWS展開チェックリスト - support-docs

## 事前準備 ✅

### 1. AWSアカウント確認
- [ ] AWSアカウントへのアクセス確認
- [ ] IAMユーザー権限確認 (EC2, RDS, S3フルアクセス)
- [ ] 請求アラート設定

### 2. AWS CLI設定 (オプション)
```bash
# AWS CLI v2 インストール
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# 認証情報設定
aws configure
# Access Key ID: [IAMアクセスキー]
# Secret Access Key: [IAMシークレットキー]  
# Default region: ap-northeast-1
# Default output format: json
```

## インフラ構築手順 🏗️

### Phase 1: ネットワーク・セキュリティ設定

#### 1. VPC・サブネット確認
```bash
# デフォルトVPCを使用、または新規作成
# プライベートサブネット: RDS用
# パブリックサブネット: EC2用
```

#### 2. セキュリティグループ作成
**EC2セキュリティグループ (support-docs-ec2-sg)**
```
インバウンドルール:
- HTTP (80): 0.0.0.0/0
- HTTPS (443): 0.0.0.0/0  
- SSH (22): 自分のIPアドレス
- Custom (5000): 0.0.0.0/0 (開発時のみ)

アウトバウンドルール:
- All Traffic: 0.0.0.0/0
```

**RDSセキュリティグループ (support-docs-rds-sg)**
```
インバウンドルール:
- PostgreSQL (5432): EC2セキュリティグループID

アウトバウンドルール:
- なし (デフォルト削除)
```

### Phase 2: データベース設定

#### 3. RDS PostgreSQL作成
```
基本設定:
- エンジン: PostgreSQL 15.4
- テンプレート: 本番稼働用 (または開発/テスト用)
- DBインスタンス識別子: support-docs-db
- マスターユーザー名: postgres
- マスターパスワード: [強力なパスワード]

インスタンス設定:
- DBインスタンスクラス: db.t3.micro (開発) / db.t3.small (本番)
- ストレージタイプ: gp2 (汎用SSD)
- 割り当てストレージ: 20 GB
- ストレージ暗号化: 有効

接続:
- VPC: デフォルトVPC
- サブネットグループ: デフォルト
- セキュリティグループ: support-docs-rds-sg
- アベイラビリティーゾーン: 指定なし
- ポート: 5432

追加設定:
- 初期データベース名: support_docs
- 自動バックアップ: 有効 (7日間保持)
- メンテナンスウィンドウ: 日曜 03:00-04:00 JST
- 削除保護: 有効
```

#### 4. データベース接続確認
```bash
# EC2から接続テスト
psql -h [RDSエンドポイント] -U postgres -d support_docs
```

### Phase 3: ストレージ設定

#### 5. S3バケット作成
```
バケット名: support-docs-files-prod-[ランダム文字列]
リージョン: アジアパシフィック (東京) ap-northeast-1

設定:
- パブリックアクセス: すべてブロック
- バケットのバージョニング: 有効
- サーバー側の暗号化: Amazon S3 マネージドキー (SSE-S3)
- オブジェクトロック: 無効

ライフサイクルルール:
- 古いファイル自動削除: 90日後
- 不完全なマルチパートアップロード削除: 7日後
```

#### 6. IAMロール作成 (EC2用)
```json
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
      "Resource": "arn:aws:s3:::support-docs-files-prod-*/*"
    },
    {
      "Effect": "Allow", 
      "Action": [
        "s3:ListBucket"
      ],
      "Resource": "arn:aws:s3:::support-docs-files-prod-*"
    }
  ]
}
```

### Phase 4: コンピューティング設定

#### 7. EC2インスタンス作成
```
AMI: Ubuntu Server 22.04 LTS
インスタンスタイプ: t3.medium (本番) / t3.small (開発)
キーペア: 新規作成または既存使用
セキュリティグループ: support-docs-ec2-sg
IAMロール: 上記作成したS3アクセスロール

ストレージ:
- ルートボリューム: 20GB gp3
- 暗号化: 有効

タグ:
- Name: support-docs-server
- Environment: production
- Project: support-docs
```

#### 8. Elastic IP割り当て
```bash
# 固定IPアドレス取得・割り当て
# ドメイン設定でAレコード作成
```

## アプリケーションデプロイ 🚀

### Phase 5: サーバー初期設定

#### 9. EC2初期セットアップ
```bash
# SSH接続
ssh -i "your-key.pem" ubuntu@[EC2-IP]

# システム更新
sudo apt update && sudo apt upgrade -y

# Node.js 18インストール
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# PM2インストール
sudo npm install -g pm2

# 必要パッケージインストール (Puppeteer用)
sudo apt-get install -y \
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
  git

# PostgreSQLクライアント
sudo apt-get install -y postgresql-client
```

#### 10. アプリケーション配置
```bash
# アプリケーションディレクトリ作成
sudo mkdir -p /opt/support-docs
sudo chown ubuntu:ubuntu /opt/support-docs
cd /opt/support-docs

# Gitクローン (またはファイル転送)
# プロジェクトファイルを配置

# 依存関係インストール
npm install --production

# 環境変数設定
cp .env.example .env
nano .env  # 本番用設定に編集
```

#### 11. 本番環境変数設定
```bash
# .env ファイル内容
NODE_ENV=production
PORT=5000
CLIENT_URL=https://[あなたのドメイン]

# データベース (RDSエンドポイント)
DB_HOST=[RDSエンドポイント]
DB_PORT=5432
DB_NAME=support_docs
DB_USER=postgres
DB_PASSWORD=[RDSパスワード]

# API keys (本番用キー)
OPENAI_API_KEY=[本番用OpenAI API Key]
ANTHROPIC_API_KEY=[本番用Anthropic API Key]

# AWS S3
AWS_REGION=ap-northeast-1
AWS_S3_BUCKET=[S3バケット名]

# セキュリティ
JWT_SECRET=[ランダム64文字文字列]
CORS_ORIGIN=https://[あなたのドメイン]

# Puppeteer
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
```

### Phase 6: サービス起動・設定

#### 12. アプリケーション起動
```bash
# PM2でサービス起動
pm2 start server/index.js --name "support-docs"
pm2 startup  # システム起動時の自動起動設定
pm2 save     # 現在の設定保存
```

#### 13. Nginx設定
```bash
# Nginx設定ファイル作成
sudo nano /etc/nginx/sites-available/support-docs

# 設定内容:
server {
    listen 80;
    server_name [あなたのドメイン];

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        client_max_body_size 100M;
    }
}

# サイト有効化
sudo ln -s /etc/nginx/sites-available/support-docs /etc/nginx/sites-enabled/
sudo nginx -t  # 設定テスト
sudo systemctl reload nginx
```

#### 14. SSL証明書 (Let's Encrypt)
```bash
# Certbot インストール
sudo apt install certbot python3-certbot-nginx

# SSL証明書取得・設定
sudo certbot --nginx -d [あなたのドメイン]

# 自動更新設定確認
sudo certbot renew --dry-run
```

## 動作確認・監視 📊

### Phase 7: テスト・監視

#### 15. 動作確認
```bash
# アプリケーション動作確認
curl http://localhost:5000/
curl https://[あなたのドメイン]/

# データベース接続確認
psql -h [RDS] -U postgres -d support_docs -c "SELECT version();"

# PM2ステータス確認
pm2 status
pm2 logs support-docs
```

#### 16. CloudWatch設定 (オプション)
```bash
# CloudWatch エージェントインストール
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
sudo dpkg -i amazon-cloudwatch-agent.deb

# ログ監視設定
# アプリケーションログ → CloudWatch Logs
```

## セキュリティ・保守 🔒

#### 17. セキュリティ設定
```bash
# ファイアウォール設定
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'

# 自動セキュリティ更新
sudo apt install unattended-upgrades
sudo dpkg-reconfigure unattended-upgrades
```

#### 18. バックアップ設定
- [ ] RDS自動バックアップ: 有効 (7日間保持)
- [ ] S3バケット: バージョニング有効
- [ ] EC2: AMIスナップショット (週1回)

## コスト最適化 💰

#### 19. リソース監視
- [ ] CloudWatchでコスト監視
- [ ] 請求アラート設定
- [ ] 未使用リソースの定期確認

#### 20. 運用手順書作成
- [ ] デプロイ手順書
- [ ] 障害対応マニュアル
- [ ] バックアップ・復旧手順
- [ ] スケーリング計画

---

## 予想コスト (月額・東京リージョン)

| サービス | スペック | 月額コスト |
|---------|---------|----------|
| EC2 t3.medium | vCPU:2, メモリ:4GB | $35-40 |
| RDS t3.small | PostgreSQL | $25-30 |
| S3 | 100GB + 転送 | $3-5 |
| Elastic IP | 固定IP | $3.6 |
| データ転送 | 100GB/月 | $5-10 |
| **合計** | | **$71.6-88.6** |

## 緊急連絡先・参考情報

- AWS サポート: [AWSコンソール]
- 監視ダッシュボード: [CloudWatch URL]
- ドキュメント: `/deployment/aws-setup.md`
- 設定ファイル: `/mnt/c/support-docs/.env.example`