const logger = require('../utils/logger');
const pdfService = require('./pdfService');
const aiAnalysisService = require('./aiAnalysisService');

/**
 * 音声から複数帳票を同時生成するサービス
 */
class MultiDocumentService {
  constructor() {
    this.documentTypes = {
      INDIVIDUAL_SUPPORT_PLAN: 'individual-support-plan',
      MONITORING_RECORD: 'monitoring-record', 
      FAMILY_REPORT: 'family-report',
      SERVICE_RECORD: 'service-record',
      ASSESSMENT_SHEET: 'assessment-sheet'
    };
  }

  /**
   * 音声から複数帳票を同時生成
   */
  async generateMultipleDocuments(transcriptionData, selectedDocuments, userInfo) {
    try {
      logger.info('Multiple document generation started', {
        documentCount: selectedDocuments.length,
        documentTypes: selectedDocuments,
        userName: userInfo.userName
      });

      // 音声内容をAI解析して構造化データを抽出
      const structuredData = await this.extractStructuredData(transcriptionData, userInfo);
      
      // 各帳票を並列生成
      const documentPromises = selectedDocuments.map(docType => 
        this.generateSingleDocument(docType, structuredData, userInfo)
      );

      const generatedDocuments = await Promise.all(documentPromises);
      
      const successfulDocs = generatedDocuments.filter(doc => doc.success);
      const failedDocs = generatedDocuments.filter(doc => !doc.success);

      logger.info('Multiple document generation completed', {
        successCount: successfulDocs.length,
        failureCount: failedDocs.length,
        documents: successfulDocs.map(doc => doc.filename)
      });

      return {
        success: true,
        generatedCount: successfulDocs.length,
        failedCount: failedDocs.length,
        documents: successfulDocs,
        failures: failedDocs,
        structuredData: structuredData
      };

    } catch (error) {
      logger.error('Multiple document generation failed', {
        error: error.message,
        documentTypes: selectedDocuments
      });
      throw error;
    }
  }

  /**
   * 単一帳票の生成
   */
  async generateSingleDocument(documentType, structuredData, userInfo) {
    try {
      let result;
      const documentData = this.prepareDocumentData(documentType, structuredData, userInfo);

      switch (documentType) {
        case this.documentTypes.INDIVIDUAL_SUPPORT_PLAN:
          result = await pdfService.generateIndividualSupportPlan(documentData);
          break;
        case this.documentTypes.MONITORING_RECORD:
          result = await pdfService.generateMonitoringRecord(documentData);
          break;
        case this.documentTypes.FAMILY_REPORT:
          result = await pdfService.generateFamilyReport(documentData);
          break;
        case this.documentTypes.SERVICE_RECORD:
          result = await pdfService.generateServiceRecord(documentData);
          break;
        case this.documentTypes.ASSESSMENT_SHEET:
          result = await pdfService.generateAssessmentSheet(documentData);
          break;
        default:
          throw new Error(`Unsupported document type: ${documentType}`);
      }

      return {
        success: true,
        documentType: documentType,
        filename: result.filename,
        path: result.path,
        data: documentData
      };

    } catch (error) {
      logger.error('Single document generation failed', {
        documentType,
        error: error.message
      });
      
      return {
        success: false,
        documentType: documentType,
        error: error.message
      };
    }
  }

  /**
   * 音声から構造化データを抽出
   */
  async extractStructuredData(transcriptionData, userInfo) {
    try {
      const analysisPrompt = this.buildAnalysisPrompt(transcriptionData.text);
      
      // AI解析サービスを使用して構造化データを抽出
      const analysis = await aiAnalysisService.analyzeTranscription(
        transcriptionData.text, 
        analysisPrompt
      );

      // 基本情報とマージ
      const structuredData = {
        // 基本情報
        basicInfo: {
          userName: userInfo.userName || '利用者名',
          staffName: userInfo.staffName || '支援員名',
          date: new Date().toLocaleDateString('ja-JP'),
          time: new Date().toLocaleTimeString('ja-JP'),
          duration: transcriptionData.duration || 0
        },
        
        // 音声認識結果
        transcription: {
          fullText: transcriptionData.text,
          wordCount: transcriptionData.text.length,
          segments: transcriptionData.segments || []
        },

        // AI解析結果
        analysis: analysis,

        // 抽出された情報
        extractedData: this.extractKeyInformation(transcriptionData.text, analysis)
      };

      return structuredData;

    } catch (error) {
      logger.error('Structured data extraction failed', {
        error: error.message
      });
      
      // エラー時はベースデータのみ返す
      return {
        basicInfo: {
          userName: userInfo.userName || '利用者名',
          staffName: userInfo.staffName || '支援員名',
          date: new Date().toLocaleDateString('ja-JP'),
          time: new Date().toLocaleTimeString('ja-JP')
        },
        transcription: {
          fullText: transcriptionData.text,
          wordCount: transcriptionData.text.length
        },
        analysis: null,
        extractedData: {}
      };
    }
  }

