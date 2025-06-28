const logger = require('../utils/logger');
const aiAnalysisService = require('./aiAnalysisService');

/**
 * データベース自動入力サービス
 * 音声認識結果から各種データベースへの自動入力を行う
 */
class DatabaseService {
  constructor() {
    this.supportedTables = {
      USER_MASTER: 'user_master',
      SERVICE_RECORDS: 'service_records', 
      GOAL_EVALUATIONS: 'goal_evaluations',
      ATTENDANCE_RECORDS: 'attendance_records',
      COMMUNICATION_LOGS: 'communication_logs',
      MEDICAL_RECORDS: 'medical_records'
    };
  }

  /**
   * 音声認識結果からデータベースを自動更新
   */
  async processTranscriptionToDatabase(transcriptionData, userInfo, targetTables = []) {
    try {
      logger.info('Database auto-entry started', {
        textLength: transcriptionData.text.length,
        targetTables: targetTables,
        userName: userInfo.userName
      });

      // AI解析でデータベース用の構造化データを抽出
      const databaseData = await aiAnalysisService.analyzeForDatabaseEntry(
        transcriptionData.text,
        targetTables.length > 0 ? targetTables : Object.values(this.supportedTables)
      );

      // 各テーブルへの自動入力を実行
      const updateResults = {};
      
      for (const table of targetTables) {
        if (databaseData[table]) {
          updateResults[table] = await this.updateTable(table, databaseData[table], userInfo);
        }
      }

      const successCount = Object.values(updateResults).filter(result => result.success).length;
      const failureCount = Object.values(updateResults).filter(result => !result.success).length;

      logger.info('Database auto-entry completed', {
        successCount,
        failureCount,
        updatedTables: Object.keys(updateResults)
      });

      return {
        success: true,
        updatedTables: successCount,
        failedTables: failureCount,
        results: updateResults,
        extractedData: databaseData
      };

    } catch (error) {
      logger.error('Database auto-entry failed', {
        error: error.message,
        targetTables: targetTables
      });
      throw error;
    }
  }

