# Support-docs API仕様書

## 概要

障害福祉支援記録PDF自動生成アプリのREST API仕様

- **Base URL**: `http://localhost:5000` (開発環境)
- **Content-Type**: `application/json` または `multipart/form-data`
- **認証**: 現在は未実装 (将来的にJWTトークン認証予定)

## エンドポイント一覧

### 🏥 ヘルスチェック

#### `GET /api/health`
サーバーの稼働状況を確認

**レスポンス例:**
```json
{
  "status": "OK",
  "timestamp": "2024-12-27T10:00:00.000Z",
  "uptime": 3600,
  "memory": {
    "rss": 45678912,
    "heapTotal": 12345678,
    "heapUsed": 8765432
  },
  "version": "1.0.0",
  "environment": "development",
  "services": {
    "openai": true,
    "anthropic": true,
    "database": true,
    "storage": true
  }
}
```

#### `GET /api/health/detailed`
詳細なシステム情報（管理者用）

### 🎤 音声処理API

#### `POST /api/audio/upload`
音声ファイルのアップロードのみ

**リクエスト:**
- Content-Type: `multipart/form-data`
- フィールド: `audioFile` (ファイル)

**対応フォーマット:**
- `.mp3`, `.wav`, `.m4a`, `.aac`
- 最大サイズ: 100MB

**レスポンス例:**
```json
{
  "success": true,
  "message": "ファイルのアップロードが完了しました",
  "file": {
    "originalName": "interview.mp3",
    "filename": "audio_1640606400000_interview.mp3",
    "size": 2048576,
    "path": "/uploads/audio_1640606400000_interview.mp3"
  }
}
```

#### `POST /api/audio/upload-and-transcribe`
音声アップロード + 音声認識

**リクエスト:**
- Content-Type: `multipart/form-data`
- フィールド: `audioFile` (ファイル)

**レスポンス例:**
```json
{
  "success": true,
  "message": "音声認識が完了しました",
  "file": {
    "originalName": "interview.mp3",
    "filename": "audio_1640606400000_interview.mp3",
    "size": 2048576,
    "path": "/uploads/audio_1640606400000_interview.mp3"
  },
  "transcription": {
    "text": "今日は個別面談を実施します。現在の就労状況について教えてください。",
    "language": "ja",
    "duration": 120.5,
    "wordCount": 28,
    "segments": [
      {
        "start": 0.0,
        "end": 3.2,
        "text": "今日は個別面談を実施します。"
      }
    ]
  }
}
```

#### `POST /api/audio/upload-transcribe-analyze`
音声アップロード + 音声認識 + AI解析

**レスポンス例:**
```json
{
  "success": true,
  "message": "アップロード・音声認識・AI解析が完了しました",
  "file": { /* 同上 */ },
  "transcription": { /* 同上 */ },
  "analysis": {
    "structured_data": {
      "summary": "就労移行支援に関する面談を実施。利用者の作業能力とコミュニケーションについて確認し、今後の支援方針を検討した。",
      "participant_info": {
        "利用者": "田中太郎",
        "支援員": "佐藤花子",
        "その他": "なし"
      },
      "interview_content": {
        "主訴・相談内容": "作業に集中できない課題について相談",
        "現在の状況": "週3日の通所を継続中",
        "課題・困りごと": "集中力の維持が困難",
        "本人の意向": "就労に向けた訓練を継続したい",
        "支援方針": "段階的な作業時間の延長を検討"
      }
    }
  }
}
```

### 📄 PDF生成API

#### `POST /api/pdf/assessment-sheet`
アセスメント表PDF生成

**リクエスト例:**
```json
{
  "userName": "田中太郎",
  "age": "25",
  "disabilityType": "精神障害",
  "assessor": "佐藤支援員",
  "work_attendance": "4",
  "work_attendance_comment": "遅刻はほとんどなく、安定して通所できている",
  "task_understanding": "3",
  "task_understanding_comment": "複雑な指示は反復説明が必要"
}
```

