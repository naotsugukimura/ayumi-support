const multiDocumentService = require('../services/multiDocumentService');
const audioService = require('../services/audioService');
const { HTTP_STATUS, SUCCESS_MESSAGES } = require('../utils/constants');
const logger = require('../utils/logger');

/**
 * 複数帳票同時生成コントローラー
 */
class MultiDocumentController {
  
  /**
   * 音声から複数帳票を同時生成
   */
  async generateMultipleFromAudio(req, res) {
    const { file } = req;
    const { 
      selectedDocuments = [], 
      userName, 
      staffName,
      promptType = 'WELFARE' 
    } = req.body;

    if (!selectedDocuments || selectedDocuments.length === 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: '生成する帳票を選択してください'
      });
    }

    try {
      logger.info('Multiple document generation from audio started', {
        filename: file.filename,
        documentCount: selectedDocuments.length,
        documentTypes: selectedDocuments,
        userName,
        staffName,
        ip: req.ip
      });

      // 音声認識実行（前処理付き）
      const transcriptionResult = await audioService.transcribeAudio(file, promptType, true);
      
      // ユーザー情報を準備
      const userInfo = {
        userName: userName || '利用者名',
        staffName: staffName || '支援員名',
        age: req.body.age,
        disabilityType: req.body.disabilityType,
        assessor: req.body.assessor || staffName
      };

      // 複数帳票を同時生成
      const generationResult = await multiDocumentService.generateMultipleDocuments(
        transcriptionResult.transcription,
        selectedDocuments,
        userInfo
      );

      logger.info('Multiple document generation completed', {
        filename: file.filename,
        successCount: generationResult.generatedCount,
        failureCount: generationResult.failedCount,
        documents: generationResult.documents.map(doc => doc.filename)
      });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: `${generationResult.generatedCount}件の帳票生成が完了しました`,
        file: {
          originalName: file.originalname,
          filename: file.filename,
          size: file.size,
          path: file.path
        },
        transcription: transcriptionResult.transcription,
        preprocessing: transcriptionResult.preprocessing,
        generationResult: generationResult
      });

    } catch (error) {
      logger.error('Multiple document generation failed', {
        filename: file.filename,
        error: error.message,
        documentTypes: selectedDocuments
      });

      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: '複数帳票生成中にエラーが発生しました',
        error: error.message
      });
    }
  }

  /**
   * テキストから複数帳票を生成
   */
  async generateMultipleFromText(req, res) {
    const { 
      transcriptionText,
      selectedDocuments = [],
      userName,
      staffName,
      duration = 0
    } = req.body;

    if (!transcriptionText) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'テキストが必要です'
      });
    }

    if (!selectedDocuments || selectedDocuments.length === 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: '生成する帳票を選択してください'
      });
    }

    try {
      logger.info('Multiple document generation from text started', {
        textLength: transcriptionText.length,
        documentCount: selectedDocuments.length,
        documentTypes: selectedDocuments,
        ip: req.ip
      });

      // 音声認識データを模擬
      const transcriptionData = {
        text: transcriptionText,
        duration: duration,
        segments: []
      };

      // ユーザー情報を準備
      const userInfo = {
        userName: userName || '利用者名',
        staffName: staffName || '支援員名',
        age: req.body.age,
        disabilityType: req.body.disabilityType,
        assessor: req.body.assessor || staffName
      };

      // 複数帳票を同時生成
      const generationResult = await multiDocumentService.generateMultipleDocuments(
        transcriptionData,
        selectedDocuments,
        userInfo
      );

      logger.info('Multiple document generation from text completed', {
        textLength: transcriptionText.length,
        successCount: generationResult.generatedCount,
        failureCount: generationResult.failedCount
      });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: `${generationResult.generatedCount}件の帳票生成が完了しました`,
        generationResult: generationResult
      });

    } catch (error) {
      logger.error('Multiple document generation from text failed', {
        error: error.message,
        documentTypes: selectedDocuments
      });

      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'テキストからの帳票生成中にエラーが発生しました',
        error: error.message
      });
    }
  }

  /**
   * 利用可能な帳票タイプ一覧を取得
   */
  async getAvailableDocuments(req, res) {
    try {
      const documentTypes = multiDocumentService.getAvailableDocumentTypes();
      
      logger.info('Available document types requested', {
        count: documentTypes.length,
        ip: req.ip
      });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: '利用可能な帳票タイプを取得しました',
        documentTypes: documentTypes
      });

    } catch (error) {
      logger.error('Failed to get available document types', {
        error: error.message
      });

      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: '帳票タイプの取得に失敗しました',
        error: error.message
      });
    }
  }

  /**
   * 推奨帳票の提案
   */
  async suggestDocuments(req, res) {
    const { transcriptionText, userContext = {} } = req.body;

    if (!transcriptionText) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'テキストが必要です'
      });
    }

    try {
      const suggestions = multiDocumentService.suggestDocuments(transcriptionText, userContext);
      const availableTypes = multiDocumentService.getAvailableDocumentTypes();
      
      // 提案された帳票の詳細情報を付加
      const suggestedDocuments = suggestions.map(type => 
        availableTypes.find(doc => doc.type === type)
      ).filter(doc => doc);

      logger.info('Document suggestions generated', {
        textLength: transcriptionText.length,
        suggestionCount: suggestions.length,
        suggestions: suggestions,
        ip: req.ip
      });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: '推奨帳票を提案しました',
        suggestions: suggestedDocuments,
        originalSuggestions: suggestions
      });

    } catch (error) {
      logger.error('Document suggestion failed', {
        error: error.message
      });

      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: '帳票提案の生成に失敗しました',
        error: error.message
      });
    }
  }

  /**
   * 帳票生成プレビュー（実際の生成なし）
   */
  async previewGeneration(req, res) {
    const { 
      transcriptionText,
      selectedDocuments = [],
      userName,
      staffName 
    } = req.body;

    if (!transcriptionText || !selectedDocuments.length) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'テキストと帳票選択が必要です'
      });
    }

    try {
      logger.info('Document generation preview started', {
        textLength: transcriptionText.length,
        documentCount: selectedDocuments.length,
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

      // 構造化データの抽出のみ
      const structuredData = await multiDocumentService.extractStructuredData(
        transcriptionData, 
        userInfo
      );

      // 各帳票用のデータを準備（生成はしない）
      const documentPreviews = selectedDocuments.map(docType => ({
        documentType: docType,
        extractedData: multiDocumentService.prepareDocumentData(docType, structuredData, userInfo),
        estimatedPages: this.estimateDocumentPages(docType, structuredData)
      }));

      logger.info('Document generation preview completed', {
        documentCount: documentPreviews.length,
        estimatedTotalPages: documentPreviews.reduce((sum, doc) => sum + doc.estimatedPages, 0)
      });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: '帳票生成プレビューを作成しました',
        preview: {
          structuredData: structuredData,
          documentPreviews: documentPreviews,
          estimatedGenerationTime: documentPreviews.length * 2 // 1帳票あたり2秒と仮定
        }
      });

    } catch (error) {
      logger.error('Document generation preview failed', {
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
   * 帳票のページ数を推定
   */
  estimateDocumentPages(documentType, structuredData) {
    const textLength = structuredData.transcription?.fullText?.length || 0;
    
    // 帳票タイプ別の基本ページ数
    const basePages = {
      'individual-support-plan': 2,
      'monitoring-record': 1,
      'family-report': 1,
      'service-record': 1,
      'assessment-sheet': 2
    };

    // テキスト量に基づく追加ページ
    const additionalPages = Math.ceil(textLength / 2000); // 2000文字で1ページ追加
    
    return (basePages[documentType] || 1) + additionalPages;
  }
}

module.exports = new MultiDocumentController();