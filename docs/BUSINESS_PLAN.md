# 歩みサポート 事業計画書
## （旧名：サポートドック）

## エグゼクティブサマリー

### プロダクト概要
**歩みサポート（Ayumi Support）** は、40代以上の障害福祉支援員を対象とした、シンプルで使いやすい面談記録自動化システムです。「録音→文字起こし→編集→帳票生成」の4ステップワークフローで、従来125分かかる書類作成を6分に短縮します。

### 市場機会
- **市場規模**: 障害福祉サービス事業所約3万施設（2024年）
- **ターゲット**: 40代以上の女性支援員（ITリテラシー低〜中）
- **課題**: 1回の面談記録作成に125分、書類業務が支援時間の30-40%を占める
- **解決価値**: 書類作成時間を95%短縮（125分→6分）、支援の質向上

### 事業モデル
- **SaaS型月額課金**: 利用者数に応じた従量課金制
- **初期費用**: 導入支援・研修パッケージ
- **年間売上予測**: 3年後5億円規模

---

## 現在の開発状況（2024年6月28日現在）

### ✅ 完成機能

#### 1. 簡素化された音声認識システム
- **OpenAI Whisper API**: 日本語音声の高精度文字変換
- **2時間長時間音声対応**: 大容量ファイル処理
- **対応音声形式**: MP3, WAV, M4A, AAC
- **最大ファイルサイズ**: 100MB
- **APIリトライ機能**: 安定した処理保証

#### 2. 4ステップ簡単ワークフロー
1. **🎤 音声アップロード**: ドラッグ&ドロップ対応
2. **📝 文字起こし確認・編集**: 結果の確認と修正
3. **📋 帳票選択・生成**: 必要な帳票を選択
4. **✅ ダウンロード**: PDF帳票の取得

#### 3. 5種類の帳票自動生成
- **個別支援計画書**: 障害福祉サービス特化
- **モニタリング記録表**: 定期評価記録
- **家族報告書**: 家族向け進捗報告
- **サービス提供実績記録**: 法定記録書類
- **アセスメントシート**: ICF準拠評価

#### 4. 40代以上向けユーザビリティ
- **大きなボタン**: 視認性重視のUI
- **明確な手順表示**: 迷わない4ステップ
- **即座のフィードバック**: 処理状況表示
- **最小限の選択肢**: 複雑さを排除

#### 5. セキュリティ・プライバシー対応
- **個人情報保護**: 音声ファイル24時間自動削除
- **法令準拠**: 個人情報保護法、障害者総合支援法対応
- **セキュリティ機能**: Rate Limiting、CORS、暗号化通信

#### 6. 機能簡素化完了
- **不要機能削除**: 精度測定、複雑なデータベース機能など
- **API数削減**: 20個→8個のエンドポイント
- **学習コスト最小化**: 直感的操作の実現

### 🔄 残りの開発課題

#### 1. 技術的課題
- **本番環境デプロイ**: AWS本番環境での動作確認
- **スケーラビリティ**: 複数施設同時利用対応
- **レスポンス最適化**: 大容量音声ファイル処理速度向上

#### 2. 事業化準備
- **料金体系確定**: 実証実験結果を踏まえた価格設定
- **カスタマーサクセス**: 導入支援・操作研修体制構築
- **マーケティング**: 障害福祉業界へのアプローチ戦略

---

## 事業計画の進化

### フェーズ1: MVP完成・実証実験（2024年7-9月）

#### 開発目標
- [x] **機能簡素化完了**: 4ステップワークフロー実装
- [x] **APIリトライ機能**: 安定した処理保証
- [ ] **AWS本番環境構築**: 明日デプロイ予定
- [ ] **パイロット事業所選定**: 3-5施設での実証実験
- [ ] **フィードバック収集**: 現場職員からの改善要望

