# 技術用語集 - 営業出身者向け

## 🎯 この用語集について

営業出身で技術を学ぶあなたのために、**ビジネス視点での価値**と合わせて技術用語を解説します。

---

## 🏗️ システムアーキテクチャ

### フロントエンド (Frontend)
**意味**: ユーザーが直接触れる画面・インターフェース部分  
**例**: Webブラウザで表示される画面、スマホアプリの画面  
**ビジネス価値**: 顧客体験(UX)に直結。使いやすさが売上に影響  
**support-docsでは**: 音声ファイルをアップロードする画面

### バックエンド (Backend)  
**意味**: サーバー側で動く処理部分（ユーザーからは見えない）  
**例**: データ保存、計算処理、外部API連携  
**ビジネス価値**: システムの心臓部。処理速度・安定性がサービス品質を決める  
**support-docsでは**: 音声認識、PDF生成、データベース操作

### API (Application Programming Interface)
**意味**: システム間で情報をやり取りする約束事・窓口  
**例**: 「音声ファイルを送ったらテキストを返す」という約束  
**ビジネス価値**: 他社サービスとの連携、拡張性。エコシステム構築の基盤  
**support-docsでは**: OpenAI（音声認識）、Anthropic（AI分析）との連携

### REST API
**意味**: APIの設計方式の標準。HTTPを使った通信ルール  
**例**: `POST /api/audio/upload` = 音声ファイルをアップロード  
**ビジネス価値**: 業界標準なので他社との連携が容易  
**営業トーク**: 「他システムとの連携も柔軟に対応できます」

---

## 💾 データベース・データ管理

### データベース (Database)
**意味**: データを整理して保存する仕組み  
**例**: 利用者情報、音声ファイル、面談記録  
**ビジネス価値**: 企業の資産であるデータを安全・効率的に管理  
**支出**: 月額$25-30（RDS小規模）

### SQL (Structured Query Language)
**意味**: データベースを操作する言語  
**例**: `SELECT * FROM users WHERE age > 25` = 25歳以上の利用者を取得  
**ビジネス価値**: データ分析、レポート作成の基盤  
**営業的重要性**: 顧客データ分析→営業戦略立案

### PostgreSQL
**意味**: 高機能なオープンソースデータベース  
**競合**: MySQL、Oracle、SQL Server  
**ビジネス価値**: ライセンス費用削減、高い信頼性  
**選定理由**: コスト効率と機能のバランスが良い

---

## 🌐 Web・ネットワーク技術

### HTTP/HTTPS
**意味**: Webブラウザとサーバーがやり取りする約束事  
**違い**: HTTPSは暗号化されて安全  
**ビジネス価値**: HTTPS必須（SEO、信頼性、セキュリティ）  
**コスト**: SSL証明書 年額$50-500

### JSON (JavaScript Object Notation)
**意味**: システム間でデータをやり取りする形式  
**例**: `{"userName": "田中太郎", "age": 25}`  
**ビジネス価値**: 軽量で高速。モバイルアプリに最適  
**競合形式**: XML（重い、古い）

### CORS (Cross-Origin Resource Sharing)
**意味**: 異なるドメイン間でのデータアクセス制御  
**例**: abc.com のページから api.abc.com にアクセス  
**ビジネス価値**: セキュリティとユーザビリティの両立  
**トラブル**: 設定ミスでフロントエンドが動かない原因No.1

---

## ☁️ クラウド・インフラ

### AWS (Amazon Web Services)
**意味**: Amazonが提供するクラウドサービス群  
**競合**: Microsoft Azure、Google Cloud  
**市場シェア**: 約32%（世界1位）  
**ビジネス価値**: 初期投資不要、従量課金、世界展開容易

### EC2 (Elastic Compute Cloud)
**意味**: AWSの仮想サーバーサービス  
**例**: support-docsアプリを動かすサーバー  
**料金**: t3.medium = 月額$35-40  
**営業ポイント**: 「必要な時に必要な分だけサーバーを借りられます」

### RDS (Relational Database Service)
**意味**: AWSのマネージドデータベース  
**メリット**: バックアップ、メンテナンス自動化  
**料金**: db.t3.small = 月額$25-30  
**営業価値**: 「DBA不要でデータベース運用できます」

