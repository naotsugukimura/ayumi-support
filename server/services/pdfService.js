const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

class PDFService {
  constructor() {
    this.outputDir = path.join(__dirname, '../../generated');
    this.ensureOutputDirectory();
  }

  /**
   * 出力ディレクトリの確保
   */
  ensureOutputDirectory() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * サービス提供実績記録表のPDF生成
   */
  async generateServiceRecord(data) {
    const html = this.buildServiceRecordHTML(data);
    const filename = `service_record_${Date.now()}.pdf`;
    const outputPath = path.join(this.outputDir, filename);

    await this.generatePDF(html, outputPath);
    return { path: outputPath, filename };
  }

  /**
   * 面談記録のPDF生成
   */
  async generateInterviewRecord(data) {
    const html = this.buildInterviewRecordHTML(data);
    const filename = `interview_record_${Date.now()}.pdf`;
    const outputPath = path.join(this.outputDir, filename);

    await this.generatePDF(html, outputPath);
    return { path: outputPath, filename };
  }

  /**
   * 個別支援計画書のPDF生成
   */
  async generateIndividualSupportPlan(data) {
    const html = this.buildIndividualSupportPlanHTML(data);
    const filename = `individual_support_plan_${Date.now()}.pdf`;
    const outputPath = path.join(this.outputDir, filename);

    await this.generatePDF(html, outputPath);
    return { path: outputPath, filename };
  }

  /**
   * アセスメント表のPDF生成
   */
  async generateAssessmentSheet(data) {
    const html = this.buildAssessmentSheetHTML(data);
    const filename = `assessment_sheet_${Date.now()}.pdf`;
    const outputPath = path.join(this.outputDir, filename);

    await this.generatePDF(html, outputPath);
    return { path: outputPath, filename };
  }

  /**
   * モニタリング記録表のPDF生成
   */
  async generateMonitoringRecord(data) {
    const html = this.buildMonitoringRecordHTML(data);
    const filename = `monitoring_record_${Date.now()}.pdf`;
    const outputPath = path.join(this.outputDir, filename);

    await this.generatePDF(html, outputPath);
    return { path: outputPath, filename };
  }

