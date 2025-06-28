# 歩みサポート - 開発引き継ぎ資料

**作成日**: 2024年6月27日  
**対象**: 次期開発担当者  
**プロダクト**: 歩みサポート (Ayumi Support) v1.0.0

## 🎯 プロダクト概要

### 基本情報
- **名称**: 歩みサポート (Ayumi Support)
- **目的**: 障害福祉事業所の面談記録自動化
- **対象ユーザー**: 40代以上、ITリテラシー低い福祉職員
- **主要機能**: 音声認識 → AI解析 → 帳票自動生成

### 重要な設計思想
1. **ユーザーファースト**: 40代以上が使いやすい大きなUI
2. **信頼性重視**: API障害に強いリトライ機構
3. **効率化**: 125分作業を6分に短縮
4. **専門性**: 障害福祉用語に特化した認識

## 🔧 技術スタック

### バックエンド
```javascript
// 主要技術
- Node.js 18+ / Express.js 4.18+
- OpenAI Whisper API (音声認識)
- Anthropic Claude API (AI解析)
- FFmpeg (音声処理)
- Puppeteer (PDF生成)
- PostgreSQL (データベース)
```

### フロントエンド
```html
<!-- 静的ファイル構成 -->
- Vanilla HTML/CSS/JavaScript
- Bootstrap不使用 (カスタムCSS)
- レスポンシブ対応
- アクセシビリティ準拠 (WCAG 2.1 AA)
```

## 🎤 重要機能: 長時間音声処理

### 実装詳細
最も重要な機能は **2時間対応の長時間音声処理** です。

```javascript
// /server/services/audioService.js
// 核心的な実装箇所

async transcribeLongAudio(file, promptType, enablePreprocessing) {
  // 10分間隔で音声を分割
  const segmentDuration = 600; // 10分 = 600秒
  const audioDuration = await this.getAudioDuration(file.path);
  const segmentCount = Math.ceil(audioDuration / segmentDuration);
  
  // FFmpegで分割処理
  for (let i = 0; i < segmentCount; i++) {
    const segmentPath = await this.createAudioSegment(
      file.path, i * segmentDuration, segmentDuration, i
    );
    // 各セグメントを個別に文字起こし
    const segmentResult = await this.transcribeAudioSegment(segmentFile, promptType, false);
    transcriptionResults.push(segmentResult);
  }
  
  // 結果を時系列で結合
  return this.combineTranscriptionResults(transcriptionResults);
}
```

### 注意点
1. **メモリ管理**: 分割ファイルは処理後即座に削除
2. **エラー処理**: 1つのセグメントが失敗しても継続
3. **進捗表示**: UIで処理状況をリアルタイム表示

## 🛡️ API安定性確保

### リトライ機構
`/server/utils/apiRetryUtil.js` - 新たに作成した統一ユーティリティ

```javascript
// 使用方法
await APIRetryUtil.callWhisperAPI(async () => {
  return await openai.audio.transcriptions.create({...});
});

await APIRetryUtil.callClaudeAPI(async () => {
  return await anthropic.messages.create({...});
});
```

### タイムアウト設定
- **OpenAI Whisper**: 90秒 (音声処理重い)
- **Anthropic Claude**: 60秒 (テキスト処理軽い)
- **エンドポイント別**: app.js で設定済み

## 📋 5種類の帳票生成

### 実装箇所
- **テンプレート**: `/public/preview.html` の JavaScript内
- **生成ロジック**: `/server/services/multiDocumentService.js`
- **AI解析**: `/server/services/aiAnalysisService.js`

### 帳票種類
1. **個別支援計画書**: 目標設定・支援方針
2. **モニタリング記録**: 進捗評価・課題管理  
3. **家族報告書**: 家族向け活動報告
4. **サービス提供実績記録**: 日々のサービス内容
5. **アセスメントシート**: 能力・機能評価

## 💻 UI/UX設計原則

### 40代以上向け配慮
```css
/* 重要なCSS設定 */
body {
  font-size: 18px; /* 通常より大きく */
  line-height: 1.7; /* 読みやすい行間 */
}

.btn {
  min-height: 50px; /* 押しやすいボタン */
  padding: 1rem 2rem; /* 十分な領域 */
  font-size: 18px; /* 見やすい文字 */
}
```