**レスポンス例:**
```json
{
  "success": true,
  "message": "アセスメント表PDFの生成が完了しました",
  "filename": "assessment_sheet_1640606400000.pdf",
  "path": "/generated/assessment_sheet_1640606400000.pdf"
}
```

#### `POST /api/pdf/interview-record`
面談記録PDF生成

**リクエスト例:**
```json
{
  "userName": "田中太郎",
  "staffName": "佐藤支援員",
  "transcriptionText": "今日は個別面談を実施します..."
}
```

#### `POST /api/pdf/service-record`
サービス提供実績記録表PDF生成

#### `POST /api/pdf/individual-support-plan`
個別支援計画書PDF生成

#### `POST /api/pdf/monitoring-record`
モニタリング記録表PDF生成

## エラーレスポンス

### 4xx クライアントエラー

#### 400 Bad Request
```json
{
  "error": "ファイルがアップロードされていません",
  "field": "audioFile"
}
```

#### 429 Too Many Requests
```json
{
  "error": "リクエスト数が制限を超えています",
  "retryAfter": 900,
  "limit": 100
}
```

### 5xx サーバーエラー

#### 500 Internal Server Error
```json
{
  "error": "音声認識に失敗しました",
  "details": "API接続エラーが発生しました"
}
```

## レート制限

- **制限**: 15分間に100リクエスト/IP
- **ヘッダー**: `Retry-After` でリトライ間隔を通知

## セキュリティ

### セキュリティヘッダー
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Strict-Transport-Security: max-age=31536000; includeSubDomains (本番のみ)
```

### ファイルアップロード制限
- **最大サイズ**: 100MB
- **対応フォーマット**: `.mp3`, `.wav`, `.m4a`, `.aac`
- **ウイルススキャン**: 将来実装予定

## 使用例

### cURLコマンド例

```bash
# ヘルスチェック
curl http://localhost:5000/api/health

# 音声ファイルアップロード
curl -X POST \
  -F "audioFile=@interview.mp3" \
  http://localhost:5000/api/audio/upload

# 音声認識
curl -X POST \
  -F "audioFile=@interview.mp3" \
  http://localhost:5000/api/audio/upload-and-transcribe

# PDF生成
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"userName":"田中太郎","staffName":"佐藤支援員"}' \
  http://localhost:5000/api/pdf/interview-record
```

### JavaScript例

```javascript
// 音声ファイルアップロード
const formData = new FormData();
formData.append('audioFile', audioFile);

fetch('/api/audio/upload-and-transcribe', {
  method: 'POST',
  body: formData
})
.then(response => response.json())
.then(data => {
  console.log('音声認識結果:', data.transcription.text);
});

// PDF生成
fetch('/api/pdf/assessment-sheet', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    userName: '田中太郎',
    age: '25',
    disabilityType: '精神障害'
  })
})
.then(response => response.json())
.then(data => {
  console.log('PDF生成完了:', data.filename);
});
```

## 環境変数

必要な環境変数設定:

```bash
# API Keys
OPENAI_API_KEY=sk-proj-...
ANTHROPIC_API_KEY=sk-ant-...

# Server
PORT=5000
NODE_ENV=production

# File Settings
MAX_FILE_SIZE=100
UPLOAD_CLEANUP_HOURS=24

# Rate Limiting
RATE_LIMIT=100

# CORS
CORS_ORIGIN=https://yourdomain.com
```

## 開発者向け情報

### ログ出力
- アプリケーションログ: `logs/app-YYYY-MM-DD.log`
- エラーログ: `logs/error-YYYY-MM-DD.log`
- 形式: JSON構造化ログ

### 監視メトリクス
- `/api/health` でシステム状況監視
- メモリ使用量、アップタイム等を出力
- 外部サービス接続状況を確認

### テスト
```bash
npm run test:unit      # 単体テスト
npm run test:integration  # 統合テスト
```

## 変更履歴

| バージョン | 日付 | 変更内容 |
|------------|------|----------|
| 1.0.0 | 2024-12-27 | 初回リリース |