#### 事業目標
- **実証事業所**: 3-5施設
- **利用者数**: 50-100名
- **書類作成時間短縮**: 95%（125分→6分）
- **ユーザー満足度**: 4.5/5.0以上（40代以上職員対象）

#### 投資計画
- **開発費**: 500万円
- **インフラ費**: 50万円/月
- **実証支援費**: 200万円

### フェーズ2: 商用化・市場投入（2024年10月-2025年3月）

#### 機能拡張
- **マルチテナント対応**: 複数事業所管理
- **ダッシュボード機能**: 利用状況・効果測定
- **カスタマイズ機能**: 事業所別テンプレート
- **API拡張**: 既存システム連携

#### 事業目標
- **契約事業所**: 30施設
- **月額売上**: 300万円
- **利用者数**: 1,000名
- **チャーンレート**: 5%以下

#### 料金体系
```
スタータープラン: 月額50,000円（利用者50名まで）
スタンダードプラン: 月額100,000円（利用者100名まで）
エンタープライズプラン: 月額200,000円（利用者無制限）
```

### フェーズ3: スケーリング・機能拡張（2025年4月-2026年3月）

#### 新機能開発
- **予測分析機能**: 支援効果予測、リスク早期発見
- **音声リアルタイム文字起こし**: ライブ面談記録
- **モバイルアプリ**: 現場での記録作成
- **他福祉分野展開**: 高齢者介護、児童発達支援

#### 事業目標
- **契約事業所**: 200施設
- **年間売上**: 3億円
- **利用者数**: 10,000名
- **市場シェア**: 障害福祉分野5%

### フェーズ4: 事業拡大・IPO準備（2026年4月-2027年3月）

#### 事業領域拡張
- **海外展開**: アジア圏での展開検討
- **AI技術ライセンス**: 他社への技術提供
- **コンサルティング事業**: DX支援サービス
- **研究機関連携**: 学術研究・エビデンス蓄積

#### 事業目標
- **年間売上**: 10億円
- **利用者数**: 50,000名
- **従業員数**: 100名
- **IPO検討**: 東証グロース市場

---

## 競合分析・差別化戦略

### 競合状況
1. **既存システム**: 記録支援システム各社（手入力ベース）
2. **汎用音声認識**: Google、Microsoft（業界特化なし）
3. **介護記録システム**: 高齢者介護特化（障害福祉は未対応）

### 差別化ポイント
1. **40代以上ターゲット**: ITリテラシー低〜中の職員向け最適化
2. **4ステップ簡素化**: 録音→文字起こし→編集→帳票の直感的フロー
3. **95%時間短縮**: 125分→6分の圧倒的効率化
4. **障害福祉特化**: ICF準拠のアセスメント項目・法令準拠
5. **2時間音声対応**: 長時間面談にも対応

---

## リスク分析・対策

### 技術リスク
| リスク | 影響度 | 対策 |
|--------|--------|------|
| AI精度不足 | 高 | 学習データ蓄積、ファインチューニング |
| インフラ障害 | 中 | AWS冗長化、バックアップ体制 |
| セキュリティ侵害 | 高 | 多層防御、定期監査 |

### 事業リスク
| リスク | 影響度 | 対策 |
|--------|--------|------|
| 法令改正 | 中 | 継続的な法令監視、専門家顧問 |
| 競合参入 | 中 | 特許出願、技術優位性維持 |
| 市場縮小 | 低 | 関連領域への展開準備 |

### 財務リスク
| リスク | 影響度 | 対策 |
|--------|--------|------|
| 開発費超過 | 中 | アジャイル開発、段階的投資 |
| 顧客獲得遅延 | 高 | 実証実験での効果実証 |
| 価格競争 | 中 | 付加価値向上、顧客囲い込み |

---

## 組織・人材戦略

### 現在の体制
- **開発**: 1名（技術責任者兼務）
- **事業**: 1名（事業責任者）

### 採用計画

#### フェーズ1（2024年7-9月）
- **フロントエンドエンジニア**: 1名
- **AIエンジニア**: 1名
- **営業担当**: 1名