### S3 (Simple Storage Service)
**意味**: AWSのファイル保存サービス  
**特徴**: 容量無制限、99.999999999%の耐久性  
**料金**: 100GB = 月額$3-5  
**営業ポイント**: 「ファイルが消失するリスクはほぼゼロです」

---

## 🔧 開発・プログラミング

### JavaScript
**意味**: Webブラウザで動くプログラミング言語  
**特徴**: フロントエンドもバックエンドも書ける  
**人気度**: GitHub利用率1位  
**ビジネス価値**: 開発者採用しやすい、開発スピード速い

### Node.js
**意味**: サーバー側でJavaScriptを動かす環境  
**メリット**: フロント・バック同じ言語で開発効率UP  
**人気企業**: Netflix、Uber、LinkedIn  
**営業ポイント**: 「リアルタイム処理が得意です」

### Express
**意味**: Node.jsでWebサーバーを作るフレームワーク  
**シェア**: Node.js界で最も人気  
**メリット**: 軽量、高速、学習コストが低い  
**ビジネス価値**: 開発期間短縮→コスト削減

### フレームワーク
**意味**: アプリ開発の土台・ひな形  
**例**: React（画面）、Express（サーバー）  
**メリット**: 車輪の再発明不要、品質安定  
**選定基準**: コミュニティ、学習コスト、性能

---

## 🔒 セキュリティ

### 認証 (Authentication)
**意味**: 「あなたは誰ですか？」の確認  
**例**: ログイン（ユーザー名+パスワード）  
**ビジネス価値**: 不正アクセス防止、コンプライアンス対応  
**実装コスト**: 2-4週間程度

### 認可 (Authorization)  
**意味**: 「あなたは何ができますか？」の確認  
**例**: 管理者のみPDF削除可能  
**ビジネス価値**: 細かいアクセス制御、情報漏洩防止  
**営業ポイント**: 「役職に応じた権限設定が可能です」

### 暗号化 (Encryption)
**意味**: データを第三者に読めない形に変換  
**種類**: 通信暗号化（HTTPS）、保存暗号化（DB）  
**法的要求**: GDPR、個人情報保護法  
**コスト**: SSL証明書、暗号化機能開発

### バリデーション (Validation)
**意味**: 入力データの妥当性チェック  
**例**: メールアドレス形式、ファイルサイズ  
**ビジネス価値**: システム障害防止、データ品質向上  
**support-docsでは**: 音声ファイル形式・サイズチェック

---

## 📊 運用・監視

### ログ (Log)
**意味**: システムの動作記録  
**例**: 「2024-12-27 10:00 ユーザーAがログイン」  
**ビジネス価値**: 障害原因特定、ユーザー行動分析  
**保存期間**: 法的要求に応じて設定（通常1年以上）

### 監視 (Monitoring)
**意味**: システムの状態を常時チェック  
**指標**: CPU使用率、メモリ使用量、エラー率  
**ビジネス価値**: 障害予防、ユーザー体験維持  
**コスト**: CloudWatch 月額$10-50

### メトリクス (Metrics)  
**意味**: システムの性能・使用状況を数値化  
**例**: レスポンス時間、同時接続数、エラー率  
**ビジネス活用**: SLA設定、容量計画、課金根拠  
**KPI連携**: システム指標→ビジネス指標への変換

### アラート (Alert)
**意味**: 異常時の自動通知  
**例**: エラー率5%超過でSlack通知  
**ビジネス価値**: 迅速な障害対応、損失最小化  
**運用コスト**: 24時間対応体制の有無で変動

---

## 🔄 開発プロセス・手法

### Git
**意味**: プログラムコードの版本管理システム  
**メリット**: 変更履歴追跡、複数人での協業  
**ビジネス価値**: 開発効率化、品質向上、リスク削減  
**業界標準**: 9割以上の開発チームが使用

### CI/CD
**意味**: 継続的インテグレーション・デプロイメント  
**効果**: 自動テスト→自動デプロイ  
**ビジネス価値**: 人的ミス削減、リリース頻度向上  
**投資回収**: 3-6ヶ月で開発効率の向上を実感

