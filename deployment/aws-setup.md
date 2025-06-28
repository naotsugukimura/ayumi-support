# AWS デプロイメント設定ガイド

## 必要なAWSサービス

### 1. EC2インスタンス
- **推奨スペック**: t3.medium以上 (メモリ4GB+)
- **OS**: Amazon Linux 2023またはUbuntu 22.04 LTS
- **ストレージ**: 20GB以上の汎用SSD

### 2. RDS (PostgreSQL)
- **エンジン**: PostgreSQL 15以上
- **インスタンスクラス**: db.t3.micro (テスト用) / db.t3.small (本番用)
- **ストレージ**: 20GB汎用SSD
- **バックアップ保持期間**: 7日間

### 3. S3バケット
- **目的**: 音声ファイルとPDFファイルの永続化保存
- **バケット名**: `support-docs-files-[環境名]`
- **暗号化**: AES-256有効化

### 4. IAM設定
- **EC2ロール**: S3アクセス権限付与
- **RDSセキュリティグループ**: EC2からのアクセスのみ許可

## デプロイ手順

### 1. EC2セットアップ
```bash
# Node.js 18以上のインストール
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# PM2のインストール
sudo npm install -g pm2

# 必要なシステムパッケージ
sudo apt-get update
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
  nginx
```

### 2. アプリケーションデプロイ
```bash
# プロジェクトファイルの転送
git clone [リポジトリURL]
cd support-docs

# 依存関係インストール
npm install
cd client && npm install && npm run build && cd ..

# 環境変数設定
cp .env.example .env
# .envファイルを本番用に編集

# PM2でサービス起動
pm2 start server/index.js --name "support-docs"
pm2 startup
pm2 save
```

### 3. Nginx設定
```nginx
server {
    listen 80;
    server_name yourdomain.com;

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
        
        # アップロードサイズ制限
        client_max_body_size 100M;
    }
}
```

### 4. SSL証明書 (Let's Encrypt)
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

## 環境変数設定

本番環境用の`.env`ファイル:

```bash
# サーバー設定
NODE_ENV=production
PORT=5000
CLIENT_URL=https://yourdomain.com

# セキュリティ設定
JWT_SECRET=[強力なランダム文字列]
CORS_ORIGIN=https://yourdomain.com

# データベース設定
DB_HOST=[RDSエンドポイント]
DB_PORT=5432
DB_NAME=support_docs
DB_USER=[DBユーザー名]
DB_PASSWORD=[強力なパスワード]

# API設定
OPENAI_API_KEY=[本番用APIキー]
ANTHROPIC_API_KEY=[本番用APIキー]

# AWS設定
AWS_ACCESS_KEY_ID=[IAMアクセスキー]
AWS_SECRET_ACCESS_KEY=[IAMシークレットキー]
AWS_REGION=ap-northeast-1
AWS_S3_BUCKET=support-docs-files-prod

# ファイル設定
MAX_FILE_SIZE=100
UPLOAD_CLEANUP_HOURS=24
AUTO_DELETE_ENABLED=true

# Puppeteer設定
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
```

## セキュリティ設定

### 1. ファイアウォール
```bash
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
```

### 2. SSL設定
- TLS 1.2以上の使用
- HSTS ヘッダーの設定
- セキュアクッキーの使用

### 3. 定期バックアップ
```bash
# RDSの自動バックアップ有効化
# S3バケットのバージョニング有効化
# CloudWatchでのログ監視設定
```

## 監視・ログ設定

### 1. CloudWatch
- アプリケーションログの送信
- システムメトリクス監視
- アラーム設定

### 2. ヘルスチェック
```bash
# /health エンドポイントの実装
# Load Balancerでのヘルスチェック設定
```

## コスト見積もり (月額・東京リージョン)

- **EC2 t3.medium**: $30-40
- **RDS db.t3.small**: $25-35  
- **S3ストレージ (100GB)**: $2-3
- **データ転送**: $5-10
- **その他 (CloudWatch等)**: $5-10

**合計**: 約 $67-98/月

## 注意事項

1. **APIキーの管理**: 環境変数で管理し、コードにハードコードしない
2. **アップロードファイル**: 定期クリーンアップ設定
3. **バックアップ**: 定期的なRDSとS3バックアップ
4. **モニタリング**: CloudWatchでのリソース監視
5. **セキュリティ更新**: 定期的なOS・パッケージ更新