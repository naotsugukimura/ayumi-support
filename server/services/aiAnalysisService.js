const Anthropic = require('@anthropic-ai/sdk');
const logger = require('../utils/logger');
const { CLAUDE_MODEL } = require('../utils/constants');
const APIRetryUtil = require('../utils/apiRetryUtil');

/**
 * AI解析サービス - 音声認識結果の構造化分析
 * Anthropic Claude APIを使用して障害福祉専門用語に対応した解析を実行
 * 
 * @class AIAnalysisService
 */
class AIAnalysisService {
  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      timeout: 60000, // 60秒タイムアウト
      maxRetries: 3 // 最大3回リトライ
    });
  }

  /**
   * 音声認識結果をAI解析して構造化データを抽出
   * 障害福祉面談記録に特化したプロンプトで高精度解析
   * 
   * @param {string} transcriptionText - 音声認識結果テキスト
   * @param {string|null} customPrompt - カスタムプロンプト（任意）
   * @returns {Promise<Object>} 構造化された解析結果
   */
  async analyzeTranscription(transcriptionText, customPrompt = null) {
    try {
      logger.info('AI analysis started', {
        textLength: transcriptionText.length,
        hasCustomPrompt: !!customPrompt
      });

      const prompt = customPrompt || this.buildDefaultAnalysisPrompt(transcriptionText);
      
      const response = await this.anthropic.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 4000,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      const analysisResult = this.parseAnalysisResponse(response.content[0].text);
      
      logger.info('AI analysis completed', {
        textLength: transcriptionText.length,
        resultKeys: Object.keys(analysisResult)
      });

      return analysisResult;

    } catch (error) {
      logger.error('AI analysis failed', {
        error: error.message,
        textLength: transcriptionText.length
      });
      throw error;
    }
  }

  /**
   * 複数帳票用のデータ抽出分析
   * 個別支援計画書、モニタリング記録等、5種類の帳票に対応
   * 
   * @param {string} transcriptionText - 音声認識結果
   * @param {Array<string>} documentTypes - 生成対象帳票の種類リスト
   * @returns {Promise<Object>} 帳票別構造化データ
   */
  async analyzeForMultipleDocuments(transcriptionText, documentTypes) {
    try {
      const prompt = this.buildMultiDocumentPrompt(transcriptionText, documentTypes);
      
      const response = await APIRetryUtil.callClaudeAPI(async () => {
        return await this.anthropic.messages.create({
          model: CLAUDE_MODEL,
          max_tokens: 4000,
          messages: [{
            role: 'user',
            content: prompt
          }]
        });
      });

      const analysisResult = this.parseMultiDocumentResponse(response.content[0].text);
      
      logger.info('Multi-document analysis completed', {
        documentTypes: documentTypes,
        extractedSections: Object.keys(analysisResult)
      });

      return analysisResult;

    } catch (error) {
      logger.error('Multi-document analysis failed', {
        error: error.message,
        documentTypes: documentTypes
      });
      throw error;
    }
  }

  /**
   * データベース入力用の構造化分析
   */
  async analyzeForDatabaseEntry(transcriptionText, targetTables) {
    try {
      const prompt = this.buildDatabaseAnalysisPrompt(transcriptionText, targetTables);
      
      const response = await APIRetryUtil.callClaudeAPI(async () => {
        return await this.anthropic.messages.create({
          model: CLAUDE_MODEL,
          max_tokens: 3000,
          messages: [{
            role: 'user',
            content: prompt
          }]
        });
      });

      const analysisResult = this.parseDatabaseResponse(response.content[0].text);
      
      logger.info('Database analysis completed', {
        targetTables: targetTables,
        extractedTables: Object.keys(analysisResult)
      });

      return analysisResult;

    } catch (error) {
      logger.error('Database analysis failed', {
        error: error.message,
        targetTables: targetTables
      });
      throw error;
    }
  }

  /**
   * デフォルト解析プロンプト構築
   */
  buildDefaultAnalysisPrompt(transcriptionText) {
    return `
以下は障害福祉事業所での面談記録の音声認識結果です。
この内容を分析して、構造化されたデータとして抽出してください。

【音声認識テキスト】
${transcriptionText}

【抽出してください】
1. 参加者情報（利用者名、支援員名、その他参加者）
2. 面談の目的・種類（アセスメント、モニタリング、相談等）
3. 現在の状況・課題
4. 利用者の意向・希望
5. 支援目標（長期・短期）
6. 具体的な支援内容・方法
7. 評価・進捗状況
8. 今後の予定・計画
9. 特記事項・注意点
10. 関係機関との連携事項

【出力形式】
以下のJSON形式で出力してください：

{
  "participants": {
    "user": "利用者名",
    "staff": "支援員名", 
    "others": ["その他参加者"]
  },
  "interview_type": "面談種別",
  "current_situation": "現在の状況",
  "user_wishes": "利用者の意向",
  "goals": {
    "long_term": ["長期目標"],
    "short_term": ["短期目標"]
  },
  "support_content": ["支援内容"],
  "evaluation": "評価・進捗",
  "future_plans": ["今後の計画"],
  "special_notes": "特記事項",
  "coordination": "関係機関連携"
}

情報が不明確な項目は「音声から特定できず」と記載してください。
`;
  }

  /**
   * 複数帳票用プロンプト構築
   */
  buildMultiDocumentPrompt(transcriptionText, documentTypes) {
    const documentDescriptions = {
      'individual-support-plan': '個別支援計画書用の目標、支援内容、評価基準',
      'monitoring-record': 'モニタリング記録用の進捗、達成状況、課題',
      'family-report': '家族報告書用の活動概要、成果、メッセージ',
      'service-record': 'サービス記録用の提供内容、参加状況、特記事項',
      'assessment-sheet': 'アセスメント表用の能力評価、機能評価'
    };

    const targetDocs = documentTypes.map(type => documentDescriptions[type] || type).join('、');

    return `
以下は障害福祉面談の音声認識結果です。
この内容から${targetDocs}に必要な情報を抽出してください。

【音声認識テキスト】
${transcriptionText}

【出力する帳票】
${documentTypes.join('、')}

【抽出形式】
帳票ごとに必要な情報を分けて、JSON形式で出力してください：

{
  "individual_support_plan": {
    "current_situation": "現在の状況",
    "long_term_goals": ["長期目標"],
    "short_term_goals": ["短期目標"],
    "support_methods": ["支援方法"],
    "evaluation_criteria": "評価基準",
    "review_schedule": "見直し予定"
  },
  "monitoring_record": {
    "monitoring_period": "モニタリング期間",
    "goal_achievement": "目標達成状況",
    "progress_summary": "進捗まとめ",
    "challenges": ["課題"],
    "next_actions": ["次のアクション"]
  },
  "family_report": {
    "activity_summary": "活動概要",
    "achievements": ["成果・変化"],
    "daily_life_status": "日常生活状況",
    "family_message": "家族へのメッセージ",
    "next_month_plan": "来月の予定"
  },
  "service_record": {
    "service_type": "サービス種別",
    "provided_services": ["提供サービス"],
    "participation_status": "参加状況",
    "special_notes": "特記事項"
  },
  "assessment_sheet": {
    "functional_assessment": "機能評価",
    "cognitive_assessment": "認知評価", 
    "social_assessment": "社会性評価",
    "overall_evaluation": "総合評価",
    "recommendations": ["推奨事項"]
  }
}

必要な帳票の情報のみ出力し、不明な項目は「音声から抽出できず」と記載してください。
`;
  }

  /**
   * データベース分析用プロンプト構築
   */
  buildDatabaseAnalysisPrompt(transcriptionText, targetTables) {
    return `
以下は障害福祉面談の音声認識結果です。
この内容からデータベース入力用の構造化データを抽出してください。

【音声認識テキスト】
${transcriptionText}

【対象テーブル】
${targetTables.join('、')}

【抽出形式】
データベーステーブルごとに、以下のJSON形式で出力：

{
  "user_master": {
    "user_name": "利用者名",
    "age": "年齢",
    "disability_type": "障害種別",
    "support_level": "支援区分",
    "emergency_contact": "緊急連絡先",
    "medical_info": "医療情報"
  },
  "service_records": {
    "service_date": "サービス提供日",
    "service_type": "サービス種別",
    "start_time": "開始時刻",
    "end_time": "終了時刻",
    "staff_name": "担当職員",
    "service_content": "サービス内容",
    "user_condition": "利用者状態",
    "special_events": "特記事項"
  },
  "goal_evaluations": {
    "goal_category": "目標カテゴリ",
    "goal_description": "目標内容",
    "achievement_level": "達成度",
    "evaluation_date": "評価日",
    "evaluator": "評価者",
    "next_target": "次の目標",
    "support_adjustment": "支援調整"
  }
}

データベースに適した形式で、NULL値や不明項目は空文字または適切なデフォルト値を設定してください。
`;
  }

  /**
   * 解析結果のパース
   */
  parseAnalysisResponse(responseText) {
    try {
      // JSONブロックを抽出
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // JSON形式でない場合は、テキストから構造化データを作成
      return this.createFallbackStructure(responseText);
      
    } catch (error) {
      logger.warn('Failed to parse AI analysis response', {
        error: error.message
      });
      return this.createFallbackStructure(responseText);
    }
  }

  /**
   * 複数帳票用レスポンスのパース
   */
  parseMultiDocumentResponse(responseText) {
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return this.createMultiDocumentFallback(responseText);
    } catch (error) {
      logger.warn('Failed to parse multi-document response', {
        error: error.message
      });
      return this.createMultiDocumentFallback(responseText);
    }
  }

  /**
   * データベース用レスポンスのパース
   */
  parseDatabaseResponse(responseText) {
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return this.createDatabaseFallback(responseText);
    } catch (error) {
      logger.warn('Failed to parse database response', {
        error: error.message
      });
      return this.createDatabaseFallback(responseText);
    }
  }

  /**
   * フォールバック構造の作成
   */
  createFallbackStructure(responseText) {
    return {
      participants: {
        user: "音声から抽出",
        staff: "音声から抽出",
        others: []
      },
      interview_type: "面談",
      current_situation: responseText.substring(0, 200) + "...",
      user_wishes: "音声から特定中",
      goals: {
        long_term: ["音声から抽出予定"],
        short_term: ["音声から抽出予定"]
      },
      support_content: ["音声内容に基づく支援"],
      evaluation: "評価中",
      future_plans: ["今後の計画検討中"],
      special_notes: "音声解析結果を確認中",
      coordination: "関係機関連携を検討"
    };
  }

  /**
   * 複数帳票用フォールバック
   */
  createMultiDocumentFallback(responseText) {
    return {
      individual_support_plan: {
        current_situation: "音声から抽出中",
        long_term_goals: ["音声解析中"],
        short_term_goals: ["音声解析中"],
        support_methods: ["音声から特定"],
        evaluation_criteria: "評価基準検討中",
        review_schedule: "見直し予定"
      },
      monitoring_record: {
        monitoring_period: "今期",
        goal_achievement: "評価中",
        progress_summary: "進捗確認中",
        challenges: ["課題抽出中"],
        next_actions: ["アクション検討中"]
      }
    };
  }

  /**
   * データベース用フォールバック
   */
  createDatabaseFallback(responseText) {
    return {
      user_master: {
        user_name: "音声から抽出",
        age: null,
        disability_type: "確認中",
        support_level: null,
        emergency_contact: null,
        medical_info: null
      },
      service_records: {
        service_date: new Date().toISOString().split('T')[0],
        service_type: "面談",
        start_time: null,
        end_time: null,
        staff_name: "音声から抽出",
        service_content: "面談実施",
        user_condition: "安定",
        special_events: "音声記録あり"
      },
      goal_evaluations: {
        goal_category: "総合",
        goal_description: "音声から抽出",
        achievement_level: null,
        evaluation_date: new Date().toISOString().split('T')[0],
        evaluator: "音声から抽出",
        next_target: "検討中",
        support_adjustment: "継続"
      }
    };
  }

  /**
   * 分析結果の品質評価
   */
  evaluateAnalysisQuality(analysisResult, originalText) {
    const quality = {
      completeness: 0,
      accuracy: 0,
      relevance: 0,
      overall: 0
    };

    // 完全性評価（必要フィールドの充足率）
    const requiredFields = ['participants', 'current_situation', 'goals', 'support_content'];
    const filledFields = requiredFields.filter(field => 
      analysisResult[field] && analysisResult[field] !== '音声から特定できず'
    );
    quality.completeness = filledFields.length / requiredFields.length;

    // 関連性評価（元テキストとの関連度）
    const textLength = originalText.length;
    const extractedLength = JSON.stringify(analysisResult).length;
    quality.relevance = Math.min(1.0, extractedLength / (textLength * 0.5));

    // 精度評価（デフォルト値の割合）
    const totalValues = JSON.stringify(analysisResult).split(',').length;
    const defaultValues = JSON.stringify(analysisResult).split('音声から').length - 1;
    quality.accuracy = Math.max(0, 1.0 - (defaultValues / totalValues));

    // 総合評価
    quality.overall = (quality.completeness * 0.4 + quality.accuracy * 0.4 + quality.relevance * 0.2);

    return quality;
  }

  /**
   * レガシー関数 - 新しいコードではAPIRetryUtil.callClaudeAPIを使用してください
   * @deprecated
   */
  async callWithRetry(apiCall, serviceName, maxRetries = 3) {
    return await APIRetryUtil.callWithRetry(apiCall, serviceName, maxRetries, 60000);
  }
}

module.exports = new AIAnalysisService();