  /**
   * 帳票タイプ別データ準備
   */
  prepareDocumentData(documentType, structuredData, userInfo) {
    const baseData = {
      ...structuredData.basicInfo,
      ...userInfo,
      generatedAt: new Date().toISOString()
    };

    switch (documentType) {
      case this.documentTypes.INDIVIDUAL_SUPPORT_PLAN:
        return {
          ...baseData,
          currentSituation: structuredData.extractedData.currentSituation || '音声から抽出された現在の状況',
          longTermGoals: structuredData.extractedData.longTermGoals || ['音声から抽出された長期目標'],
          shortTermGoals: structuredData.extractedData.shortTermGoals || ['音声から抽出された短期目標'],
          supportContent: structuredData.extractedData.supportContent || ['音声から抽出された支援内容'],
          evaluationCriteria: structuredData.extractedData.evaluationCriteria || '音声から抽出された評価基準',
          nextReviewDate: structuredData.extractedData.nextReviewDate || '次回見直し予定日',
          transcriptionText: structuredData.transcription.fullText
        };

      case this.documentTypes.MONITORING_RECORD:
        return {
          ...baseData,
          monitoringPeriod: structuredData.extractedData.monitoringPeriod || '今期',
          goalAchievement: structuredData.extractedData.goalAchievement || '達成状況',
          progressSummary: structuredData.extractedData.progressSummary || '進捗まとめ',
          challenges: structuredData.extractedData.challenges || ['課題'],
          nextActions: structuredData.extractedData.nextActions || ['次のアクション'],
          evaluationDate: structuredData.basicInfo.date,
          transcriptionText: structuredData.transcription.fullText
        };

      case this.documentTypes.FAMILY_REPORT:
        return {
          ...baseData,
          reportPeriod: structuredData.extractedData.reportPeriod || '今月',
          activitySummary: structuredData.extractedData.activitySummary || '活動概要',
          achievements: structuredData.extractedData.achievements || ['成果'],
          dailyLifeStatus: structuredData.extractedData.dailyLifeStatus || '日常生活状況',
          familyMessage: structuredData.extractedData.familyMessage || 'ご家族へのメッセージ',
          nextMonthPlan: structuredData.extractedData.nextMonthPlan || '来月の予定',
          transcriptionText: structuredData.transcription.fullText
        };

      case this.documentTypes.SERVICE_RECORD:
        return {
          ...baseData,
          serviceDate: structuredData.basicInfo.date,
          serviceType: structuredData.extractedData.serviceType || '生活介護',
          serviceContent: structuredData.extractedData.serviceContent || ['提供したサービス'],
          participationStatus: structuredData.extractedData.participationStatus || '参加状況',
          specialNotes: structuredData.extractedData.specialNotes || '特記事項',
          nextServicePlan: structuredData.extractedData.nextServicePlan || '次回サービス予定',
          transcriptionText: structuredData.transcription.fullText
        };

      case this.documentTypes.ASSESSMENT_SHEET:
        return {
          ...baseData,
          assessmentDate: structuredData.basicInfo.date,
          assessmentType: structuredData.extractedData.assessmentType || '定期アセスメント',
          functionalAssessment: structuredData.extractedData.functionalAssessment || {},
          cognitiveAssessment: structuredData.extractedData.cognitiveAssessment || {},
          socialAssessment: structuredData.extractedData.socialAssessment || {},
          overallEvaluation: structuredData.extractedData.overallEvaluation || '総合評価',
          recommendations: structuredData.extractedData.recommendations || ['推奨事項'],
          transcriptionText: structuredData.transcription.fullText
        };

      default:
        return baseData;
    }
  }

