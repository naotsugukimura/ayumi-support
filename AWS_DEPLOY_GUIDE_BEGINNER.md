# 🚀 AWS デプロイ完全ガイド（初心者向け）

**歩みサポートシステムをAWSにデプロイする手順**

## 📋 **事前準備チェックリスト**

- ✅ AWS アカウント作成済み
- ✅ Docker インストール済み
- ⬜ AWS CLI インストール（これから行います）
- ⬜ 新しいAPIキー取得（これから行います）

---

## 🔧 **Step 1: AWS CLI セットアップ**

### **1-1. AWS CLI インストール**
```bash
# Windows (PowerShell管理者権限で実行)
winget install Amazon.AWSCLI

# または公式インストーラーをダウンロード
# https://aws.amazon.com/cli/
```

### **1-2. AWS認証情報設定**
```bash
# AWS CLI設定開始
aws configure

# 以下を順番に入力:
AWS Access Key ID: [AWSコンソールで作成したアクセスキー]
AWS Secret Access Key: [AWSコンソールで作成したシークレットキー]
Default region name: ap-northeast-1
Default output format: json
```

**⚠️ アクセスキーがない場合:**
1. AWS コンソール → IAM → ユーザー → あなたのユーザー名
2. 「セキュリティ認証情報」タブ
3. 「アクセスキーを作成」

### **1-3. 接続テスト**
```bash
# AWS接続テスト
aws sts get-caller-identity

# 成功例:
# {
#   "UserId": "AIDACKCEVSQ6C2EXAMPLE",
#   "Account": "123456789012",
#   "Arn": "arn:aws:iam::123456789012:user/YourName"
# }
```

---

## 🖥️ **Step 2: EC2インスタンス作成**

### **2-1. セキュリティグループ作成**
```bash
# Webアプリ用セキュリティグループ作成
aws ec2 create-security-group \
  --group-name ayumi-support-sg \
  --description "Security group for Ayumi Support application"

# ルール追加
aws ec2 authorize-security-group-ingress \
  --group-name ayumi-support-sg \
  --protocol tcp \
  --port 22 \
  --cidr 0.0.0.0/0  # SSH (本番では自分のIPに制限推奨)

aws ec2 authorize-security-group-ingress \
  --group-name ayumi-support-sg \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0  # HTTP

aws ec2 authorize-security-group-ingress \
  --group-name ayumi-support-sg \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0  # HTTPS

aws ec2 authorize-security-group-ingress \
  --group-name ayumi-support-sg \
  --protocol tcp \
  --port 3000 \
  --cidr 0.0.0.0/0  # Node.js app (テスト用)
```

### **2-2. キーペア作成**
```bash
# SSH接続用キーペア作成
aws ec2 create-key-pair \
  --key-name ayumi-support-key \
  --query 'KeyMaterial' \
  --output text > ayumi-support-key.pem

# キーファイルの権限設定 (Linux/Mac)
chmod 400 ayumi-support-key.pem

# Windows の場合は手動で権限設定
# 右クリック → プロパティ → セキュリティ → 詳細設定
```

### **2-3. EC2インスタンス起動**
```bash
# Ubuntu 22.04 LTS インスタンス起動
aws ec2 run-instances \
  --image-id ami-0d52744d6551d851e \
  --count 1 \
  --instance-type t3.medium \
  --key-name ayumi-support-key \
  --security-groups ayumi-support-sg \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=ayumi-support-server}]'
```

### **2-4. パブリックIPアドレス取得**
```bash
# インスタンス情報取得
aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=ayumi-support-server" \
  --query 'Reservations[*].Instances[*].[PublicIpAddress,State.Name]' \
  --output table

# IPアドレスをメモしておく
# 例: 52.194.XXX.XXX
```

---

## 🔐 **Step 3: サーバー環境セットアップ**

### **3-1. SSH接続**
```bash
# EC2インスタンスに接続
ssh -i ayumi-support-key.pem ubuntu@[パブリックIPアドレス]

# 例:
# ssh -i ayumi-support-key.pem ubuntu@52.194.XXX.XXX
```

### **3-2. 基本パッケージインストール**
```bash
# システム更新
sudo apt update && sudo apt upgrade -y

# 必要パッケージインストール
sudo apt install -y curl git nginx certbot python3-certbot-nginx

# Node.js 18.x インストール
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Chromium インストール（Puppeteer用）
sudo apt install -y chromium-browser

# PM2 インストール（プロセス管理）
sudo npm install -g pm2

# 確認
node --version  # v18.x.x
npm --version   # 9.x.x
chromium-browser --version
```

