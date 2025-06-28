# API-testページ トラブルシューティングガイド

## 🚨 API-testページのボタンが動かない場合の解決方法

### 原因1: APIキーが未設定

**症状**: ボタンをクリックしても反応せず、コンソールで`validateApiKeys`エラー

**解決方法**:
```bash
# 1. .envファイルを確認
cat .env

# 2. 必要なAPIキーを設定
echo "OPENAI_API_KEY=sk-proj-your-actual-openai-key" >> .env
echo "ANTHROPIC_API_KEY=sk-ant-your-actual-anthropic-key" >> .env

# 3. サーバーを再起動
npm run dev
```

### 原因2: サーバーが起動していない

**症状**: "Failed to fetch" エラーがコンソールに表示

**解決方法**:
```bash
# 1. サーバー起動状況確認
ps aux | grep node

# 2. サーバー起動
npm run dev

# 3. ブラウザで http://localhost:3000/api-test.html にアクセス
```

### 原因3: CORS設定の問題

**症状**: CORS related error がコンソールに表示

**解決方法**:
```bash
# .envファイルでCORS_ORIGINを確認・設定
echo "CORS_ORIGIN=http://localhost:3000" >> .env
```

## 🧪 API-testページ動作確認手順

### 1. 基本確認
```bash
# プロジェクトディレクトリに移動
cd /path/to/support-docs

# 依存関係インストール
npm install

# 環境変数ファイル作成
cp .env.example .env
```

### 2. APIキー設定 (必須!)
`.env`ファイルを編集して以下を設定:
```
OPENAI_API_KEY=sk-proj-xxxx  # OpenAI API キー
ANTHROPIC_API_KEY=sk-ant-xxxx # Anthropic API キー
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
```

### 3. サーバー起動
```bash
npm run dev
```

### 4. ブラウザでテスト
1. ブラウザで `http://localhost:3000/api-test.html` を開く
2. 「ヘルスチェック実行」ボタンをクリック
3. 緑色で成功メッセージが表示されればOK

## 🔍 デバッグ方法

### ブラウザ開発者ツールでの確認
1. F12 でデベロッパーツールを開く
2. Console タブでエラーメッセージを確認
3. Network タブでAPI呼び出しの状況を確認

### よくあるエラーメッセージ

| エラーメッセージ | 原因 | 解決方法 |
|-----------------|------|----------|
| `Failed to fetch` | サーバー未起動 | `npm run dev` で起動 |
| `API keys not configured` | APIキー未設定 | `.env`にAPIキー設定 |
| `CORS error` | CORS設定問題 | `CORS_ORIGIN`を正しく設定 |
| `Request timeout` | ファイルサイズ過大 | 小さな音声ファイルでテスト |

## 💡 APIキー無しでのテスト方法

APIキーが無い場合は、以下の機能のみテスト可能:
- ヘルスチェック
- ファイルアップロード (音声認識無し)
- 一部のサンプルPDF生成

音声認識・AI解析機能には必ずAPIキーが必要です。

## ✅ 正常動作の確認方法

1. **ヘルスチェック**: 緑色で "Server is healthy" 表示
2. **音声アップロード**: ファイル選択後に成功メッセージ
3. **PDF生成**: PDFリンクが表示され、クリックで開ける

## 🆘 それでも動かない場合

1. サーバーログを確認: `tail -f logs/app.log`
2. ポート3000が使用されていないか確認: `lsof -i :3000`
3. ファイアウォール設定を確認
4. ブラウザのキャッシュをクリア

---

**注意**: 本番環境では必ずHTTPS対応とAPIキーの安全な管理を行ってください。