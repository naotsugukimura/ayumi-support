const audioService = require('../services/audioService');
const { HTTP_STATUS, SUCCESS_MESSAGES } = require('../utils/constants');
const logger = require('../utils/logger');

class AudioController {
  async uploadAudio(req, res) {
    const { file } = req;
    
    logger.info('Audio file upload', {
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      ip: req.ip
    });

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: SUCCESS_MESSAGES.FILE_UPLOADED,
      file: {
        originalName: file.originalname,
        filename: file.filename,
        size: file.size,
        path: file.path
      }
    });
  }

  async uploadAndTranscribe(req, res) {
    const { file } = req;
    
    logger.info('Audio upload and transcription started', {
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      ip: req.ip
    });

    const result = await audioService.transcribeAudio(file);
    
    logger.info('Audio transcription completed', {
      filename: file.filename,
      textLength: result.transcription.text.length,
      duration: result.transcription.duration
    });

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: SUCCESS_MESSAGES.TRANSCRIPTION_COMPLETED,
      file: {
        originalName: file.originalname,
        filename: file.filename,
        size: file.size,
        path: file.path
      },
      transcription: result.transcription
    });
  }

  async uploadTranscribeAnalyze(req, res) {
    const { file } = req;
    
    logger.info('Audio upload, transcription and analysis started', {
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      ip: req.ip
    });

    const result = await audioService.transcribeAndAnalyze(file);
    
    logger.info('Audio transcription and analysis completed', {
      filename: file.filename,
      textLength: result.transcription.text.length,
      analysisComplete: !!result.analysis
    });

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'アップロード・音声認識・AI解析が完了しました',
      file: {
        originalName: file.originalname,
        filename: file.filename,
        size: file.size,
        path: file.path
      },
      transcription: result.transcription,
      analysis: result.analysis
    });
  }

  async measureAccuracy(req, res) {
    const { file } = req;
    const { groundTruth, promptType = 'WELFARE' } = req.body;
    
    if (!groundTruth) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: '正解テキスト(groundTruth)が必要です'
      });
    }

    logger.info('Accuracy measurement started', {
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      groundTruthLength: groundTruth.length,
      promptType,
      ip: req.ip
    });

    const result = await audioService.measureAccuracy(file, groundTruth, promptType);
    
    logger.info('Accuracy measurement completed', {
      filename: file.filename,
      characterAccuracy: result.accuracy.characterAccuracy,
      wordAccuracy: result.accuracy.wordAccuracy
    });

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: '精度測定が完了しました',
      file: {
        originalName: file.originalname,
        filename: file.filename,
        size: file.size,
        path: file.path
      },
      ...result
    });
  }

  async evaluateQuality(req, res) {
    const { file } = req;
    
    logger.info('Audio quality evaluation started', {
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      ip: req.ip
    });

    const result = await audioService.evaluateAudioQuality(file);
    
    logger.info('Audio quality evaluation completed', {
      filename: file.filename,
      score: result.quality.score,
      grade: result.quality.grade
    });

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: '音質評価が完了しました',
      ...result
    });
  }

  async preprocessAudio(req, res) {
    const { file } = req;
    const options = req.body || {};
    
    logger.info('Audio preprocessing started', {
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      options,
      ip: req.ip
    });

    const result = await audioService.preprocessAudioFile(file, options);
    
    logger.info('Audio preprocessing completed', {
      filename: file.filename,
      processedPath: result.processed.processedPath
    });

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: '音声前処理が完了しました',
      ...result
    });
  }

  async generateAccuracyReport(req, res) {
    const { timeRange = 7 } = req.query;
    const accuracyService = require('../services/accuracyService');
    
    logger.info('Accuracy report generation started', {
      timeRange,
      ip: req.ip
    });

    const report = accuracyService.generateAccuracyReport(parseInt(timeRange));
    
    if (report.error) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: report.error
      });
    }

    logger.info('Accuracy report generated', {
      timeRange,
      measurementCount: report.measurementCount
    });

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: '精度レポートが生成されました',
      report: report
    });
  }

  async getImprovementSuggestions(req, res) {
    const accuracyService = require('../services/accuracyService');
    
    logger.info('Improvement suggestions requested', {
      ip: req.ip
    });

    const suggestions = accuracyService.generateImprovementSuggestions();
    
    logger.info('Improvement suggestions generated', {
      suggestionCount: suggestions.suggestions.length,
      issueCount: suggestions.issueCount
    });

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: '改善提案が生成されました',
      suggestions: suggestions
    });
  }

  async saveAccuracyReport(req, res) {
    const { reportType = 'weekly' } = req.body;
    const accuracyService = require('../services/accuracyService');
    
    logger.info('Accuracy report save requested', {
      reportType,
      ip: req.ip
    });

    const result = await accuracyService.saveReport(reportType);
    
    logger.info('Accuracy report saved', {
      filename: result.filename,
      path: result.path
    });

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: '精度レポートが保存されました',
      ...result
    });
  }
}

  // デモ用: APIキー無しでのサンプル文字起こし
  async demoTranscribe(req, res) {
    const { file } = req;
    
    logger.info('Demo transcription (no API key)', {
      filename: file.filename,
      size: file.size
    });

    // サンプルデータを返す
    const demoResult = {
      transcription: {
        text: `これはデモ用のサンプル文字起こし結果です。実際の音声ファイル「${file.originalname}」が正常にアップロードされました。本機能を使用するには OpenAI API キーと Anthropic API キーが必要です。`,
        language: 'ja',
        duration: 30.5,
        wordCount: 50,
        segments: []
      },
      preprocessing: {
        applied: false,
        reason: 'Demo mode - API keys not configured'
      }
    };

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'デモ用サンプル結果 - 実際の音声認識にはAPIキーが必要です',
      file: {
        originalName: file.originalname,
        filename: file.filename,
        size: file.size
      },
      ...demoResult,
      demo: true,
      note: '実際の音声認識機能を使用するには .env ファイルに OPENAI_API_KEY と ANTHROPIC_API_KEY を設定してください'
    });
  }

  // テスト用: シンプルなエコーバック
  async testUpload(req, res) {
    const { file } = req;
    
    logger.info('Test upload', {
      filename: file.filename,
      size: file.size
    });

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'テストアップロード成功！サーバーとの接続は正常です。',
      file: {
        originalName: file.originalname,
        filename: file.filename,
        size: file.size,
        type: file.mimetype
      },
      server: {
        timestamp: new Date().toISOString(),
        status: 'healthy',
        features: ['upload', 'file-validation', 'basic-processing']
      },
      test: true
    });
  }
}

module.exports = new AudioController();