### **3-3. アプリケーションディレクトリ作成**
```bash
# アプリ用ディレクトリ作成
sudo mkdir -p /var/www/ayumi-support
sudo chown ubuntu:ubuntu /var/www/ayumi-support
cd /var/www/ayumi-support
```

---

## 📦 **Step 4: アプリケーションデプロイ**

### **4-1. ソースコード転送**

**方法A: Gitリポジトリ経由（推奨）**
```bash
# GitHubにプッシュしてからクローン
git clone https://github.com/your-username/support-docs.git .

# または既存のリポジトリがある場合
git pull origin main
```

**方法B: 直接ファイル転送**
```bash
# ローカルマシンから（別ターミナルで実行）
scp -i ayumi-support-key.pem -r C:/support-docs ubuntu@[IP]:/var/www/ayumi-support/
```

### **4-2. 依存関係インストール**
```bash
# アプリディレクトリに移動
cd /var/www/ayumi-support

# 本番用依存関係インストール
npm ci --only=production

# 生成ディレクトリ作成
mkdir -p uploads generated temp logs
```

### **4-3. 環境変数設定**
```bash
# 環境変数ファイル作成
cat > .env << 'EOF'
# サーバー設定
NODE_ENV=production
PORT=3000
CLIENT_URL=http://[あなたのIP]
CORS_ORIGIN=http://[あなたのIP]

# セキュリティ設定
JWT_SECRET=qbR/fUKWAKc6UiuuNOVNRZKut5Xp2oe7g/wjj2lLb06G/nhBSMMwApjNKsenS0/VAtIWbg0yNMlx01J9RibfGw==
RATE_LIMIT=100
SESSION_TIMEOUT=3600

# データベース設定（PostgreSQLを使う場合）
DB_HOST=localhost
DB_PORT=5432
DB_NAME=support_docs
DB_USER=postgres
DB_PASSWORD=your_secure_password

# APIキー（後で設定）
OPENAI_API_KEY=YOUR_NEW_OPENAI_API_KEY_HERE
ANTHROPIC_API_KEY=YOUR_NEW_ANTHROPIC_API_KEY_HERE

# ファイル管理設定
MAX_FILE_SIZE=100
UPLOAD_CLEANUP_HOURS=24
AUTO_DELETE_ENABLED=true

# Puppeteer設定
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# メモリ設定
MAX_MEMORY_MB=3072
AUDIO_CONCURRENCY=2
PDF_CONCURRENCY=3
AI_CONCURRENCY=3
EOF
```

---

## 🔑 **Step 5: APIキー設定**

### **5-1. 新しいAPIキー取得**

**OpenAI API キー:**
1. https://platform.openai.com/api-keys にアクセス
2. 「Create new secret key」
3. 新しいキーをコピー

**Anthropic API キー:**
1. https://console.anthropic.com/ にアクセス
2. API Keys → 「Create Key」
3. 新しいキーをコピー

### **5-2. AWS Parameter Store に保存**
```bash
# ローカルマシンで実行（セキュア）
aws ssm put-parameter \
  --name "/ayumi-support/openai-api-key" \
  --value "sk-proj-新しいOpenAIキー" \
  --type "SecureString"

aws ssm put-parameter \
  --name "/ayumi-support/anthropic-api-key" \
  --value "sk-ant-新しいAnthropicキー" \
  --type "SecureString"

aws ssm put-parameter \
  --name "/ayumi-support/jwt-secret" \
  --value "qbR/fUKWAKc6UiuuNOVNRZKut5Xp2oe7g/wjj2lLb06G/nhBSMMwApjNKsenS0/VAtIWbg0yNMlx01J9RibfGw==" \
  --type "SecureString"
```

### **5-3. EC2でAPIキー設定**
```bash
# EC2サーバーで実行
# AWS CLIをインスタンスにもインストール
sudo apt install -y awscli

# IAMロールをEC2インスタンスに付与（推奨）
# または一時的に認証情報設定
aws configure

# Parameter Store から取得して環境変数に設定
export OPENAI_API_KEY=$(aws ssm get-parameter --name "/ayumi-support/openai-api-key" --with-decryption --query Parameter.Value --output text)
export ANTHROPIC_API_KEY=$(aws ssm get-parameter --name "/ayumi-support/anthropic-api-key" --with-decryption --query Parameter.Value --output text)

# .envファイルを更新
sed -i "s/YOUR_NEW_OPENAI_API_KEY_HERE/$OPENAI_API_KEY/" .env
sed -i "s/YOUR_NEW_ANTHROPIC_API_KEY_HERE/$ANTHROPIC_API_KEY/" .env
```