### アジャイル開発
**意味**: 短期間でのリリース・改善を繰り返す手法  
**対比**: ウォーターフォール（最初に全設計）  
**ビジネス価値**: 市場変化への迅速対応  
**適用場面**: 新規事業、不確実性の高いプロジェクト

---

## 🎯 AI・機械学習（support-docs関連）

### OpenAI Whisper
**意味**: 音声をテキストに変換するAI  
**精度**: 人間並み（95%以上）  
**対応言語**: 99言語  
**料金**: $0.006/分  
**営業ポイント**: 「議事録作成工数を90%削減」

### Anthropic Claude
**意味**: 対話・文章解析AI  
**特徴**: 安全性重視、長文対応  
**競合**: ChatGPT、Gemini  
**ビジネス用途**: 文書要約、分析、コンテンツ生成

### 自然言語処理 (NLP)
**意味**: コンピューターが人間の言葉を理解する技術  
**応用**: チャットボット、翻訳、感情分析  
**ビジネス価値**: 顧客対応自動化、インサイト抽出  
**市場規模**: 年率15%成長、2030年に5兆円市場

---

## 💰 コスト・料金体系

### 従量課金 (Pay-as-you-go)
**意味**: 使った分だけ支払う料金体系  
**例**: API呼び出し回数、データ転送量  
**メリット**: 初期投資不要、使用量に応じたコスト  
**注意点**: 予期しない高額請求の可能性

### 月額固定 (Fixed Monthly)
**意味**: 毎月一定額の料金体系  
**例**: サーバーレンタル、ソフトウェアライセンス  
**メリット**: コスト予測しやすい  
**デメリット**: 使わなくても課金

### TCO (Total Cost of Ownership)
**意味**: システム導入・運用・廃棄までの総コスト  
**含まれるもの**: 開発費、運用費、人件費、機会損失  
**営業重要性**: 初期費用だけでなく5年間のTCOで提案

---

## 🎪 営業・顧客対応で使える技術説明

### 「クラウドネイティブです」
**意味**: 最初からクラウド前提で設計  
**顧客メリット**: スケーラブル、災害に強い、最新技術  
**競合優位**: オンプレミス（古い）との差別化

### 「マイクロサービス対応」  
**意味**: 機能ごとに分割したシステム構成  
**顧客メリット**: 部分的更新可能、障害範囲限定  
**営業価値**: 段階的導入・コスト分散が可能

### 「REST APIで連携します」
**意味**: 業界標準の方法で他システムと接続  
**顧客メリット**: 既存システムを活かせる  
**技術的優位**: 独自仕様（ベンダーロックイン）回避

### 「フルマネージドサービス」
**意味**: インフラ管理をクラウド事業者が担当  
**顧客メリット**: 運用工数削減、専門知識不要  
**コスト説明**: 人件費削減でROI向上

---

## 🚨 よくある技術トラブルとビジネス影響

### サーバーダウン
**技術原因**: 負荷集中、メモリリーク、設定ミス  
**ビジネス影響**: 機会損失、信頼失墜  
**対策**: 冗長化、監視、自動復旧  
**SLA**: 99.9%稼働（月8.7時間停止許容）

### レスポンス遅延
**技術原因**: データベース負荷、ネットワーク遅延  
**ビジネス影響**: ユーザー離脱率増加  
**対策**: キャッシュ、CDN、データベース最適化  
**基準**: 3秒以上で離脱率50%増

### データ損失
**技術原因**: ストレージ障害、人的ミス、サイバー攻撃  
**ビジネス影響**: 信頼失墜、法的責任、事業継続困難  
**対策**: バックアップ、冗長化、アクセス制御  
**復旧時間**: RTO（目標復旧時間）、RPO（目標復旧ポイント）

---

## 📚 この用語集の使い方

### 🎯 営業シーンでの活用
1. **顧客との技術議論**で正確な用語使用
2. **開発チームとの橋渡し**で意思疎通
3. **競合他社との差別化**ポイント説明
4. **提案書作成**での技術的根拠

### 📖 継続学習のために
- 週に5つずつ新しい用語を覚える
- 実際のプロジェクトで使われている場面を観察
- 技術ブログ・ニュースで用語に慣れる
- エンジニアに「この用語の意味」を質問する習慣

**技術は手段、目的は顧客課題解決。用語を覚えて、より良い提案を！** 💪