#### フェーズ2（2024年10月-2025年3月）
- **バックエンドエンジニア**: 2名
- **カスタマーサクセス**: 2名
- **品質保証**: 1名

#### フェーズ3以降
- **プロダクトマネージャー**: 2名
- **データサイエンティスト**: 2名
- **セールス**: 5名
- **カスタマーサポート**: 3名

---

## 資金調達計画

### シード資金（2024年7月）
- **調達目標**: 3,000万円
- **用途**: 開発・実証実験・初期営業
- **投資家**: エンジェル、シードVC

### シリーズA（2025年4月）
- **調達目標**: 1億円
- **用途**: チーム拡大・マーケティング・システム増強
- **投資家**: VC、戦略的投資家

### シリーズB（2026年4月）
- **調達目標**: 5億円
- **用途**: 事業拡大・海外展開・新規事業
- **投資家**: 大手VC、事業会社

---

## KPI・成功指標

### 製品KPI
- **音声認識精度**: 95%以上
- **処理時間**: 6分以内/件（2時間音声対応）
- **システム稼働率**: 99.9%以上
- **40代以上職員の操作成功率**: 95%以上

### 事業KPI
- **月間契約数**: 前月比10%成長
- **利用者あたり単価**: 5,000円/月
- **顧客満足度**: 4.5/5.0以上
- **解約率**: 3%以下/月

### 効果測定KPI
- **書類作成時間短縮**: 95%（125分→6分）
- **記録品質向上**: 主観評価4.5以上
- **支援時間増加**: 50%以上
- **40代以上職員満足度**: 4.5以上

---

## 今後の検討事項・意思決定ポイント

### 短期（3ヶ月以内）
1. **実証実験パートナーの選定基準**
2. **価格設定の市場妥当性検証**
3. **競合対応戦略の具体化**
4. **技術的負債の解消優先順位**

### 中期（6ヶ月-1年）
1. **事業領域拡張の方向性（高齢者介護 vs 児童発達支援）**
2. **SaaS vs BPO事業モデルの選択**
3. **オンプレミス vs クラウド提供方式**
4. **AI技術の内製化 vs API依存継続**

### 長期（1-3年）
1. **IPO vs M&A戦略選択**
2. **海外展開の地域・タイミング**
3. **新規技術投資分野（VR/AR、IoT等）**
4. **社会保障システム全体への展開可能性**

---

## 結論・ネクストアクション

### 開発状況総括
歩みサポートは、40代以上の障害福祉支援員の書類業務を95%効率化する明確な価値提案を持つプロダクトとして、MVP段階が完成しています。機能簡素化により「録音→文字起こし→編集→帳票生成」の4ステップワークフローを実現し、ITリテラシーが低〜中程度の職員でも迷わず使える操作性を確立しました。

### 優先実行項目
1. **AWS本番環境構築**（明日デプロイ完了）
2. **ピッチ資料・サービス説明資料作成**（今回作成）
3. **実証実験パートナー獲得**（1ヶ月以内）  
4. **40代以上職員へのユーザビリティテスト**（2ヶ月継続）
5. **資金調達準備**（2ヶ月以内）

## 🎯 ピッチ資料向けキーメッセージ

### 1分ピッチ
**「125分の書類作成を6分に短縮。40代以上の障害福祉支援員が迷わず使える、4ステップ音声記録システム『歩みサポート』」**

### 3つの強み
1. **95%時間短縮**: 従来125分→6分の圧倒的効率化
2. **40代特化UI**: ITリテラシー低〜中でも迷わない操作性
3. **障害福祉専門**: ICF準拠・法令対応の専門帳票自動生成

### 投資価値
- **市場規模**: 3万施設×平均10名職員＝30万人のターゲット市場
- **単価**: 月額5,000円/職員×継続率97%の安定収益
- **成長性**: 高齢者介護・児童発達支援への横展開可能