---

## 🚀 **Step 6: アプリケーション起動**

### **6-1. アプリケーション起動テスト**
```bash
# 一度テスト起動
cd /var/www/ayumi-support
npm start

# 動作確認（別ターミナルで）
curl http://localhost:3000/api/health

# 成功したら Ctrl+C で停止
```

### **6-2. PM2でプロダクション起動**
```bash
# PM2でアプリケーション起動
pm2 start server/server.js --name "ayumi-support" \
  --instances 2 \
  --max-memory-restart 3G \
  --env production

# PM2設定を保存
pm2 save
pm2 startup

# 表示されたコマンドをコピーして実行
# 例: sudo env PATH=$PATH:/usr/bin...
```

### **6-3. Nginx リバースプロキシ設定**
```bash
# 既存のNginx設定を利用
sudo cp /var/www/ayumi-support/nginx/nginx.prod.conf /etc/nginx/sites-available/ayumi-support

# IPアドレスを現在のサーバーIPに変更
sudo sed -i "s/your-domain.com/[あなたのパブリックIP]/g" /etc/nginx/sites-available/ayumi-support

# 設定を有効化
sudo ln -s /etc/nginx/sites-available/ayumi-support /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default

# 設定テスト
sudo nginx -t

# Nginx再起動
sudo systemctl restart nginx
sudo systemctl enable nginx
```

---

## 🌐 **Step 7: 動作確認**

### **7-1. アクセステスト**
```bash
# ヘルスチェック
curl http://[パブリックIP]/api/health

# ブラウザでアクセス
# http://[パブリックIP]
```

### **7-2. 認証テスト**
```bash
# 管理者ログイン
curl -X POST http://[パブリックIP]/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# 成功すればトークンが返される
```

### **7-3. 音声処理テスト**
```bash
# 簡単な音声ファイルアップロード（トークン必要）
curl -X POST http://[パブリックIP]/api/audio/upload \
  -H "Authorization: Bearer [取得したトークン]" \
  -F "audioFile=@test.wav"
```

---

## 🔍 **Step 8: 監視・ログ確認**

### **8-1. アプリケーション監視**
```bash
# PM2ステータス確認
pm2 status
pm2 logs ayumi-support
pm2 monit

# システムリソース確認
htop
df -h
free -h
```

### **8-2. ログ確認**
```bash
# アプリケーションログ
tail -f /var/www/ayumi-support/logs/app.log

# Nginxログ
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# システムログ
sudo journalctl -u nginx -f
```

---

## 🌟 **追加設定（オプション）**

### **ドメイン名設定**
```bash
# ドメインを取得した場合
# Route 53でAレコード設定: your-domain.com → [パブリックIP]

# SSL証明書自動取得
sudo certbot --nginx -d your-domain.com

# 自動更新設定
sudo crontab -e
# 追加: 0 12 * * * /usr/bin/certbot renew --quiet
```

### **データベース設定（PostgreSQL）**
```bash
# PostgreSQL インストール
sudo apt install -y postgresql postgresql-contrib

# データベース設定
sudo -u postgres createuser --interactive
# ユーザー名: ayumi_user
# スーパーユーザー: n

sudo -u postgres createdb support_docs
```

---

## ✅ **完了チェックリスト**

- [ ] AWS CLI設定完了
- [ ] EC2インスタンス起動
- [ ] Node.js環境構築
- [ ] アプリケーションデプロイ
- [ ] APIキー設定
- [ ] PM2でプロセス管理
- [ ] Nginx設定
- [ ] 動作確認完了
- [ ] ログ監視設定

---

## 🆘 **トラブルシューティング**

### **よくある問題**

**1. アプリが起動しない**
```bash
# ログ確認
pm2 logs ayumi-support
# 環境変数確認
pm2 env 0
```

**2. APIキーエラー**
```bash
# 環境変数確認
echo $OPENAI_API_KEY
cat .env | grep API_KEY
```

**3. メモリ不足**
```bash
# スワップファイル作成
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

**4. ポート競合**
```bash
# ポート使用状況確認
sudo netstat -tulpn | grep :3000
sudo lsof -i :3000
```

---

## 🎉 **成功！**

これで歩みサポートシステムがAWS上で稼働しています！

**アクセスURL**: `http://[あなたのパブリックIP]`  
**管理者ログイン**: `admin` / `admin123`

次のステップでドメイン名とSSL証明書を設定すると、さらに本格的なサービスになります。