  /**
   * 利用者マスタの自動更新
   */
  async updateUserMaster(transcriptionData, userInfo) {
    try {
      logger.info('User master update started', {
        userName: userInfo.userName
      });

      // 音声から利用者情報を抽出
      const extractedUserData = await this.extractUserMasterData(transcriptionData.text);
      
      // 既存データとマージ
      const updatedUserData = this.mergeUserData(userInfo, extractedUserData);

      // データベース更新をシミュレート（実際のDB操作は環境に応じて実装）
      const updateResult = await this.simulateUserMasterUpdate(updatedUserData);

      logger.info('User master update completed', {
        userName: userInfo.userName,
        updatedFields: Object.keys(extractedUserData),
        success: updateResult.success
      });

      return {
        success: updateResult.success,
        originalData: userInfo,
        extractedData: extractedUserData,
        mergedData: updatedUserData,
        updateResult: updateResult
      };

    } catch (error) {
      logger.error('User master update failed', {
        userName: userInfo.userName,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * サービス提供実績の自動記録
   */
  async recordServiceProvision(transcriptionData, serviceInfo) {
    try {
      logger.info('Service provision recording started', {
        userName: serviceInfo.userName,
        serviceDate: serviceInfo.serviceDate
      });

      // 音声からサービス実績データを抽出
      const serviceRecord = await this.extractServiceRecordData(transcriptionData.text, serviceInfo);

      // サービス提供実績テーブルに記録
      const recordResult = await this.simulateServiceRecordInsert(serviceRecord);

      logger.info('Service provision recording completed', {
        userName: serviceInfo.userName,
        serviceType: serviceRecord.serviceType,
        success: recordResult.success
      });

      return {
        success: recordResult.success,
        serviceRecord: serviceRecord,
        recordResult: recordResult
      };

    } catch (error) {
      logger.error('Service provision recording failed', {
        userName: serviceInfo.userName,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 目標達成度の自動評価・入力
   */
  async evaluateAndRecordGoals(transcriptionData, userInfo) {
    try {
      logger.info('Goal evaluation started', {
        userName: userInfo.userName
      });

      // 音声から目標関連情報を抽出
      const goalEvaluations = await this.extractGoalEvaluationData(transcriptionData.text, userInfo);

      // 目標達成度テーブルに記録
      const evaluationResults = [];
      for (const evaluation of goalEvaluations) {
        const result = await this.simulateGoalEvaluationInsert(evaluation);
        evaluationResults.push(result);
      }

      const successCount = evaluationResults.filter(r => r.success).length;

      logger.info('Goal evaluation completed', {
        userName: userInfo.userName,
        evaluationCount: goalEvaluations.length,
        successCount: successCount
      });

      return {
        success: successCount > 0,
        evaluationCount: goalEvaluations.length,
        successCount: successCount,
        evaluations: goalEvaluations,
        results: evaluationResults
      };

    } catch (error) {
      logger.error('Goal evaluation failed', {
        userName: userInfo.userName,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 利用者マスタデータの抽出
   */
  async extractUserMasterData(transcriptionText) {
    const extracted = {};

    // 年齢の抽出
    const ageMatch = transcriptionText.match(/(\d+)歳|(\d+)才/);
    if (ageMatch) {
      extracted.age = parseInt(ageMatch[1] || ageMatch[2]);
    }

    // 障害種別の抽出
    const disabilityTypes = ['知的障害', '精神障害', '発達障害', '身体障害', '高次脳機能障害'];
    for (const type of disabilityTypes) {
      if (transcriptionText.includes(type)) {
        extracted.disabilityType = type;
        break;
      }
    }

    // 支援区分の抽出
    const supportLevelMatch = transcriptionText.match(/支援区分(\d+)|区分(\d+)/);
    if (supportLevelMatch) {
      extracted.supportLevel = parseInt(supportLevelMatch[1] || supportLevelMatch[2]);
    }

    // 連絡先情報の抽出
    const phoneMatch = transcriptionText.match(/(\d{2,4}-\d{2,4}-\d{4})/);
    if (phoneMatch) {
      extracted.emergencyContact = phoneMatch[1];
    }

    // 医療情報の抽出
    const medicalKeywords = ['服薬', '通院', '主治医', '病院', '薬'];
    const medicalInfo = medicalKeywords.filter(keyword => 
      transcriptionText.includes(keyword)
    );
    if (medicalInfo.length > 0) {
      extracted.medicalInfo = `音声から抽出: ${medicalInfo.join('、')}に関する情報あり`;
    }

    return extracted;
  }

  /**
   * サービス記録データの抽出
   */
  async extractServiceRecordData(transcriptionText, serviceInfo) {
    const record = {
      userName: serviceInfo.userName,
      serviceDate: serviceInfo.serviceDate || new Date().toISOString().split('T')[0],
      staffName: serviceInfo.staffName,
      ...serviceInfo
    };

    // サービス種別の抽出
    const serviceTypes = ['生活介護', '就労移行支援', '就労継続支援A型', '就労継続支援B型'];
    for (const type of serviceTypes) {
      if (transcriptionText.includes(type)) {
        record.serviceType = type;
        break;
      }
    }

    // 時間の抽出
    const timeMatch = transcriptionText.match(/(\d{1,2}):(\d{2})/g);
    if (timeMatch && timeMatch.length >= 2) {
      record.startTime = timeMatch[0];
      record.endTime = timeMatch[timeMatch.length - 1];
    }

    // 利用者状態の抽出
    const conditionKeywords = ['安定', '良好', '注意', '配慮', '体調不良', '元気'];
    for (const keyword of conditionKeywords) {
      if (transcriptionText.includes(keyword)) {
        record.userCondition = keyword;
        break;
      }
    }

    // 活動内容の抽出
    const activityKeywords = ['作業', '活動', '訓練', '支援', '面談', '評価'];
    const activities = activityKeywords.filter(keyword => 
      transcriptionText.includes(keyword)
    );
    if (activities.length > 0) {
      record.serviceContent = activities.join('、');
    }

    // 特記事項の抽出
    const specialNotes = [];
    if (transcriptionText.includes('注意')) {
      specialNotes.push('注意事項あり');
    }
    if (transcriptionText.includes('変化')) {
      specialNotes.push('状態変化あり');
    }
    if (transcriptionText.includes('相談')) {
      specialNotes.push('相談事項あり');
    }
    
    if (specialNotes.length > 0) {
      record.specialEvents = specialNotes.join('、');
    }

    return record;
  }

  /**
   * 目標評価データの抽出
   */
  async extractGoalEvaluationData(transcriptionText, userInfo) {
    const evaluations = [];

    // 目標カテゴリの抽出
    const goalCategories = ['ADL', 'IADL', 'コミュニケーション', '作業', '社会性', '就労'];
    
    for (const category of goalCategories) {
      if (transcriptionText.includes(category)) {
        const evaluation = {
          userName: userInfo.userName,
          goalCategory: category,
          evaluationDate: new Date().toISOString().split('T')[0],
          evaluator: userInfo.staffName || '支援員'
        };

        // 達成度の抽出
        const achievementPatterns = [
          { pattern: /達成/, level: 100 },
          { pattern: /ほぼ達成|一部達成/, level: 80 },
          { pattern: /継続/, level: 50 },
          { pattern: /未達成|困難/, level: 20 }
        ];

        for (const achievement of achievementPatterns) {
          if (achievement.pattern.test(transcriptionText)) {
            evaluation.achievementLevel = achievement.level;
            break;
          }
        }

        // 目標内容の抽出（そのカテゴリに関連する文を抽出）
        const categoryIndex = transcriptionText.indexOf(category);
        if (categoryIndex !== -1) {
          const contextStart = Math.max(0, categoryIndex - 50);
          const contextEnd = Math.min(transcriptionText.length, categoryIndex + 100);
          evaluation.goalDescription = transcriptionText.substring(contextStart, contextEnd).trim();
        }

        // 次の目標の抽出
        if (transcriptionText.includes('次回') || transcriptionText.includes('今後')) {
          evaluation.nextTarget = '音声から抽出された次の目標';
        }

        // 支援調整の抽出
        if (transcriptionText.includes('調整') || transcriptionText.includes('変更')) {
          evaluation.supportAdjustment = '支援内容調整が必要';
        } else {
          evaluation.supportAdjustment = '継続';
        }

        evaluations.push(evaluation);
      }
    }

    // 少なくとも1つの評価は作成
    if (evaluations.length === 0) {
      evaluations.push({
        userName: userInfo.userName,
        goalCategory: '総合',
        goalDescription: '面談記録から抽出',
        achievementLevel: 50,
        evaluationDate: new Date().toISOString().split('T')[0],
        evaluator: userInfo.staffName || '支援員',
        nextTarget: '継続支援',
        supportAdjustment: '継続'
      });
    }

    return evaluations;
  }

  /**
   * データマージング
   */
  mergeUserData(originalData, extractedData) {
    return {
      ...originalData,
      ...extractedData,
      lastUpdated: new Date().toISOString(),
      updateSource: 'audio_transcription'
    };
  }

  /**
   * テーブル更新の実行
   */
  async updateTable(tableName, data, userInfo) {
    try {
      // 実際の実装では、ここでデータベース接続・更新処理を行う
      // 現在はシミュレーション
      switch (tableName) {
        case this.supportedTables.USER_MASTER:
          return await this.simulateUserMasterUpdate(data);
        case this.supportedTables.SERVICE_RECORDS:
          return await this.simulateServiceRecordInsert(data);
        case this.supportedTables.GOAL_EVALUATIONS:
          return await this.simulateGoalEvaluationInsert(data);
        default:
          return await this.simulateGenericTableUpdate(tableName, data);
      }
    } catch (error) {
      logger.error(`Table update failed: ${tableName}`, {
        error: error.message,
        data: data
      });
      return {
        success: false,
        error: error.message,
        tableName: tableName
      };
    }
  }

  /**
   * データベース操作のシミュレーション（実際の環境では実際のDB操作に置き換え）
   */
  async simulateUserMasterUpdate(userData) {
    // 実際の実装例:
    // const query = 'UPDATE user_master SET age = ?, disability_type = ? WHERE user_name = ?';
    // const result = await db.execute(query, [userData.age, userData.disabilityType, userData.userName]);
    
    logger.info('Simulating user master update', { userData });
    
    return {
      success: true,
      affectedRows: 1,
      operation: 'UPDATE',
      table: 'user_master',
      timestamp: new Date().toISOString()
    };
  }

  async simulateServiceRecordInsert(serviceRecord) {
    logger.info('Simulating service record insert', { serviceRecord });
    
    return {
      success: true,
      insertId: Date.now(),
      operation: 'INSERT',
      table: 'service_records',
      timestamp: new Date().toISOString()
    };
  }

  async simulateGoalEvaluationInsert(evaluation) {
    logger.info('Simulating goal evaluation insert', { evaluation });
    
    return {
      success: true,
      insertId: Date.now(),
      operation: 'INSERT',
      table: 'goal_evaluations',
      timestamp: new Date().toISOString()
    };
  }

  async simulateGenericTableUpdate(tableName, data) {
    logger.info('Simulating generic table update', { tableName, data });
    
    return {
      success: true,
      affectedRows: 1,
      operation: 'UPDATE',
      table: tableName,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * サポートされているテーブル一覧を取得
   */
  getSupportedTables() {
    return [
      {
        table: this.supportedTables.USER_MASTER,
        name: '利用者マスタ',
        description: '利用者の基本情報（年齢、障害種別、連絡先等）',
        extractable: ['年齢', '障害種別', '支援区分', '連絡先', '医療情報']
      },
      {
        table: this.supportedTables.SERVICE_RECORDS,
        name: 'サービス提供実績',
        description: '日々のサービス提供内容と利用者状況',
        extractable: ['サービス種別', '提供時間', '利用者状態', '活動内容', '特記事項']
      },
      {
        table: this.supportedTables.GOAL_EVALUATIONS,
        name: '目標達成度評価',
        description: '個別目標の進捗状況と達成度評価',
        extractable: ['目標カテゴリ', '達成度', '評価内容', '次の目標', '支援調整']
      },
      {
        table: this.supportedTables.ATTENDANCE_RECORDS,
        name: '出席記録',
        description: '利用者の出席状況と参加度',
        extractable: ['出席状況', '参加度', '欠席理由', '早退・遅刻']
      },
      {
        table: this.supportedTables.COMMUNICATION_LOGS,
        name: 'コミュニケーション記録',
        description: '利用者・家族・関係機関との連絡記録',
        extractable: ['連絡先', '連絡内容', '連絡日時', '対応者']
      },
      {
        table: this.supportedTables.MEDICAL_RECORDS,
        name: '医療・健康記録',
        description: '服薬状況、通院記録、健康状態',
        extractable: ['服薬情報', '通院状況', '健康状態', '医療機関']
      }
    ];
  }

  /**
   * データベース自動入力の推奨テーブル提案
   */
  suggestTables(transcriptionText, userContext = {}) {
    const suggestions = [];
    const text = transcriptionText.toLowerCase();

    // 利用者情報に関する内容
    if (text.includes('年齢') || text.includes('歳') || text.includes('障害') || text.includes('連絡')) {
      suggestions.push(this.supportedTables.USER_MASTER);
    }

    // サービス提供に関する内容
    if (text.includes('サービス') || text.includes('活動') || text.includes('作業') || text.includes('時間')) {
      suggestions.push(this.supportedTables.SERVICE_RECORDS);
    }

    // 目標・評価に関する内容
    if (text.includes('目標') || text.includes('達成') || text.includes('評価') || text.includes('進捗')) {
      suggestions.push(this.supportedTables.GOAL_EVALUATIONS);
    }

    // 出席に関する内容
    if (text.includes('出席') || text.includes('参加') || text.includes('欠席')) {
      suggestions.push(this.supportedTables.ATTENDANCE_RECORDS);
    }

    // 連絡に関する内容
    if (text.includes('家族') || text.includes('連絡') || text.includes('報告')) {
      suggestions.push(this.supportedTables.COMMUNICATION_LOGS);
    }

    // 医療に関する内容
    if (text.includes('服薬') || text.includes('通院') || text.includes('病院') || text.includes('薬')) {
      suggestions.push(this.supportedTables.MEDICAL_RECORDS);
    }

    // 重複を削除
    return [...new Set(suggestions)];
  }
}

module.exports = new DatabaseService();