  /**
   * HTML→PDF変換の共通メソッド
   */
  async generatePDF(html, outputPath) {
    let browser;
    try {
      browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor'
        ],
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined
      });

      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      await page.pdf({
        path: outputPath,
        format: 'A4',
        margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
        printBackground: true
      });

      console.log(`📄 PDF生成完了: ${outputPath}`);
    } catch (error) {
      console.error('PDF生成エラー:', error);
      throw new Error(`PDF生成に失敗しました: ${error.message}`);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * サービス提供実績記録表のHTML構築
   */
  buildServiceRecordHTML(data) {
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;

    return `
    <!DOCTYPE html>
    <html lang="ja">
    <head>
      <meta charset="UTF-8">
      <title>サービス提供実績記録表</title>
      <style>
        body {
          font-family: 'Noto Sans CJK JP', 'Yu Gothic', sans-serif;
          font-size: 11pt;
          line-height: 1.4;
          color: #333;
          margin: 0;
          padding: 20px;
        }
        .header {
          text-align: center;
          margin-bottom: 20px;
          border-bottom: 2px solid #333;
          padding-bottom: 10px;
        }
        .header h1 {
          margin: 0;
          font-size: 18pt;
          font-weight: bold;
        }
        .basic-info {
          margin-bottom: 20px;
          border: 1px solid #333;
          padding: 10px;
        }
        .basic-info table {
          width: 100%;
          border-collapse: collapse;
        }
        .basic-info td {
          padding: 8px;
          border: 1px solid #666;
          vertical-align: top;
        }
        .basic-info .label {
          background-color: #f5f5f5;
          font-weight: bold;
          width: 120px;
        }
        .service-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        .service-table th,
        .service-table td {
          border: 1px solid #333;
          padding: 8px;
          text-align: center;
          vertical-align: middle;
        }
        .service-table th {
          background-color: #f0f0f0;
          font-weight: bold;
          font-size: 10pt;
        }
        .service-table .content-col {
          text-align: left;
        }
        .summary {
          margin-top: 20px;
          border: 1px solid #333;
          padding: 10px;
        }
        .summary table {
          width: 100%;
          border-collapse: collapse;
        }
        .summary td {
          padding: 8px;
          border: 1px solid #666;
          vertical-align: top;
        }
        .summary .label {
          background-color: #f5f5f5;
          font-weight: bold;
          width: 120px;
        }
        .signature-area {
          margin-top: 30px;
          display: flex;
          justify-content: space-between;
        }
        .signature-box {
          border: 1px solid #333;
          padding: 15px;
          width: 45%;
          min-height: 80px;
        }
        .signature-box h4 {
          margin: 0 0 10px 0;
          font-size: 12pt;
          border-bottom: 1px solid #666;
          padding-bottom: 5px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>サービス提供実績記録表</h1>
      </div>

      <div class="basic-info">
        <table>
          <tr>
            <td class="label">事業所名</td>
            <td>${data.facilityName || '○○事業所'}</td>
            <td class="label">提供年月</td>
            <td>${year}年${month}月</td>
          </tr>
          <tr>
            <td class="label">利用者氏名</td>
            <td>${data.userName || '利用者名'}</td>
            <td class="label">受給者証番号</td>
            <td>${data.recipientNumber || 'REC-2024-001'}</td>
          </tr>
          <tr>
            <td class="label">サービス種別</td>
            <td colspan="3">${data.serviceType || '就労移行支援'}</td>
          </tr>
        </table>
      </div>

      <table class="service-table">
        <thead>
          <tr>
            <th style="width: 80px;">日付</th>
            <th style="width: 70px;">開始時刻</th>
            <th style="width: 70px;">終了時刻</th>
            <th>サービス内容</th>
            <th style="width: 100px;">職員氏名</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>${this.formatDate(new Date())}</td>
            <td>09:00</td>
            <td>16:00</td>
            <td class="content-col">${data.serviceContent || '面談・支援活動'}</td>
            <td>${data.staffName || '支援員'}</td>
          </tr>
          ${this.generateEmptyRows(15)}
        </tbody>
      </table>

      <div class="summary">
        <table>
          <tr>
            <td class="label">月間利用日数</td>
            <td>1日</td>
            <td class="label">月間利用時間</td>
            <td>7時間</td>
          </tr>
          <tr>
            <td class="label">特記事項</td>
            <td colspan="3" style="min-height: 60px;">
              ${data.notes || '面談を実施し、利用者の状況を確認しました。'}
            </td>
          </tr>
        </table>
      </div>

      <div class="signature-area">
        <div class="signature-box">
          <h4>利用者確認</h4>
          <p>署名: ________________________</p>
          <p>確認日: ${this.formatDate(new Date())}</p>
        </div>
        <div class="signature-box">
          <h4>事業所確認</h4>
          <p>署名: ________________________</p>
          <p>確認日: ${this.formatDate(new Date())}</p>
        </div>
      </div>
    </body>
    </html>`;
  }

  /**
   * 面談記録のHTML構築
   */
  buildInterviewRecordHTML(data) {
    return `
    <!DOCTYPE html>
    <html lang="ja">
    <head>
      <meta charset="UTF-8">
      <title>面談記録</title>
      <style>
        body {
          font-family: 'Noto Sans CJK JP', 'Yu Gothic', sans-serif;
          font-size: 11pt;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 20px;
        }
        .header {
          text-align: center;
          margin-bottom: 20px;
          border-bottom: 2px solid #333;
          padding-bottom: 10px;
        }
        .header h1 {
          margin: 0;
          font-size: 18pt;
          font-weight: bold;
        }
        .info-section {
          margin-bottom: 20px;
          border: 1px solid #333;
          padding: 15px;
        }
        .info-section table {
          width: 100%;
          border-collapse: collapse;
        }
        .info-section td {
          padding: 8px;
          border: 1px solid #666;
          vertical-align: top;
        }
        .info-section .label {
          background-color: #f5f5f5;
          font-weight: bold;
          width: 120px;
        }
        .content-section {
          margin-bottom: 20px;
          border: 1px solid #333;
          padding: 15px;
        }
        .content-section h3 {
          margin: 0 0 10px 0;
          font-size: 14pt;
          font-weight: bold;
          color: #333;
          border-bottom: 1px solid #666;
          padding-bottom: 5px;
        }
        .content-section p {
          margin: 0 0 10px 0;
          text-align: justify;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>面談記録</h1>
      </div>

      <div class="info-section">
        <table>
          <tr>
            <td class="label">実施日</td>
            <td>${this.formatDate(new Date())}</td>
            <td class="label">面談種別</td>
            <td>個別面談</td>
          </tr>
          <tr>
            <td class="label">利用者</td>
            <td>${data.userName || '利用者名'}</td>
            <td class="label">支援員</td>
            <td>${data.staffName || '支援員'}</td>
          </tr>
          <tr>
            <td class="label">実施場所</td>
            <td>事業所内</td>
            <td class="label">実施時間</td>
            <td>30分</td>
          </tr>
        </table>
      </div>

      <div class="content-section">
        <h3>面談内容</h3>
        <p>${data.transcriptionText || '音声認識結果がここに表示されます。'}</p>
      </div>

      <div class="content-section">
        <h3>利用者の様子</h3>
        <p>利用者は落ち着いた様子で面談に参加されました。質問に対して適切に回答され、積極的な姿勢が見られました。</p>
      </div>

      <div class="content-section">
        <h3>支援内容・結果</h3>
        <p>個別支援計画に基づき、就労に向けた準備状況について確認を行いました。現在の課題と今後の目標について話し合いました。</p>
      </div>

      <div class="content-section">
        <h3>今後の方針</h3>
        <p>次回面談では、職業体験の振り返りを実施予定です。引き続き就労に向けた支援を継続していきます。</p>
      </div>
    </body>
    </html>`;
  }

  /**
   * 日付フォーマット
   */
  formatDate(date) {
    const d = new Date(date);
    return `${d.getFullYear()}年${(d.getMonth() + 1).toString().padStart(2, '0')}月${d.getDate().toString().padStart(2, '0')}日`;
  }

  /**
   * 個別支援計画書のHTML構築
   */
  buildIndividualSupportPlanHTML(data) {
    return `
    <!DOCTYPE html>
    <html lang="ja">
    <head>
      <meta charset="UTF-8">
      <title>個別支援計画書</title>
      <style>
        body {
          font-family: 'Noto Sans CJK JP', 'Yu Gothic', sans-serif;
          font-size: 10pt;
          line-height: 1.4;
          color: #333;
          margin: 0;
          padding: 15px;
        }
        .header {
          text-align: center;
          margin-bottom: 20px;
          border-bottom: 2px solid #333;
          padding-bottom: 10px;
        }
        .header h1 {
          margin: 0;
          font-size: 18pt;
          font-weight: bold;
        }
        .basic-info {
          margin-bottom: 15px;
          border: 1px solid #333;
          padding: 10px;
        }
        .basic-info table {
          width: 100%;
          border-collapse: collapse;
        }
        .basic-info td {
          padding: 6px;
          border: 1px solid #666;
          vertical-align: top;
        }
        .basic-info .label {
          background-color: #f5f5f5;
          font-weight: bold;
          width: 100px;
          font-size: 9pt;
        }
        .section {
          margin-bottom: 15px;
          border: 1px solid #333;
          padding: 10px;
          page-break-inside: avoid;
        }
        .section h3 {
          margin: 0 0 10px 0;
          font-size: 12pt;
          font-weight: bold;
          color: #333;
          border-bottom: 1px solid #666;
          padding-bottom: 3px;
        }
        .goals-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 10px;
        }
        .goals-table th,
        .goals-table td {
          border: 1px solid #333;
          padding: 8px;
          text-align: left;
          vertical-align: top;
          font-size: 9pt;
        }
        .goals-table th {
          background-color: #f0f0f0;
          font-weight: bold;
          text-align: center;
        }
        .goals-table .goal-col {
          width: 25%;
        }
        .goals-table .method-col {
          width: 30%;
        }
        .goals-table .period-col {
          width: 15%;
        }
        .goals-table .staff-col {
          width: 15%;
        }
        .goals-table .eval-col {
          width: 15%;
        }
        .signature-area {
          margin-top: 20px;
          display: flex;
          justify-content: space-between;
          page-break-inside: avoid;
        }
        .signature-box {
          border: 1px solid #333;
          padding: 10px;
          width: 48%;
          min-height: 60px;
        }
        .signature-box h4 {
          margin: 0 0 8px 0;
          font-size: 11pt;
          border-bottom: 1px solid #666;
          padding-bottom: 3px;
        }
        .multi-line {
          min-height: 40px;
          vertical-align: top;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>個別支援計画書</h1>
      </div>

      <div class="basic-info">
        <table>
          <tr>
            <td class="label">利用者氏名</td>
            <td>${data.userName || ''}</td>
            <td class="label">生年月日</td>
            <td>${data.birthDate || ''}</td>
            <td class="label">性別</td>
            <td>${data.gender || ''}</td>
          </tr>
          <tr>
            <td class="label">障害名</td>
            <td>${data.disabilityType || ''}</td>
            <td class="label">障害等級</td>
            <td>${data.disabilityGrade || ''}</td>
            <td class="label">受給者証番号</td>
            <td>${data.recipientNumber || ''}</td>
          </tr>
          <tr>
            <td class="label">計画作成日</td>
            <td>${this.formatDate(new Date())}</td>
            <td class="label">計画期間</td>
            <td>${data.planPeriod || '6ヶ月'}</td>
            <td class="label">作成者</td>
            <td>${data.creator || ''}</td>
          </tr>
        </table>
      </div>

      <div class="section">
        <h3>1. 利用者の現在の状況・ニーズ</h3>
        <p style="min-height: 60px; border: 1px solid #ccc; padding: 8px; margin: 0;">
          ${data.currentSituation || ''}
        </p>
      </div>

      <div class="section">
        <h3>2. 本人・家族の意向・希望</h3>
        <p style="min-height: 60px; border: 1px solid #ccc; padding: 8px; margin: 0;">
          ${data.userIntention || ''}
        </p>
      </div>

      <div class="section">
        <h3>3. 就労に関する課題・配慮事項</h3>
        <p style="min-height: 60px; border: 1px solid #ccc; padding: 8px; margin: 0;">
          ${data.workChallenges || ''}
        </p>
      </div>

      <div class="section">
        <h3>4. 長期目標（就労目標）</h3>
        <p style="min-height: 40px; border: 1px solid #ccc; padding: 8px; margin: 0;">
          ${data.longTermGoal || ''}
        </p>
      </div>

      <div class="section">
        <h3>5. 短期目標・支援内容</h3>
        <table class="goals-table">
          <thead>
            <tr>
              <th class="goal-col">短期目標</th>
              <th class="method-col">支援内容・方法</th>
              <th class="period-col">支援期間</th>
              <th class="staff-col">担当職員</th>
              <th class="eval-col">評価方法</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="multi-line">${data.shortTermGoal1 || '基本的な作業スキルの向上'}</td>
              <td class="multi-line">${data.supportMethod1 || '段階的な作業訓練・個別指導'}</td>
              <td>${data.supportPeriod1 || '3ヶ月'}</td>
              <td>${data.staffInCharge1 || '職業指導員'}</td>
              <td class="multi-line">${data.evaluation1 || '作業成果・品質の定期評価'}</td>
            </tr>
            <tr>
              <td class="multi-line">${data.shortTermGoal2 || '対人コミュニケーション能力の改善'}</td>
              <td class="multi-line">${data.supportMethod2 || 'SST・グループワーク・ロールプレイ'}</td>
              <td>${data.supportPeriod2 || '3ヶ月'}</td>
              <td>${data.staffInCharge2 || '生活支援員'}</td>
              <td class="multi-line">${data.evaluation2 || '面談・行動観察・同僚評価'}</td>
            </tr>
            <tr>
              <td class="multi-line">${data.shortTermGoal3 || '職場適応力の向上'}</td>
              <td class="multi-line">${data.supportMethod3 || '職場体験・実習・環境調整'}</td>
              <td>${data.supportPeriod3 || '6ヶ月'}</td>
              <td>${data.staffInCharge3 || '就労支援員'}</td>
              <td class="multi-line">${data.evaluation3 || '実習先評価・継続性確認'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="section">
        <h3>6. 留意事項・合理的配慮</h3>
        <p style="min-height: 50px; border: 1px solid #ccc; padding: 8px; margin: 0;">
          ${data.considerations || ''}
        </p>
      </div>

      <div class="section">
        <h3>7. 関係機関との連携</h3>
        <p style="min-height: 40px; border: 1px solid #ccc; padding: 8px; margin: 0;">
          ${data.institutionCooperation || ''}
        </p>
      </div>

      <div class="section">
        <h3>8. モニタリング・評価計画</h3>
        <p style="min-height: 40px; border: 1px solid #ccc; padding: 8px; margin: 0;">
          ${data.monitoringPlan || '月1回の面談にて目標達成状況を確認し、必要に応じて計画を見直す'}
        </p>
      </div>

      <div class="signature-area">
        <div class="signature-box">
          <h4>利用者・家族同意</h4>
          <p>利用者署名: ____________________</p>
          <p>家族署名: ______________________</p>
          <p>同意日: ${this.formatDate(new Date())}</p>
        </div>
        <div class="signature-box">
          <h4>事業所確認</h4>
          <p>責任者署名: ____________________</p>
          <p>作成者署名: ____________________</p>
          <p>作成日: ${this.formatDate(new Date())}</p>
        </div>
      </div>
    </body>
    </html>`;
  }

  /**
   * アセスメント表のHTML構築
   */
  buildAssessmentSheetHTML(data) {
    return `
    <!DOCTYPE html>
    <html lang="ja">
    <head>
      <meta charset="UTF-8">
      <title>アセスメント表</title>
      <style>
        body {
          font-family: 'Noto Sans CJK JP', 'Yu Gothic', sans-serif;
          font-size: 10pt;
          line-height: 1.3;
          color: #333;
          margin: 0;
          padding: 15px;
        }
        .header {
          text-align: center;
          margin-bottom: 20px;
          border-bottom: 2px solid #333;
          padding-bottom: 10px;
        }
        .header h1 {
          margin: 0;
          font-size: 18pt;
          font-weight: bold;
        }
        .basic-info {
          margin-bottom: 15px;
          border: 1px solid #333;
          padding: 10px;
        }
        .basic-info table {
          width: 100%;
          border-collapse: collapse;
        }
        .basic-info td {
          padding: 6px;
          border: 1px solid #666;
          vertical-align: top;
        }
        .basic-info .label {
          background-color: #f5f5f5;
          font-weight: bold;
          width: 100px;
          font-size: 9pt;
        }
        .assessment-section {
          margin-bottom: 15px;
          border: 1px solid #333;
          padding: 10px;
          page-break-inside: avoid;
        }
        .assessment-section h3 {
          margin: 0 0 10px 0;
          font-size: 12pt;
          font-weight: bold;
          color: #333;
          border-bottom: 1px solid #666;
          padding-bottom: 3px;
        }
        .assessment-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 10px;
        }
        .assessment-table th,
        .assessment-table td {
          border: 1px solid #333;
          padding: 6px;
          text-align: left;
          vertical-align: top;
          font-size: 9pt;
        }
        .assessment-table th {
          background-color: #f0f0f0;
          font-weight: bold;
          text-align: center;
          width: 25%;
        }
        .assessment-table .item-col {
          width: 30%;
        }
        .assessment-table .level-col {
          width: 15%;
          text-align: center;
        }
        .assessment-table .comment-col {
          width: 40%;
        }
        .level-scale {
          font-size: 8pt;
          color: #666;
          margin-bottom: 5px;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>アセスメント表</h1>
      </div>

      <div class="basic-info">
        <table>
          <tr>
            <td class="label">利用者氏名</td>
            <td>${data.userName || ''}</td>
            <td class="label">実施日</td>
            <td>${this.formatDate(new Date())}</td>
            <td class="label">実施者</td>
            <td>${data.assessor || ''}</td>
          </tr>
          <tr>
            <td class="label">障害名</td>
            <td>${data.disabilityType || ''}</td>
            <td class="label">年齢</td>
            <td>${data.age || ''}</td>
            <td class="label">面接回数</td>
            <td>${data.interviewCount || '1'}回目</td>
          </tr>
        </table>
      </div>

      <div class="level-scale">
        評価スケール: 1=支援が大幅に必要　2=支援が必要　3=一部支援が必要　4=概ね自立　5=完全に自立
      </div>

      <div class="assessment-section">
        <h3>1. 職業準備性</h3>
        <table class="assessment-table">
          <thead>
            <tr>
              <th>項目</th>
              <th>評価</th>
              <th>コメント・特記事項</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>出勤・通勤</td>
              <td class="level-col">${data.work_attendance || ''}</td>
              <td>${data.work_attendance_comment || ''}</td>
            </tr>
            <tr>
              <td>生活リズム</td>
              <td class="level-col">${data.life_rhythm || ''}</td>
              <td>${data.life_rhythm_comment || ''}</td>
            </tr>
            <tr>
              <td>体調管理</td>
              <td class="level-col">${data.health_management || ''}</td>
              <td>${data.health_management_comment || ''}</td>
            </tr>
            <tr>
              <td>服薬管理</td>
              <td class="level-col">${data.medication_management || ''}</td>
              <td>${data.medication_management_comment || ''}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="assessment-section">
        <h3>2. 作業遂行能力</h3>
        <table class="assessment-table">
          <thead>
            <tr>
              <th>項目</th>
              <th>評価</th>
              <th>コメント・特記事項</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>作業理解力</td>
              <td class="level-col">${data.task_understanding || ''}</td>
              <td>${data.task_understanding_comment || ''}</td>
            </tr>
            <tr>
              <td>作業持続力</td>
              <td class="level-col">${data.work_endurance || ''}</td>
              <td>${data.work_endurance_comment || ''}</td>
            </tr>
            <tr>
              <td>作業正確性</td>
              <td class="level-col">${data.work_accuracy || ''}</td>
              <td>${data.work_accuracy_comment || ''}</td>
            </tr>
            <tr>
              <td>作業速度</td>
              <td class="level-col">${data.work_speed || ''}</td>
              <td>${data.work_speed_comment || ''}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="assessment-section">
        <h3>3. コミュニケーション・対人技能</h3>
        <table class="assessment-table">
          <thead>
            <tr>
              <th>項目</th>
              <th>評価</th>
              <th>コメント・特記事項</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>指示・助言の理解</td>
              <td class="level-col">${data.instruction_understanding || ''}</td>
              <td>${data.instruction_understanding_comment || ''}</td>
            </tr>
            <tr>
              <td>報告・連絡・相談</td>
              <td class="level-col">${data.report_consultation || ''}</td>
              <td>${data.report_consultation_comment || ''}</td>
            </tr>
            <tr>
              <td>職場での対人関係</td>
              <td class="level-col">${data.workplace_relationship || ''}</td>
              <td>${data.workplace_relationship_comment || ''}</td>
            </tr>
            <tr>
              <td>チームワーク</td>
              <td class="level-col">${data.teamwork || ''}</td>
              <td>${data.teamwork_comment || ''}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="assessment-section">
        <h3>4. 問題解決・適応能力</h3>
        <table class="assessment-table">
          <thead>
            <tr>
              <th>項目</th>
              <th>評価</th>
              <th>コメント・特記事項</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>問題認識・対処</td>
              <td class="level-col">${data.problem_solving || ''}</td>
              <td>${data.problem_solving_comment || ''}</td>
            </tr>
            <tr>
              <td>環境変化への適応</td>
              <td class="level-col">${data.environmental_adaptation || ''}</td>
              <td>${data.environmental_adaptation_comment || ''}</td>
            </tr>
            <tr>
              <td>ストレス対処</td>
              <td class="level-col">${data.stress_management || ''}</td>
              <td>${data.stress_management_comment || ''}</td>
            </tr>
            <tr>
              <td>学習・成長意欲</td>
              <td class="level-col">${data.learning_motivation || ''}</td>
              <td>${data.learning_motivation_comment || ''}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="assessment-section">
        <h3>5. 総合所見</h3>
        <p style="min-height: 80px; border: 1px solid #ccc; padding: 8px; margin: 0;">
          ${data.overall_assessment || ''}
        </p>
      </div>

      <div class="assessment-section">
        <h3>6. 支援の優先度・方向性</h3>
        <p style="min-height: 60px; border: 1px solid #ccc; padding: 8px; margin: 0;">
          ${data.support_priority || ''}
        </p>
      </div>
    </body>
    </html>`;
  }

  /**
   * モニタリング記録表のHTML構築
   */
  buildMonitoringRecordHTML(data) {
    return `
    <!DOCTYPE html>
    <html lang="ja">
    <head>
      <meta charset="UTF-8">
      <title>モニタリング記録表</title>
      <style>
        body {
          font-family: 'Noto Sans CJK JP', 'Yu Gothic', sans-serif;
          font-size: 11pt;
          line-height: 1.4;
          color: #333;
          margin: 0;
          padding: 15px;
        }
        .header {
          text-align: center;
          margin-bottom: 20px;
          border-bottom: 2px solid #333;
          padding-bottom: 10px;
        }
        .header h1 {
          margin: 0;
          font-size: 18pt;
          font-weight: bold;
        }
        .basic-info {
          margin-bottom: 15px;
          border: 1px solid #333;
          padding: 10px;
        }
        .basic-info table {
          width: 100%;
          border-collapse: collapse;
        }
        .basic-info td {
          padding: 6px;
          border: 1px solid #666;
          vertical-align: top;
        }
        .basic-info .label {
          background-color: #f5f5f5;
          font-weight: bold;
          width: 100px;
          font-size: 10pt;
        }
        .monitoring-section {
          margin-bottom: 15px;
          border: 1px solid #333;
          padding: 10px;
          page-break-inside: avoid;
        }
        .monitoring-section h3 {
          margin: 0 0 10px 0;
          font-size: 12pt;
          font-weight: bold;
          color: #333;
          border-bottom: 1px solid #666;
          padding-bottom: 3px;
        }
        .progress-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 10px;
        }
        .progress-table th,
        .progress-table td {
          border: 1px solid #333;
          padding: 8px;
          text-align: left;
          vertical-align: top;
          font-size: 10pt;
        }
        .progress-table th {
          background-color: #f0f0f0;
          font-weight: bold;
          text-align: center;
        }
        .progress-table .goal-col {
          width: 30%;
        }
        .progress-table .progress-col {
          width: 25%;
        }
        .progress-table .achievement-col {
          width: 20%;
        }
        .progress-table .issues-col {
          width: 25%;
        }
        .achievement-level {
          text-align: center;
          font-weight: bold;
        }
        .achieved { color: #0066cc; }
        .partial { color: #ff9900; }
        .not-achieved { color: #cc0000; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>モニタリング記録表</h1>
      </div>

      <div class="basic-info">
        <table>
          <tr>
            <td class="label">利用者氏名</td>
            <td>${data.userName || ''}</td>
            <td class="label">実施日</td>
            <td>${this.formatDate(new Date())}</td>
            <td class="label">担当者</td>
            <td>${data.monitor || ''}</td>
          </tr>
          <tr>
            <td class="label">計画期間</td>
            <td>${data.planPeriod || ''}</td>
            <td class="label">モニタリング回数</td>
            <td>${data.monitoringCount || '1'}回目</td>
            <td class="label">次回予定</td>
            <td>${data.nextSchedule || ''}</td>
          </tr>
        </table>
      </div>

      <div class="monitoring-section">
        <h3>1. 目標達成状況</h3>
        <table class="progress-table">
          <thead>
            <tr>
              <th class="goal-col">目標</th>
              <th class="progress-col">進捗状況</th>
              <th class="achievement-col">達成度</th>
              <th class="issues-col">課題・問題点</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${data.goal1 || ''}</td>
              <td>${data.progress1 || ''}</td>
              <td class="achievement-level ${this.getAchievementClass(data.achievement1)}">${data.achievement1 || ''}</td>
              <td>${data.issues1 || ''}</td>
            </tr>
            <tr>
              <td>${data.goal2 || ''}</td>
              <td>${data.progress2 || ''}</td>
              <td class="achievement-level ${this.getAchievementClass(data.achievement2)}">${data.achievement2 || ''}</td>
              <td>${data.issues2 || ''}</td>
            </tr>
            <tr>
              <td>${data.goal3 || ''}</td>
              <td>${data.progress3 || ''}</td>
              <td class="achievement-level ${this.getAchievementClass(data.achievement3)}">${data.achievement3 || ''}</td>
              <td>${data.issues3 || ''}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="monitoring-section">
        <h3>2. 利用者の変化・成長</h3>
        <p style="min-height: 60px; border: 1px solid #ccc; padding: 8px; margin: 0;">
          ${data.userChanges || ''}
        </p>
      </div>

      <div class="monitoring-section">
        <h3>3. 支援内容の評価</h3>
        <p style="min-height: 60px; border: 1px solid #ccc; padding: 8px; margin: 0;">
          ${data.supportEvaluation || ''}
        </p>
      </div>

      <div class="monitoring-section">
        <h3>4. 今後の支援方針</h3>
        <p style="min-height: 60px; border: 1px solid #ccc; padding: 8px; margin: 0;">
          ${data.futureSupport || ''}
        </p>
      </div>

      <div class="monitoring-section">
        <h3>5. 計画の修正・変更</h3>
        <div>
          <p><strong>修正の必要性:</strong> 
            <input type="checkbox" ${data.needsRevision ? 'checked' : ''}> あり　
            <input type="checkbox" ${!data.needsRevision ? 'checked' : ''}> なし
          </p>
          <p style="min-height: 50px; border: 1px solid #ccc; padding: 8px; margin: 5px 0;">
            <strong>修正内容:</strong><br>
            ${data.revisionContent || ''}
          </p>
        </div>
      </div>

      <div class="monitoring-section">
        <h3>6. 関係者からの意見</h3>
        <p style="min-height: 50px; border: 1px solid #ccc; padding: 8px; margin: 0;">
          ${data.stakeholderOpinions || ''}
        </p>
      </div>
    </body>
    </html>`;
  }

  /**
   * 達成度に応じたCSSクラス取得
   */
  getAchievementClass(achievement) {
    if (!achievement) return '';
    const level = achievement.toString().toLowerCase();
    if (level.includes('達成') || level.includes('100%') || level.includes('○')) {
      return 'achieved';
    } else if (level.includes('一部') || level.includes('50%') || level.includes('△')) {
      return 'partial';
    } else if (level.includes('未達成') || level.includes('0%') || level.includes('×')) {
      return 'not-achieved';
    }
    return '';
  }

  /**
   * 空行生成
   */
  generateEmptyRows(count) {
    return Array(count).fill(0).map(() => `
      <tr>
        <td>&nbsp;</td>
        <td>&nbsp;</td>
        <td>&nbsp;</td>
        <td>&nbsp;</td>
        <td>&nbsp;</td>
      </tr>
    `).join('');
  }
}

module.exports = new PDFService();