  /**
   * AI解析用プロンプト構築
   */
  buildAnalysisPrompt(transcriptionText) {
    return `
以下の障害福祉面談記録から、複数の帳票作成に必要な情報を抽出してください。

【音声認識テキスト】
${transcriptionText}

【抽出が必要な情報】
1. 現在の状況・課題
2. 長期目標・短期目標
3. 支援内容・方法
4. 進捗・達成状況
5. 家族への報告内容
6. 次回の予定・計画
7. 特記事項・注意点

【出力形式】
JSON形式で構造化して出力してください。
各項目が不明な場合は「音声から抽出できませんでした」と記載してください。
`;
  }

  /**
   * キー情報の抽出
   */
  extractKeyInformation(transcriptionText, analysis) {
    // 基本的なキーワード抽出とパターンマッチング
    const extracted = {};

    // 日付パターンの抽出
    const datePatterns = transcriptionText.match(/\d{1,2}月\d{1,2}日|\d{4}年\d{1,2}月\d{1,2}日/g);
    if (datePatterns) {
      extracted.mentionedDates = datePatterns;
    }

    // 数値評価の抽出
    const evaluationPatterns = transcriptionText.match(/\d+点|\d+段階|\d+%|レベル\d+/g);
    if (evaluationPatterns) {
      extracted.evaluationScores = evaluationPatterns;
    }

    // 目標に関する表現の抽出
    const goalKeywords = ['目標', '計画', '予定', '希望', '意向'];
    goalKeywords.forEach(keyword => {
      const regex = new RegExp(`${keyword}[^。]*。`, 'g');
      const matches = transcriptionText.match(regex);
      if (matches) {
        extracted[`${keyword}Statements`] = matches;
      }
    });

    // AI解析結果があれば統合
    if (analysis && analysis.structured_data) {
      Object.assign(extracted, analysis.structured_data);
    }

    return extracted;
  }

  /**
   * 利用可能な帳票タイプ一覧を取得
   */
  getAvailableDocumentTypes() {
    return [
      {
        type: this.documentTypes.INDIVIDUAL_SUPPORT_PLAN,
        name: '個別支援計画書',
        description: '利用者の支援目標と具体的な支援内容を記載',
        priority: 1
      },
      {
        type: this.documentTypes.MONITORING_RECORD,
        name: 'モニタリング記録表',
        description: '支援計画の進捗状況と評価を記録',
        priority: 2
      },
      {
        type: this.documentTypes.FAMILY_REPORT,
        name: '家族向け報告書',
        description: 'ご家族への活動報告と近況お知らせ',
        priority: 3
      },
      {
        type: this.documentTypes.SERVICE_RECORD,
        name: 'サービス提供実績記録表',
        description: '提供したサービスの詳細記録',
        priority: 4
      },
      {
        type: this.documentTypes.ASSESSMENT_SHEET,
        name: 'アセスメント表',
        description: '利用者の能力評価と課題分析',
        priority: 5
      }
    ];
  }

  /**
   * 推奨帳票の提案
   */
  suggestDocuments(transcriptionText, userContext) {
    const suggestions = [];
    const text = transcriptionText.toLowerCase();

    // 面談タイプに基づく推奨
    if (text.includes('アセスメント') || text.includes('評価')) {
      suggestions.push(this.documentTypes.ASSESSMENT_SHEET);
      suggestions.push(this.documentTypes.INDIVIDUAL_SUPPORT_PLAN);
    }

    if (text.includes('モニタリング') || text.includes('進捗') || text.includes('達成')) {
      suggestions.push(this.documentTypes.MONITORING_RECORD);
      suggestions.push(this.documentTypes.FAMILY_REPORT);
    }

    if (text.includes('目標') || text.includes('計画')) {
      suggestions.push(this.documentTypes.INDIVIDUAL_SUPPORT_PLAN);
    }

    if (text.includes('家族') || text.includes('報告')) {
      suggestions.push(this.documentTypes.FAMILY_REPORT);
    }

    // デフォルトの推奨（キーワードがない場合）
    if (suggestions.length === 0) {
      suggestions.push(
        this.documentTypes.INDIVIDUAL_SUPPORT_PLAN,
        this.documentTypes.SERVICE_RECORD
      );
    }

    return suggestions;
  }
}

module.exports = new MultiDocumentService();