# 🚨 即座の解決方法

## 問題
- 古いサーバー（server/index.js）がポート5000で動作中
- 新しいサーバー（server/server.js）が未起動
- **ファイル直接アクセス → CORS エラー**

## ✅ 今すぐ解決する手順

### 1. 正しいサーバーにアクセス
現在動作中のサーバーを使用：
```
http://localhost:5000/api-test.html
```

### 2. または、正しいサーバーを起動
```bash
# 現在のプロセスを停止
pkill -f "node.*index.js"

# 新しいサーバーを起動
npm run dev
# または
node server/server.js
```

### 3. 確認用URL
サーバー起動後、以下のURLでアクセス：
```
http://localhost:3000/api-test     # 新サーバー
http://localhost:5000/api-test.html # 旧サーバー
```

## 🎯 テスト用の簡単URL

### 現在すぐ使える（旧サーバー ポート5000）
- http://localhost:5000/api-test.html
- http://localhost:5000/  

### 新サーバー起動後（ポート3000）
- http://localhost:3000/simple-test
- http://localhost:3000/simple-workflow  
- http://localhost:3000/api-test

## ⚠️ 重要
絶対に `file://` で開かず、必ず `http://localhost:XXXX/` でアクセスしてください！