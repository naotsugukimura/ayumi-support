const PDFService = require('../../server/services/pdfService');
const fs = require('fs');
const path = require('path');

describe('PDFService', () => {
  const testData = {
    userName: 'テストユーザー',
    staffName: 'テスト支援員',
    facilityName: 'テスト事業所',
    transcriptionText: 'これはテストの音声認識結果です。'
  };

  afterEach(() => {
    // テスト後にGeneratedディレクトリをクリーンアップ
    const generatedDir = path.join(__dirname, '../../generated');
    if (fs.existsSync(generatedDir)) {
      const files = fs.readdirSync(generatedDir);
      files.forEach(file => {
        if (file.includes('test') || file.includes('Test')) {
          fs.unlinkSync(path.join(generatedDir, file));
        }
      });
    }
  });

  describe('generateServiceRecord', () => {
    test('サービス提供実績記録表のPDFが正常に生成される', async () => {
      const result = await PDFService.generateServiceRecord(testData);
      
      expect(result).toHaveProperty('path');
      expect(result).toHaveProperty('filename');
      expect(result.filename).toMatch(/service_record_\d+\.pdf/);
      expect(fs.existsSync(result.path)).toBe(true);
    }, 30000);
  });

  describe('generateInterviewRecord', () => {
    test('面談記録PDFが正常に生成される', async () => {
      const result = await PDFService.generateInterviewRecord(testData);
      
      expect(result).toHaveProperty('path');
      expect(result).toHaveProperty('filename');
      expect(result.filename).toMatch(/interview_record_\d+\.pdf/);
      expect(fs.existsSync(result.path)).toBe(true);
    }, 30000);
  });

  describe('generateAssessmentSheet', () => {
    test('アセスメント表PDFが正常に生成される', async () => {
      const result = await PDFService.generateAssessmentSheet(testData);
      
      expect(result).toHaveProperty('path');
      expect(result).toHaveProperty('filename');
      expect(result.filename).toMatch(/assessment_sheet_\d+\.pdf/);
      expect(fs.existsSync(result.path)).toBe(true);
    }, 30000);
  });

  describe('generateIndividualSupportPlan', () => {
    test('個別支援計画書PDFが正常に生成される', async () => {
      const result = await PDFService.generateIndividualSupportPlan(testData);
      
      expect(result).toHaveProperty('path');
      expect(result).toHaveProperty('filename');
      expect(result.filename).toMatch(/individual_support_plan_\d+\.pdf/);
      expect(fs.existsSync(result.path)).toBe(true);
    }, 30000);
  });

  describe('generateMonitoringRecord', () => {
    test('モニタリング記録表PDFが正常に生成される', async () => {
      const result = await PDFService.generateMonitoringRecord(testData);
      
      expect(result).toHaveProperty('path');
      expect(result).toHaveProperty('filename');
      expect(result.filename).toMatch(/monitoring_record_\d+\.pdf/);
      expect(fs.existsSync(result.path)).toBe(true);
    }, 30000);
  });

  describe('formatDate', () => {
    test('日付が正しい形式でフォーマットされる', () => {
      const testDate = new Date('2025-06-28');
      const formatted = PDFService.formatDate(testDate);
      expect(formatted).toBe('2025年06月28日');
    });
  });

  describe('buildServiceRecordHTML', () => {
    test('サービス記録HTMLに必要な要素が含まれる', () => {
      const html = PDFService.buildServiceRecordHTML(testData);
      
      expect(html).toContain('サービス提供実績記録表');
      expect(html).toContain(testData.userName);
      expect(html).toContain(testData.facilityName);
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('</html>');
    });
  });

  describe('buildInterviewRecordHTML', () => {
    test('面談記録HTMLに必要な要素が含まれる', () => {
      const html = PDFService.buildInterviewRecordHTML(testData);
      
      expect(html).toContain('面談記録');
      expect(html).toContain(testData.userName);
      expect(html).toContain(testData.transcriptionText);
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('</html>');
    });
  });
});