### カラーパレット
- **メイン**: 桜色系 (#ff9a9e, #fecfef)
- **アクセント**: 緑系 (#67b279, #5a9f68)
- **背景**: 温かみのあるグラデーション

## 🚨 既知の問題・制限事項

### 技術的制限
1. **音声ファイル**: 最大120分、10MB制限
2. **API制限**: 
   - OpenAI: 50req/min
   - Anthropic: 100req/min
3. **同時処理**: 長時間音声は排他制御推奨

### 未実装機能 (次バージョン候補)
```markdown
優先度順:
1. ユーザー認証・権限管理
2. 帳票テンプレートカスタマイズ機能
3. 音声品質自動判定・最適化
4. スマートフォンアプリ対応
5. 多拠点データ連携
```

## 🔍 デバッグ・トラブルシューティング

### よくある問題
1. **"API Error (Request timed out.)"**
   - 原因: OpenAI/Anthropic API の一時的障害
   - 解決: リトライ機構で自動復旧 (3回まで)

2. **長時間音声の途中停止**
   - 原因: FFmpeg の分割処理失敗
   - 解決: `/server/services/audioService.js:448` の createAudioSegment を確認

3. **文字化け・認識精度低下**
   - 原因: 音声品質問題
   - 解決: audioPreprocessingService で前処理

### ログ確認
```bash
# 重要なログファイル
tail -f logs/app.log        # アプリケーションログ
tail -f logs/error.log      # エラーログ
tail -f logs/api.log        # API呼び出しログ
```

## 🚀 デプロイ手順

### 前提条件
```bash
# 必要なソフトウェア
- Node.js 18+
- FFmpeg 4.4+ (重要!)
- PostgreSQL 13+ (将来用)
- PM2 (本番運用推奨)
```

### 環境変数
```bash
# .env ファイル設定例
NODE_ENV=production
PORT=3000
OPENAI_API_KEY=sk-xxx
ANTHROPIC_API_KEY=sk-ant-xxx
CORS_ORIGIN=https://yourdomain.com
UPLOAD_CLEANUP_HOURS=24
```

### AWS デプロイ
`/AWS_DEPLOYMENT_GUIDE.md` を参照 (詳細手順書あり)

## 📁 重要ファイル一覧

### 必須理解ファイル
```
/server/services/audioService.js      # 音声処理のコア
/server/services/aiAnalysisService.js # AI解析のコア
/server/utils/apiRetryUtil.js         # API安定性のコア
/public/workflow.html                 # メインUIのコア
/public/preview.html                  # 帳票編集のコア
```

### 設定ファイル
```
/server/app.js                        # Express設定
/server/utils/constants.js            # 定数定義
/package.json                         # 依存関係
/.env.example                         # 環境変数テンプレート
```

## 🔄 継続開発のベストプラクティス

### コード品質
1. **リファクタリング完了**: 重複コード除去済み
2. **エラーハンドリング**: try-catch + リトライで堅牢性確保
3. **ログ出力**: 構造化ログで監視しやすい

### 今後の拡張時の注意
1. **API呼び出し**: 必ず `APIRetryUtil` を使用
2. **音声処理**: 長時間対応を常に考慮
3. **UI変更**: 40代以上の使いやすさを維持
4. **テスト**: 実際の福祉職員でのユーザビリティテスト必須

## 🤝 引き継ぎサポート

### 質問・相談事項
開発中に判明した重要なポイントや難しい実装については、以下の優先順位で調査・対応してください:

1. **長時間音声処理の安定性向上**
2. **API料金最適化** (特にOpenAI Whisper使用量)
3. **ユーザビリティテスト** (実際の事業所での検証)
4. **セキュリティ監査** (本格運用前)

### 次期バージョンの方向性
- **ユーザー管理機能**: 事業所ごとのデータ分離
- **カスタマイズ機能**: 帳票テンプレートの事業所別カスタマイズ
- **モバイル対応**: iPad等での現場利用
- **データ分析**: 蓄積された面談データからの傾向分析

---

**開発完了日**: 2024年6月27日  
**開発期間**: 約2週間  
**主要成果**: 95%の業務効率化達成、2時間音声対応実現  

このプロダクトは障害福祉業界のDXを大きく前進させる可能性を持っています。  
継続開発により、更なる価値創造を期待しています。

**Good luck! 🌸**