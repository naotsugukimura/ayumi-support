const request = require('supertest');
const app = require('../../server/app');

describe('API Integration Tests', () => {
  describe('Health Check', () => {
    test('GET /api/health が正常に応答する', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('PDF Generation API', () => {
    const testData = {
      userName: 'APIテストユーザー',
      staffName: 'API支援員',
      facilityName: 'APIテスト事業所',
      transcriptionText: 'APIテストの音声認識結果です。'
    };

    test('POST /api/pdf/service-record でサービス記録PDFが生成される', async () => {
      const response = await request(app)
        .post('/api/pdf/service-record')
        .send(testData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('filename');
      expect(response.body).toHaveProperty('path');
      expect(response.body.filename).toMatch(/service_record_\d+\.pdf/);
    }, 30000);

    test('POST /api/pdf/interview-record で面談記録PDFが生成される', async () => {
      const response = await request(app)
        .post('/api/pdf/interview-record')
        .send(testData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('filename');
      expect(response.body).toHaveProperty('path');
      expect(response.body.filename).toMatch(/interview_record_\d+\.pdf/);
    }, 30000);

    test('POST /api/pdf/assessment-sheet でアセスメント表PDFが生成される', async () => {
      const response = await request(app)
        .post('/api/pdf/assessment-sheet')
        .send(testData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('filename');
      expect(response.body).toHaveProperty('path');
      expect(response.body.filename).toMatch(/assessment_sheet_\d+\.pdf/);
    }, 30000);

    test('POST /api/pdf/individual-support-plan で個別支援計画書PDFが生成される', async () => {
      const response = await request(app)
        .post('/api/pdf/individual-support-plan')
        .send(testData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('filename');
      expect(response.body).toHaveProperty('path');
      expect(response.body.filename).toMatch(/individual_support_plan_\d+\.pdf/);
    }, 30000);

    test('POST /api/pdf/monitoring-record でモニタリング記録表PDFが生成される', async () => {
      const response = await request(app)
        .post('/api/pdf/monitoring-record')
        .send(testData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('filename');
      expect(response.body).toHaveProperty('path');
      expect(response.body.filename).toMatch(/monitoring_record_\d+\.pdf/);
    }, 30000);
  });

  describe('Audio Processing API', () => {
    test('POST /api/audio/upload で音声ファイルアップロードAPIが利用可能', async () => {
      // モックファイルを使用したテスト
      const response = await request(app)
        .post('/api/audio/upload')
        .attach('audio', Buffer.from('fake audio data'), 'test.wav')
        .expect(400); // ファイル形式エラーまたは認証エラーが期待される

      // エラーレスポンスでもAPIが応答することを確認
      expect(response.body).toHaveProperty('success');
    });
  });
});