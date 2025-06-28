# プロジェクト構造整理計画

## 現在の問題点
1. ルートディレクトリにHTMLテストファイルが散在
2. サーバーコードの分割が不十分 
3. 設定ファイルが適切に分離されていない
4. ドキュメントが複数箇所に分散

## 最適化後の構造

```
support-docs/
├── README.md                    # プロジェクト概要
├── package.json                 # Node.js設定
├── package-lock.json
├── .gitignore                   # Git除外設定
├── .env.example                 # 環境変数テンプレート
├── Dockerfile                   # Docker設定
├── docker-compose.yml           # Docker Compose設定
│
├── docs/                        # 📚 ドキュメント
│   ├── README.md
│   ├── BUSINESS_PLAN.md
│   ├── PRIVACY.md
│   ├── SECURITY.md
│   ├── API.md                   # API仕様書
│   └── deployment/              # デプロイメント関連
│       ├── aws-setup.md
│       ├── aws-deploy-checklist.md
│       ├── manual-deploy-steps.md
│       └── docker-deploy.md
│
├── scripts/                     # 🔧 スクリプト
│   ├── deploy.sh               # デプロイスクリプト
│   ├── setup.sh                # 初期セットアップ
│   ├── test.sh                 # テスト実行
│   └── backup.sh               # バックアップ
│
├── config/                      # ⚙️ 設定ファイル
│   ├── database.js             # DB設定
│   ├── storage.js              # ストレージ設定
│   ├── auth.js                 # 認証設定
│   └── app.js                  # アプリ設定
│
├── server/                      # 🖥️ バックエンド
│   ├── app.js                  # Express アプリケーション
│   ├── server.js               # サーバー起動
│   ├── routes/                 # ルート定義
│   │   ├── index.js
│   │   ├── api/
│   │   │   ├── audio.js        # 音声関連API
│   │   │   ├── pdf.js          # PDF生成API
│   │   │   └── health.js       # ヘルスチェック
│   │   └── auth/
│   │       └── index.js
│   ├── controllers/            # コントローラー
│   │   ├── audioController.js
│   │   ├── pdfController.js
│   │   └── authController.js
│   ├── services/               # ビジネスロジック
│   │   ├── audioService.js     # 音声処理
│   │   ├── aiService.js        # AI分析
│   │   ├── pdfService.js       # PDF生成
│   │   ├── storageService.js   # ファイルストレージ
│   │   └── authService.js      # 認証
│   ├── middleware/             # ミドルウェア
│   │   ├── auth.js             # 認証
│   │   ├── upload.js           # ファイルアップロード
│   │   ├── security.js         # セキュリティ
│   │   ├── validation.js       # バリデーション
│   │   └── errorHandler.js     # エラーハンドリング
│   ├── models/                 # データモデル
│   │   ├── index.js
│   │   ├── User.js
│   │   ├── AudioFile.js
│   │   └── Assessment.js
│   ├── utils/                  # ユーティリティ
│   │   ├── logger.js           # ログ機能
│   │   ├── helpers.js          # ヘルパー関数
│   │   └── constants.js        # 定数
│   └── database/               # データベース
│       ├── migrations/         # マイグレーション
│       ├── seeders/           # シードデータ
│       └── connection.js       # DB接続
│
├── client/                      # 🌐 フロントエンド
│   ├── public/
│   │   ├── index.html
│   │   └── favicon.ico
│   ├── src/
│   │   ├── components/         # React コンポーネント
│   │   ├── pages/              # ページコンポーネント
│   │   ├── services/           # API クライアント
│   │   ├── utils/              # ユーティリティ
│   │   └── styles/             # スタイル
│   ├── package.json
│   └── package-lock.json
│
├── tests/                       # 🧪 テスト
│   ├── unit/                   # 単体テスト
│   ├── integration/            # 統合テスト
│   ├── e2e/                    # E2Eテスト
│   └── fixtures/               # テストデータ
│
├── uploads/                     # 📁 アップロードファイル (開発時)
├── generated/                   # 📄 生成ファイル (開発時)
├── logs/                        # 📋 ログファイル
│
└── tools/                       # 🛠️ 開発ツール
    ├── test-pages/             # テスト用HTMLページ
    │   ├── audio-upload.html
    │   ├── pdf-preview.html
    │   └── transcribe-test.html
    └── development/
        ├── sample-data/        # サンプルデータ
        └── scripts/           # 開発用スクリプト
```

## 移行計画

### Phase 1: ディレクトリ構造作成
- [x] docs/ ディレクトリ作成・ドキュメント移動
- [x] scripts/ ディレクトリ作成
- [ ] config/ ディレクトリ作成・設定分離
- [ ] tools/ ディレクトリ作成・テストファイル移動

### Phase 2: サーバーコード整理
- [ ] routes/ 分離・整理
- [ ] controllers/ 作成・ロジック分離  
- [ ] services/ 整理・機能分離
- [ ] middleware/ 整理・機能追加
- [ ] utils/ 作成・共通機能分離

### Phase 3: 設定・環境整理
- [ ] 環境変数管理改善
- [ ] ログ機能実装
- [ ] エラーハンドリング統一
- [ ] バリデーション機能強化

### Phase 4: テスト・品質向上
- [ ] テスト環境構築
- [ ] 単体テスト実装
- [ ] API仕様書作成
- [ ] コード品質向上