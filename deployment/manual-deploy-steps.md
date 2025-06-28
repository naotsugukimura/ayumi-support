# 手動AWS展開手順 - support-docs

WSL環境でのファイル権限制限により、手動でAWS展開を行います。

## 🚀 Phase 1: AWS Management Console でのインフラ構築

### 1. AWSアカウントログイン
- [AWS Management Console](https://console.aws.amazon.com/)にログイン
- リージョンを **アジアパシフィック (東京) ap-northeast-1** に設定

### 2. セキュリティグループ作成

#### 2-1. EC2セキュリティグループ
1. **EC2 > セキュリティグループ > セキュリティグループを作成**
2. 基本的な詳細:
   - セキュリティグループ名: `support-docs-ec2-sg`
   - 説明: `Security group for support-docs EC2 instance`
   - VPC: デフォルトVPC選択

3. インバウンドルール追加:
   ```
   タイプ     プロトコル  ポート範囲  送信元
   SSH        TCP        22         0.0.0.0/0
   HTTP       TCP        80         0.0.0.0/0  
   HTTPS      TCP        443        0.0.0.0/0
   カスタムTCP  TCP        5000       0.0.0.0/0 (開発時のみ)
   ```

#### 2-2. RDSセキュリティグループ  
1. **セキュリティグループを作成**
2. 基本的な詳細:
   - セキュリティグループ名: `support-docs-rds-sg`
   - 説明: `Security group for support-docs RDS instance`
   - VPC: デフォルトVPC選択

3. インバウンドルール追加:
   ```
   タイプ          プロトコル  ポート範囲  送信元
   PostgreSQL      TCP        5432       support-docs-ec2-sg (セキュリティグループID)
   ```

### 3. S3バケット作成

1. **S3 > バケット > バケットを作成**
2. 設定:
   - バケット名: `support-docs-files-prod-[現在時刻]`
   - リージョン: アジアパシフィック (東京)
   - パブリックアクセスをすべてブロック: ✅ チェック
   - バケットのバージョニング: 有効
   - デフォルト暗号化: Amazon S3 マネージドキー (SSE-S3)

### 4. IAMロール作成

1. **IAM > ロール > ロールを作成**
2. 信頼されたエンティティを選択:
   - AWS サービス > EC2 選択

3. 権限ポリシー:
   - 「ポリシーを作成」をクリック
   - JSON タブで以下を入力:

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

4. ロール作成完了:
   - ロール名: `support-docs-ec2-role`

### 5. RDS PostgreSQL作成

1. **RDS > データベース > データベースの作成**
2. 設定:

#### エンジンオプション:
- エンジンタイプ: PostgreSQL
- バージョン: PostgreSQL 15.4-R1

#### テンプレート:
- 本番稼働用 (または開発/テスト)

#### 設定:
- DBインスタンス識別子: `support-docs-db`
- マスターユーザー名: `postgres`  
- マスターパスワード: 強力なパスワードを生成・記録

#### インスタンス設定:
- DBインスタンスクラス: db.t3.micro (開発) / db.t3.small (本番)

#### ストレージ:
- ストレージタイプ: 汎用SSD (gp2)
- 割り当てストレージ: 20 GB
- ストレージ暗号化: 有効

#### 接続:
- VPC: デフォルトVPC
- セキュリティグループ: `support-docs-rds-sg`
- ポート: 5432
- パブリックアクセス: いいえ

#### 追加設定:
- 初期データベース名: `support_docs`
- 自動バックアップ: 有効 (7日間保持)
- 削除保護: 有効

### 6. EC2キーペア作成

1. **EC2 > キーペア > キーペアを作成**
2. 設定:
   - 名前: `support-docs-key`
   - キーペアタイプ: RSA
   - プライベートキーファイル形式: .pem

3. **キーファイルをダウンロード・保存**

### 7. EC2インスタンス作成

1. **EC2 > インスタンス > インスタンスを起動**
2. 設定:

#### AMI選択:
- Ubuntu Server 22.04 LTS (HVM)

#### インスタンスタイプ:
- t3.medium (本番) / t3.small (開発)

#### キーペア:
- `support-docs-key` 選択

#### ネットワーク設定:
- セキュリティグループ: `support-docs-ec2-sg`

#### ストレージ設定:
- 8 GB → 20 GB に変更
- 暗号化: 有効

#### 高度な詳細:
- IAMインスタンスプロファイル: `support-docs-ec2-role`

#### ユーザーデータ (高度な詳細 > ユーザーデータ):
```bash
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
echo "EC2 setup completed at $(date)" > /home/ubuntu/setup-complete.txt
```

3. **インスタンスを起動**

### 8. Elastic IP割り当て

1. **EC2 > Elastic IP > Elastic IP アドレスを割り当て**
2. 設定:
   - ネットワークボーダーグループ: ap-northeast-1
   - パブリック IPv4 アドレスプール: Amazon のプール

3. **Elastic IP を作成したEC2インスタンスに関連付け**

---

## 🔧 Phase 2: アプリケーションデプロイ

### 9. EC2接続準備

1. **EC2インスタンスのパブリックIPアドレスを確認**
2. **キーペアファイル権限設定** (Linuxの場合):
   ```bash
   chmod 400 support-docs-key.pem
   ```

### 10. SSH接続

```bash
ssh -i support-docs-key.pem ubuntu@[EC2のパブリックIP]
```

### 11. アプリケーション配置

```bash
# アプリケーションディレクトリに移動
cd /opt/support-docs

# プロジェクトファイル取得
# Option A: Git クローン (推奨)
git clone [あなたのGitリポジトリURL] .

# Option B: ファイル転送 (SCPの場合)
# ローカルから: scp -i support-docs-key.pem -r /path/to/support-docs/* ubuntu@[EC2-IP]:/opt/support-docs/

# 依存関係インストール
npm install --production

# クライアントビルド (存在する場合)
if [ -d "client" ]; then
  cd client
  npm install
  npm run build
  cd ..
fi
```

### 12. 環境変数設定

```bash
# 環境変数ファイル作成
cp .env.example .env
nano .env
```

**本番用 .env ファイル内容:**
```bash
NODE_ENV=production
PORT=5000
CLIENT_URL=https://[あなたのドメイン]

# データベース設定 (RDSエンドポイントを記入)
DB_HOST=[RDSエンドポイント例: support-docs-db.xxxxx.ap-northeast-1.rds.amazonaws.com]
DB_PORT=5432
DB_NAME=support_docs
DB_USER=postgres
DB_PASSWORD=[RDS作成時に設定したパスワード]

# AWS設定
AWS_REGION=ap-northeast-1
AWS_S3_BUCKET=[作成したS3バケット名]

# API設定 (実際のキーに置き換え)
OPENAI_API_KEY=[本番用OpenAI APIキー]
ANTHROPIC_API_KEY=[本番用Anthropic APIキー]

# セキュリティ設定
JWT_SECRET=[ランダム64文字文字列]
CORS_ORIGIN=https://[あなたのドメイン]

# Puppeteer設定
PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome

# ファイル設定
MAX_FILE_SIZE=100
UPLOAD_CLEANUP_HOURS=24
AUTO_DELETE_ENABLED=true
```

### 13. データベース接続確認

```bash
# PostgreSQLクライアントでRDS接続テスト
psql -h [RDSエンドポイント] -U postgres -d support_docs -c "SELECT version();"
```

### 14. アプリケーション起動

```bash
# PM2でサービス起動
pm2 start server/index.js --name "support-docs"

# システム起動時の自動起動設定
pm2 startup
pm2 save

# ステータス確認
pm2 status
pm2 logs support-docs
```

### 15. アプリケーション動作確認

```bash
# ローカル接続テスト
curl http://localhost:5000/

# レスポンス例:
# {"message":"🎉 サポートドック サーバー起動中！","status":"OK",...}
```

---

## 🌐 Phase 3: Webサーバー設定

### 16. Nginx設定

```bash
# Nginx設定ファイル作成
sudo nano /etc/nginx/sites-available/support-docs
```

**Nginx設定内容:**
```nginx
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
        
        # アップロードサイズ制限
        client_max_body_size 100M;
    }
}
```

**サイト有効化:**
```bash
# シンボリックリンク作成
sudo ln -s /etc/nginx/sites-available/support-docs /etc/nginx/sites-enabled/

# 設定テスト
sudo nginx -t

# Nginx再起動
sudo systemctl reload nginx
```

### 17. ドメイン設定

1. **ドメイン取得** (Route53 または外部プロバイダ)
2. **DNS Aレコード設定**:
   - ホスト名: @ (または www)
   - タイプ: A
   - 値: [EC2のElastic IP]

### 18. SSL証明書取得 (Let's Encrypt)

```bash
# Certbot インストール
sudo apt install certbot python3-certbot-nginx

# SSL証明書取得・設定
sudo certbot --nginx -d [あなたのドメイン]

# 自動更新設定確認
sudo certbot renew --dry-run
```

---

## 🔒 Phase 4: セキュリティ・保守設定

### 19. ファイアウォール設定

```bash
# UFW有効化
sudo ufw enable

# 必要なポートのみ開放
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'

# ステータス確認
sudo ufw status
```

### 20. 自動セキュリティ更新

```bash
# 無人アップグレード設定
sudo apt install unattended-upgrades
sudo dpkg-reconfigure unattended-upgrades
```

### 21. CloudWatch設定 (オプション)

1. **CloudWatch エージェントインストール**:
```bash
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
sudo dpkg -i amazon-cloudwatch-agent.deb
```

2. **ログ監視設定**
3. **メトリクス監視設定**

---

## 🎯 Phase 5: 動作確認・最終設定

### 22. 総合動作テスト

```bash
# アプリケーション正常性確認
curl https://[あなたのドメイン]/

# データベース接続確認
psql -h [RDSエンドポイント] -U postgres -d support_docs -c "SELECT 1;"

# S3アクセス確認 (EC2から)
aws s3 ls s3://[バケット名]/ --region ap-northeast-1

# PM2プロセス確認
pm2 status
pm2 logs support-docs --lines 50
```

### 23. バックアップ設定確認

- [ ] RDS自動バックアップ: 有効 (7日間保持)
- [ ] S3バケット: バージョニング有効
- [ ] EC2: AMIスナップショット設定 (週1回)

### 24. 監視・アラート設定

- [ ] CloudWatch ダッシュボード作成
- [ ] 請求アラート設定
- [ ] システムメトリクス監視
- [ ] ログエラー監視

---

## 📊 展開完了チェックリスト

### インフラ ✅
- [ ] EC2インスタンス: 起動・SSH接続可能
- [ ] RDS PostgreSQL: 接続可能・データベース作成済み
- [ ] S3バケット: 作成・権限設定済み
- [ ] Elastic IP: 割り当て済み
- [ ] セキュリティグループ: 適切に設定

### アプリケーション ✅
- [ ] Node.js アプリケーション: 起動済み
- [ ] 環境変数: 本番用設定済み
- [ ] PM2: 自動起動設定済み
- [ ] ファイルアップロード: 正常動作
- [ ] 音声認識: 正常動作
- [ ] PDF生成: 正常動作

### Web・セキュリティ ✅
- [ ] Nginx: 設定・起動済み
- [ ] ドメイン: DNS設定済み
- [ ] SSL証明書: 取得・設定済み
- [ ] ファイアウォール: 設定済み
- [ ] 自動更新: 設定済み

### 監視・保守 ✅  
- [ ] バックアップ: 設定済み
- [ ] ログ監視: 設定済み
- [ ] 請求アラート: 設定済み
- [ ] 運用手順書: 作成済み

---

## 💰 コスト試算 (月額・東京リージョン)

| サービス | スペック | 月額費用 |
|---------|---------|----------|
| EC2 t3.medium | 2vCPU, 4GB RAM | $35-40 |
| RDS db.t3.small | PostgreSQL | $25-30 |
| S3 | 100GB + 転送 | $3-5 |
| Elastic IP | 固定IP | $3.6 |
| データ転送 | ~100GB/月 | $5-10 |
| **合計** | | **$71.6-88.6** |

## 🚨 緊急時連絡先

- **AWS サポート**: [AWSコンソール] → サポート
- **技術情報**: `/deployment/aws-setup.md`
- **設定ファイル**: `/opt/support-docs/.env`
- **ログ確認**: `pm2 logs support-docs`
- **サービス再起動**: `pm2 restart support-docs`

---

**🎉 展開完了！support-docsアプリケーションがAWSで稼働中です。**