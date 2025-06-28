const databaseService = require('../services/databaseService');
const audioService = require('../services/audioService');
const { HTTP_STATUS, SUCCESS_MESSAGES } = require('../utils/constants');
const logger = require('../utils/logger');

/**
 * データベース自動入力コントローラー
 */
class DatabaseController {

  /**
   * 音声からデータベースを自動更新
   */
  async processAudioToDatabase(req, res) {
    const { file } = req;
    const { 
      targetTables = [],
      userName,
      staffName,
      promptType = 'WELFARE'
    } = req.body;

    if (!targetTables || targetTables.length === 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: '更新対象のテーブルを選択してください'
      });
    }

    try {
      logger.info('Audio to database processing started', {
        filename: file.filename,
        targetTables: targetTables,
        userName,
        ip: req.ip
      });

      // 音声認識実行
      const transcriptionResult = await audioService.transcribeAudio(file, promptType, true);
      
      // ユーザー情報を準備
      const userInfo = {
        userName: userName || '利用者名',
        staffName: staffName || '支援員名',
        serviceDate: new Date().toISOString().split('T')[0]
      };

      // データベース自動更新
      const databaseResult = await databaseService.processTranscriptionToDatabase(
        transcriptionResult.transcription,
        userInfo,
        targetTables
      );

      logger.info('Audio to database processing completed', {
        filename: file.filename,
        updatedTables: databaseResult.updatedTables,
        failedTables: databaseResult.failedTables
      });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: `${databaseResult.updatedTables}個のテーブルが更新されました`,
        file: {
          originalName: file.originalname,
          filename: file.filename,
          size: file.size,
          path: file.path
        },
        transcription: transcriptionResult.transcription,
        preprocessing: transcriptionResult.preprocessing,
        databaseResult: databaseResult
      });

    } catch (error) {
      logger.error('Audio to database processing failed', {
        filename: file.filename,
        error: error.message,
        targetTables: targetTables
      });

      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'データベース自動更新中にエラーが発生しました',
        error: error.message
      });
    }
  }

  /**
   * 利用者マスタの自動更新
   */
  async updateUserMaster(req, res) {
    const { file } = req;
    const { userName, staffName, promptType = 'WELFARE' } = req.body;

    if (!userName) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: '利用者名が必要です'
      });
    }

    try {
      logger.info('User master update from audio started', {
        filename: file.filename,
        userName,
        ip: req.ip
      });

      // 音声認識実行
      const transcriptionResult = await audioService.transcribeAudio(file, promptType, true);
      
      // ユーザー情報を準備
      const userInfo = {
        userName: userName,
        staffName: staffName || '支援員名'
      };

      // 利用者マスタ更新
      const updateResult = await databaseService.updateUserMaster(
        transcriptionResult.transcription,
        userInfo
      );

      logger.info('User master update completed', {
        filename: file.filename,
        userName,
        success: updateResult.success
      });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: '利用者マスタが更新されました',
        file: {
          originalName: file.originalname,
          filename: file.filename,
          size: file.size
        },
        transcription: transcriptionResult.transcription,
        updateResult: updateResult
      });

    } catch (error) {
      logger.error('User master update failed', {
        filename: file.filename,
        userName,
        error: error.message
      });

      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: '利用者マスタ更新中にエラーが発生しました',
        error: error.message
      });
    }
  }

  /**
   * サービス提供実績の自動記録
   */
  async recordServiceProvision(req, res) {
    const { file } = req;
    const { 
      userName,
      staffName,
      serviceDate,
      promptType = 'WELFARE'
    } = req.body;

    if (!userName) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: '利用者名が必要です'
      });
    }

    try {
      logger.info('Service provision recording started', {
        filename: file.filename,
        userName,
        serviceDate,
        ip: req.ip
      });

      // 音声認識実行
      const transcriptionResult = await audioService.transcribeAudio(file, promptType, true);
      
      // サービス情報を準備
      const serviceInfo = {
        userName: userName,
        staffName: staffName || '支援員名',
        serviceDate: serviceDate || new Date().toISOString().split('T')[0]
      };

      // サービス提供実績記録
      const recordResult = await databaseService.recordServiceProvision(
        transcriptionResult.transcription,
        serviceInfo
      );

      logger.info('Service provision recording completed', {
        filename: file.filename,
        userName,
        success: recordResult.success
      });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'サービス提供実績が記録されました',
        file: {
          originalName: file.originalname,
          filename: file.filename,
          size: file.size
        },
        transcription: transcriptionResult.transcription,
        recordResult: recordResult
      });

    } catch (error) {
      logger.error('Service provision recording failed', {
        filename: file.filename,
        userName,
        error: error.message
      });

      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'サービス提供実績記録中にエラーが発生しました',
        error: error.message
      });
    }
  }

  /**
   * 目標達成度の自動評価・入力
   */
  async evaluateGoals(req, res) {
    const { file } = req;
    const { userName, staffName, promptType = 'MONITORING' } = req.body;

    if (!userName) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: '利用者名が必要です'
      });
    }

    try {
      logger.info('Goal evaluation started', {
        filename: file.filename,
        userName,
        ip: req.ip
      });

      // 音声認識実行（モニタリング用プロンプト）
      const transcriptionResult = await audioService.transcribeAudio(file, promptType, true);
      
      // ユーザー情報を準備
      const userInfo = {
        userName: userName,
        staffName: staffName || '支援員名'
      };

      // 目標達成度評価・入力
      const evaluationResult = await databaseService.evaluateAndRecordGoals(
        transcriptionResult.transcription,
        userInfo
      );

      logger.info('Goal evaluation completed', {
        filename: file.filename,
        userName,
        evaluationCount: evaluationResult.evaluationCount,
        successCount: evaluationResult.successCount
      });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: `${evaluationResult.successCount}件の目標評価が記録されました`,
        file: {
          originalName: file.originalname,
          filename: file.filename,
          size: file.size
        },
        transcription: transcriptionResult.transcription,
        evaluationResult: evaluationResult
      });

    } catch (error) {
      logger.error('Goal evaluation failed', {
        filename: file.filename,
        userName,
        error: error.message
      });

      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: '目標評価中にエラーが発生しました',
        error: error.message
      });
    }
  }

  /**
   * サポートされているテーブル一覧を取得
   */
  async getSupportedTables(req, res) {
    try {
      const supportedTables = databaseService.getSupportedTables();
      
      logger.info('Supported tables requested', {
        count: supportedTables.length,
        ip: req.ip
      });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'サポートされているテーブル一覧を取得しました',
        tables: supportedTables
      });

    } catch (error) {
      logger.error('Failed to get supported tables', {
        error: error.message
      });

      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'テーブル一覧の取得に失敗しました',
        error: error.message
      });
    }
  }

  /**
   * 推奨テーブルの提案
   */
  async suggestTables(req, res) {
    const { transcriptionText, userContext = {} } = req.body;

    if (!transcriptionText) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'テキストが必要です'
      });
    }

    try {
      const suggestions = databaseService.suggestTables(transcriptionText, userContext);
      const supportedTables = databaseService.getSupportedTables();
      
      // 提案されたテーブルの詳細情報を付加
      const suggestedTables = suggestions.map(tableId => 
        supportedTables.find(table => table.table === tableId)
      ).filter(table => table);

      logger.info('Table suggestions generated', {
        textLength: transcriptionText.length,
        suggestionCount: suggestions.length,
        suggestions: suggestions,
        ip: req.ip
      });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: '推奨テーブルを提案しました',
        suggestions: suggestedTables,
        originalSuggestions: suggestions
      });

    } catch (error) {
      logger.error('Table suggestion failed', {
        error: error.message
      });

      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'テーブル提案の生成に失敗しました',
        error: error.message
      });
    }
  }

  /**
   * データベース更新プレビュー（実際の更新なし）
   */
  async previewDatabaseUpdate(req, res) {
    const { 
      transcriptionText,
      targetTables = [],
      userName,
      staffName 
    } = req.body;

    if (!transcriptionText || !targetTables.length) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'テキストとテーブル選択が必要です'
      });
    }

    try {
      logger.info('Database update preview started', {
        textLength: transcriptionText.length,
        tableCount: targetTables.length,
        ip: req.ip
      });

      // プレビュー用のデータ抽出のみ実行
      const transcriptionData = {
        text: transcriptionText,
        duration: 0,
        segments: []
      };

      const userInfo = {
        userName: userName || '利用者名',
        staffName: staffName || '支援員名'
      };

      // 各テーブル用のデータ抽出（更新はしない）
      const previews = [];
      
      for (const table of targetTables) {
        let extractedData;
        
        switch (table) {
          case 'user_master':
            extractedData = await databaseService.extractUserMasterData(transcriptionText);
            break;
          case 'service_records':
            extractedData = await databaseService.extractServiceRecordData(transcriptionText, userInfo);
            break;
          case 'goal_evaluations':
            extractedData = await databaseService.extractGoalEvaluationData(transcriptionText, userInfo);
            break;
          default:
            extractedData = { message: `${table}のデータ抽出準備中` };
        }

        previews.push({
          table: table,
          extractedData: extractedData,
          estimatedUpdates: this.estimateUpdateCount(table, extractedData)
        });
      }

      logger.info('Database update preview completed', {
        tableCount: previews.length,
        totalEstimatedUpdates: previews.reduce((sum, p) => sum + p.estimatedUpdates, 0)
      });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'データベース更新プレビューを作成しました',
        preview: {
          userInfo: userInfo,
          tablePreviews: previews,
          estimatedExecutionTime: previews.length * 1 // 1テーブルあたり1秒と仮定
        }
      });

    } catch (error) {
      logger.error('Database update preview failed', {
        error: error.message
      });

      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'プレビュー生成に失敗しました',
        error: error.message
      });
    }
  }

  /**
   * 更新件数を推定
   */
  estimateUpdateCount(table, extractedData) {
    if (!extractedData) return 0;
    
    switch (table) {
      case 'user_master':
        return Object.keys(extractedData).length > 0 ? 1 : 0;
      case 'service_records':
        return 1; // 常に1件のサービス記録
      case 'goal_evaluations':
        return Array.isArray(extractedData) ? extractedData.length : 1;
      default:
        return 1;
    }
  }
}

module.exports = new DatabaseController();