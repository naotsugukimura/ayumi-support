# 🚨 API-testページ「Failed to fetch」エラー修正手順

## 問題の原因
- サーバーポート: 5000で起動
- API-testページの想定: 3000ポート
- **ポート番号の不一致**によるエラー

## ✅ 修正完了済み
- `.env`ファイルのPORTを3000に変更
- API-testページのポート設定を修正

## 🚀 今すぐ解決する手順

### 1. サーバーの再起動
```bash
# 現在のサーバーを停止 (Ctrl+C)
# 再度起動
npm run dev
```

### 2. 正しいURLでアクセス
```
http://localhost:3000/api-test.html
```

### 3. 動作確認
1. ブラウザで `http://localhost:3000/api-test.html` を開く
2. 「ヘルスチェック実行」ボタンをクリック
3. 「🧪 接続テスト (APIキー不要)」ボタンをクリック
4. 「🎬 デモ文字起こし (APIキー不要)」ボタンをクリック

### 4. もし依然としてエラーが出る場合

#### A. ポート使用状況確認
```bash
# ポート3000が使用されているか確認
lsof -i :3000

# プロセス強制停止（必要に応じて）
pkill -f "node.*support-docs"
```

#### B. ブラウザキャッシュクリア
1. F12でデベロッパーツールを開く
2. Network タブで「Disable cache」にチェック
3. ページをリロード

#### C. 手動ポート指定でテスト
```bash
# 5000ポートで起動している場合
http://localhost:5000/api-test.html
```

## 🎯 正常動作時の表示

### ヘルスチェック成功時
```json
{
  "status": "WARNING",
  "demo_mode": true,
  "message": "API keys configured - full functionality available",
  "openai_configured": true,
  "anthropic_configured": true
}
```

### 接続テスト成功時
```json
{
  "success": true,
  "message": "テストアップロード成功！サーバーとの接続は正常です。",
  "test": true
}
```

## 🔧 トラブルシューティング

### よくあるエラーと解決方法

| エラー | 原因 | 解決方法 |
|--------|------|----------|
| Failed to fetch | サーバー未起動/ポート不一致 | `npm run dev`で再起動、正しいURLアクセス |
| CORS error | CORS設定問題 | `.env`のCORS_ORIGINを確認 |
| 404 Not Found | APIルート未実装 | サーバーログでルート確認 |

### デバッグ用ログ確認
```bash
# アプリケーションログ
tail -f /mnt/c/support-docs/logs/app.log

# エラーログ
tail -f /mnt/c/support-docs/logs/error.log
```

---

**修正完了！** サーバーを`npm run dev`で再起動してから`http://localhost:3000/api-test.html`にアクセスしてください。