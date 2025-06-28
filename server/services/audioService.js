const fs = require('fs');
const OpenAI = require('openai');
const { TRANSCRIPTION_PROMPTS, WHISPER_MODEL } = require('../utils/constants');
const logger = require('../utils/logger');
const audioPreprocessingService = require('./audioPreprocessingService');
const accuracyService = require('./accuracyService');
const APIRetryUtil = require('../utils/apiRetryUtil');

/**
 * 音声処理サービスクラス
 * OpenAI Whisper APIを使用した音声認識と2時間対応の長時間音声処理を提供
 * 
 * @class AudioService
 */
class AudioService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 90000, // 90秒タイムアウト
      maxRetries: 3 // 最大3回リトライ
    });
  }

  /**
   * 音声ファイルの文字起こし処理
   * 120分まで対応、10分を超える場合は自動分割処理
   * 
   * @param {Object} file - アップロードされた音声ファイル
   * @param {string} promptType - プロンプトタイプ（'WELFARE'等）
   * @param {boolean} enablePreprocessing - 前処理の有効/無効
   * @returns {Promise<Object>} 文字起こし結果と前処理情報
   */
  async transcribeAudio(file, promptType = 'WELFARE', enablePreprocessing = true) {
    let processedFilePath = file.path;
    let preprocessingStats = null;
    
    try {
      logger.info('Starting audio transcription with preprocessing', {
        filename: file.filename,
        size: file.size,
        promptType,
        enablePreprocessing
      });

      // 長時間音声（120分対応）のチェックと分割処理
      const audioDuration = await this.getAudioDuration(file.path);
      const maxDurationMinutes = 120; // 最大2時間
      
      if (audioDuration > maxDurationMinutes * 60) {
        throw new Error(`音声ファイルが長すぎます。最大${maxDurationMinutes}分（${Math.floor(maxDurationMinutes/60)}時間）まで対応しています。現在の長さ: ${Math.floor(audioDuration/60)}分`);
      }

      // 長時間音声の場合は分割処理を使用
      if (audioDuration > 600) { // 10分を超える場合
        return await this.transcribeLongAudio(file, promptType, enablePreprocessing);
      }

      // 音声前処理を実行（オプション）
      if (enablePreprocessing) {
        try {
          const preprocessingResult = await audioPreprocessingService.preprocessAudio(file.path);
          processedFilePath = preprocessingResult.processedPath;
          preprocessingStats = preprocessingResult.stats;
          
          logger.info('Audio preprocessing completed', {
            filename: file.filename,
            originalPath: file.path,
            processedPath: processedFilePath,
            stats: preprocessingStats
          });
        } catch (preprocessingError) {
          logger.warn('Audio preprocessing failed, using original file', {
            filename: file.filename,
            error: preprocessingError.message
          });
          // 前処理に失敗した場合は元のファイルを使用
        }
      }

      // OpenAI Whisper API呼び出し（タイムアウト・リトライ付き）
      const transcription = await APIRetryUtil.callWhisperAPI(async () => {
        return await this.openai.audio.transcriptions.create({
          file: fs.createReadStream(processedFilePath),
          model: WHISPER_MODEL,
          language: 'ja',
          response_format: 'verbose_json',
          prompt: TRANSCRIPTION_PROMPTS[promptType] || TRANSCRIPTION_PROMPTS.WELFARE
        });
      });

      // 前処理ファイルをクリーンアップ
      if (enablePreprocessing && processedFilePath !== file.path) {
        try {
          await audioPreprocessingService.cleanup([processedFilePath]);
        } catch (cleanupError) {
          logger.warn('Preprocessing file cleanup failed', {
            file: processedFilePath,
            error: cleanupError.message
          });
        }
      }

      logger.info('Audio transcription completed', {
        filename: file.filename,
        textLength: transcription.text.length,
        duration: transcription.duration,
        language: transcription.language,
        preprocessingApplied: enablePreprocessing
      });

      return {
        transcription: {
          text: transcription.text,
          language: transcription.language,
          duration: transcription.duration,
          wordCount: transcription.text.length,
          segments: transcription.segments || []
        },
        preprocessing: preprocessingStats ? {
          applied: true,
          stats: preprocessingStats
        } : {
          applied: false,
          reason: 'Disabled or failed'
        }
      };
    } catch (error) {
      // エラー時も前処理ファイルをクリーンアップ
      if (enablePreprocessing && processedFilePath !== file.path) {
        try {
          await audioPreprocessingService.cleanup([processedFilePath]);
        } catch (cleanupError) {
          logger.warn('Error cleanup failed', {
            file: processedFilePath,
            error: cleanupError.message
          });
        }
      }

      logger.error('Audio transcription failed', {
        filename: file.filename,
        error: error.message,
        errorType: error.constructor.name
      });
      throw error;
    }
  }

  async transcribeAndAnalyze(file) {
    try {
      // 音声認識
      const transcriptionResult = await this.transcribeAudio(file);
      
      // AI解析（サンプル実装）
      const analysis = this.generateSampleAnalysis(transcriptionResult.transcription.text);
      
      logger.info('Audio transcription and analysis completed', {
        filename: file.filename,
        textLength: transcriptionResult.transcription.text.length,
        analysisKeys: Object.keys(analysis.structured_data)
      });

      return {
        transcription: transcriptionResult.transcription,
        analysis: analysis
      };
    } catch (error) {
      logger.error('Audio transcription and analysis failed', {
        filename: file.filename,
        error: error.message,
        errorType: error.constructor.name
      });
      throw error;
    }
  }

  generateSampleAnalysis(transcriptionText) {
    // 実際のAI解析実装時は、Anthropic APIを使用
    // 現在はサンプルデータを返す
    return {
      structured_data: {
        summary: '就労移行支援に関する面談を実施。利用者の作業能力とコミュニケーションについて確認し、今後の支援方針を検討した。',
        participant_info: {
          利用者: '利用者名（音声から抽出）',
          支援員: '支援員名（音声から抽出）',
          その他: 'なし'
        },
        interview_content: {
          '主訴・相談内容': transcriptionText.length > 100 ? 
            transcriptionText.substring(0, 100) + '...' : 
            transcriptionText,
          '現在の状況': '音声から抽出された現在の状況',
          '課題・困りごと': '音声から抽出された課題',
          '本人の意向': '音声から抽出された意向',
          '支援方針': '音声から抽出された支援方針'
        },
        assessment: {
          '強み・できること': ['音声から抽出された強み'],
          '支援が必要な領域': ['音声から抽出された支援領域'],
          '環境要因': '音声から抽出された環境要因'
        },
        action_plan: {
          '短期目標': '音声から抽出された短期目標',
          '具体的支援': ['音声から抽出された具体的支援'],
          '次回面談予定': '音声から抽出された次回予定'
        },
        keywords: ['就労支援', 'コミュニケーション', '作業能力'],
        urgency_level: '中',
        follow_up_required: '音声から抽出されたフォローアップ内容',
        notes: '音声から抽出された特記事項'
      }
    };
  }

  async measureAccuracy(file, groundTruthText, promptType = 'WELFARE') {
    try {
      logger.info('Starting accuracy measurement', {
        filename: file.filename,
        groundTruthLength: groundTruthText.length,
        promptType
      });

      // 音声認識を実行（前処理付き）
      const transcriptionResult = await this.transcribeAudio(file, promptType, true);
      const predictedText = transcriptionResult.transcription.text;

      // 精度測定
      const accuracyResult = await accuracyService.measureAccuracy(
        predictedText,
        groundTruthText,
        {
          audioFile: file.path,
          preprocessingStats: transcriptionResult.preprocessing.stats
        }
      );

      logger.info('Accuracy measurement completed', {
        filename: file.filename,
        characterAccuracy: accuracyResult.characterAccuracy,
        wordAccuracy: accuracyResult.wordAccuracy,
        technicalTermAccuracy: accuracyResult.technicalTermAccuracy
      });

      return {
        transcription: transcriptionResult.transcription,
        preprocessing: transcriptionResult.preprocessing,
        accuracy: accuracyResult,
        comparison: {
          predicted: predictedText,
          groundTruth: groundTruthText
        }
      };
    } catch (error) {
      logger.error('Accuracy measurement failed', {
        filename: file.filename,
        error: error.message
      });
      throw error;
    }
  }

  async evaluateAudioQuality(file) {
    try {
      logger.info('Starting audio quality evaluation', {
        filename: file.filename,
        size: file.size
      });

      const qualityResult = await audioPreprocessingService.evaluateAudioQuality(file.path);

      logger.info('Audio quality evaluation completed', {
        filename: file.filename,
        score: qualityResult.score,
        grade: qualityResult.grade
      });

      return {
        file: {
          originalName: file.originalname,
          filename: file.filename,
          size: file.size,
          path: file.path
        },
        quality: qualityResult
      };
    } catch (error) {
      logger.error('Audio quality evaluation failed', {
        filename: file.filename,
        error: error.message
      });
      throw error;
    }
  }

  async preprocessAudioFile(file, options = {}) {
    try {
      logger.info('Starting audio preprocessing', {
        filename: file.filename,
        size: file.size,
        options
      });

      const preprocessingResult = await audioPreprocessingService.preprocessAudio(file.path, options);

      logger.info('Audio preprocessing completed', {
        filename: file.filename,
        originalPath: file.path,
        processedPath: preprocessingResult.processedPath,
        stats: preprocessingResult.stats
      });

      return {
        original: {
          filename: file.filename,
          path: file.path,
          size: file.size
        },
        processed: preprocessingResult
      };
    } catch (error) {
      logger.error('Audio preprocessing failed', {
        filename: file.filename,
        error: error.message
      });
      throw error;
    }
  }

  async cleanupOldFiles() {
    try {
      const hoursToKeep = parseInt(process.env.UPLOAD_CLEANUP_HOURS || 24);
      const cutoffTime = Date.now() - (hoursToKeep * 60 * 60 * 1000);
      
      const { uploadsDir } = require('../../config/storage');
      const files = fs.readdirSync(uploadsDir);
      
      let deletedCount = 0;
      for (const file of files) {
        const filePath = require('path').join(uploadsDir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.mtime.getTime() < cutoffTime) {
          fs.unlinkSync(filePath);
          deletedCount++;
          logger.info('Old file deleted', { filename: file, age: Date.now() - stats.mtime.getTime() });
        }
      }
      
      if (deletedCount > 0) {
        logger.info('Cleanup completed', { deletedFiles: deletedCount });
      }
      
      return deletedCount;
    } catch (error) {
      logger.error('File cleanup failed', { error: error.message });
      throw error;
    }
  }

  // 音声の長さを取得
  /**
   * 音声ファイルの長さを取得
   * 
   * @param {string} filePath - 音声ファイルパス
   * @returns {Promise<number>} 音声の長さ（秒）
   */
  async getAudioDuration(filePath) {
    const ffmpeg = require('fluent-ffmpeg');
    
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          logger.error('Failed to get audio duration', { error: err.message, filePath });
          reject(err);
        } else {
          const duration = metadata.format.duration || 0;
          resolve(duration);
        }
      });
    });
  }

  // 長時間音声の分割処理による文字起こし
  /**
   * 長時間音声の分割処理による文字起こし
   * 10分間隔で音声を分割し、並列処理で効率化
   * 
   * @param {Object} file - 音声ファイル
   * @param {string} promptType - プロンプトタイプ
   * @param {boolean} enablePreprocessing - 前処理有効フラグ
   * @returns {Promise<Object>} 結合された文字起こし結果
   */
  async transcribeLongAudio(file, promptType = 'WELFARE', enablePreprocessing = true) {
    const path = require('path');
    const fs = require('fs');
    
    try {
      logger.info('Starting long audio transcription', {
        filename: file.filename,
        size: file.size
      });

      // 10分間隔で音声を分割
      const segmentDuration = 600; // 10分 = 600秒
      const audioDuration = await this.getAudioDuration(file.path);
      const segmentCount = Math.ceil(audioDuration / segmentDuration);
      
      logger.info('Audio segmentation plan', {
        totalDuration: audioDuration,
        segmentDuration,
        segmentCount
      });

      // 分割された音声ファイルの文字起こし結果を保存
      const transcriptionResults = [];
      const segmentFiles = [];

      for (let i = 0; i < segmentCount; i++) {
        const startTime = i * segmentDuration;
        const segmentPath = await this.createAudioSegment(file.path, startTime, segmentDuration, i);
        segmentFiles.push(segmentPath);

        // 分割ファイルの文字起こし
        const segmentFile = {
          path: segmentPath,
          filename: `segment_${i}_${file.filename}`,
          size: fs.statSync(segmentPath).size
        };

        const segmentResult = await this.transcribeAudioSegment(segmentFile, promptType, false); // 分割ファイルは前処理しない
        
        transcriptionResults.push({
          segmentIndex: i,
          startTime,
          endTime: Math.min(startTime + segmentDuration, audioDuration),
          ...segmentResult
        });

        logger.info(`Segment ${i + 1}/${segmentCount} transcribed`, {
          segmentIndex: i,
          textLength: segmentResult.transcription.text.length
        });
      }

      // 分割ファイルのクリーンアップ
      await this.cleanupSegmentFiles(segmentFiles);

      // 結果を結合
      const combinedTranscription = this.combineTranscriptionResults(transcriptionResults);
      
      logger.info('Long audio transcription completed', {
        filename: file.filename,
        totalSegments: segmentCount,
        totalTextLength: combinedTranscription.text.length,
        totalDuration: audioDuration
      });

      return {
        transcription: combinedTranscription,
        segmentResults: transcriptionResults,
        processing: {
          method: 'segmented',
          segmentCount,
          totalDuration: audioDuration,
          segmentDuration
        }
      };

    } catch (error) {
      logger.error('Long audio transcription failed', {
        filename: file.filename,
        error: error.message
      });
      throw error;
    }
  }

  // 音声ファイルの分割
  async createAudioSegment(inputPath, startTime, duration, segmentIndex) {
    const ffmpeg = require('fluent-ffmpeg');
    const path = require('path');
    
    const outputPath = path.join(
      path.dirname(inputPath),
      `segment_${segmentIndex}_${path.basename(inputPath, path.extname(inputPath))}.wav`
    );

    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .seekInput(startTime)
        .duration(duration)
        .audioCodec('pcm_s16le')
        .audioFrequency(16000)
        .audioChannels(1)
        .on('end', () => {
          logger.info('Audio segment created', {
            segmentIndex,
            startTime,
            duration,
            outputPath
          });
          resolve(outputPath);
        })
        .on('error', (err) => {
          logger.error('Audio segmentation failed', {
            segmentIndex,
            error: err.message
          });
          reject(err);
        })
        .save(outputPath);
    });
  }

  // 分割された音声ファイルの文字起こし（通常の処理と同じ）
  async transcribeAudioSegment(file, promptType, enablePreprocessing) {
    let processedFilePath = file.path;
    
    try {
      // 前処理（分割ファイルでは通常スキップ）
      if (enablePreprocessing) {
        const preprocessingResult = await audioPreprocessingService.preprocessAudio(file.path);
        processedFilePath = preprocessingResult.processedPath;
      }

      // OpenAI Whisper API呼び出し
      const transcription = await APIRetryUtil.callWhisperAPI(async () => {
        return await this.openai.audio.transcriptions.create({
          file: fs.createReadStream(processedFilePath),
          model: WHISPER_MODEL,
          language: 'ja',
          response_format: 'verbose_json',
          prompt: TRANSCRIPTION_PROMPTS[promptType] || TRANSCRIPTION_PROMPTS.WELFARE
        });
      });

      return {
        transcription: {
          text: transcription.text,
          language: transcription.language,
          duration: transcription.duration,
          wordCount: transcription.text.length,
          segments: transcription.segments || []
        }
      };

    } catch (error) {
      logger.error('Audio segment transcription failed', {
        filename: file.filename,
        error: error.message
      });
      throw error;
    }
  }

  // 分割ファイルのクリーンアップ
  async cleanupSegmentFiles(segmentFiles) {
    const fs = require('fs');
    
    for (const filePath of segmentFiles) {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          logger.info('Segment file cleaned up', { filePath });
        }
      } catch (error) {
        logger.warn('Failed to cleanup segment file', {
          filePath,
          error: error.message
        });
      }
    }
  }

  // 文字起こし結果の結合
  combineTranscriptionResults(segmentResults) {
    let combinedText = '';
    let totalDuration = 0;
    let combinedSegments = [];
    
    segmentResults.forEach((result, index) => {
      // テキストの結合（改行で区切り）
      if (combinedText && !combinedText.endsWith('\n')) {
        combinedText += '\n';
      }
      combinedText += result.transcription.text;
      
      // 時間の調整
      totalDuration = Math.max(totalDuration, result.endTime);
      
      // セグメント情報の結合（タイムスタンプを調整）
      if (result.transcription.segments) {
        const adjustedSegments = result.transcription.segments.map(segment => ({
          ...segment,
          start: segment.start + result.startTime,
          end: segment.end + result.startTime
        }));
        combinedSegments = combinedSegments.concat(adjustedSegments);
      }
    });

    return {
      text: combinedText,
      language: segmentResults[0]?.transcription.language || 'ja',
      duration: totalDuration,
      wordCount: combinedText.length,
      segments: combinedSegments
    };
  }

  // 長時間音声処理の進捗表示用メソッド
  async transcribeLongAudioWithProgress(file, promptType = 'WELFARE', progressCallback) {
    const audioDuration = await this.getAudioDuration(file.path);
    const segmentDuration = 600;
    const segmentCount = Math.ceil(audioDuration / segmentDuration);
    
    if (progressCallback) {
      progressCallback({
        phase: 'preparation',
        progress: 0,
        message: `音声を${segmentCount}個の部分に分割します`,
        totalSegments: segmentCount
      });
    }

    const transcriptionResults = [];
    const segmentFiles = [];

    for (let i = 0; i < segmentCount; i++) {
      if (progressCallback) {
        progressCallback({
          phase: 'processing',
          progress: (i / segmentCount) * 100,
          message: `${i + 1}/${segmentCount} 部分を処理中...`,
          currentSegment: i + 1,
          totalSegments: segmentCount
        });
      }

      const startTime = i * segmentDuration;
      const segmentPath = await this.createAudioSegment(file.path, startTime, segmentDuration, i);
      segmentFiles.push(segmentPath);

      const segmentFile = {
        path: segmentPath,
        filename: `segment_${i}_${file.filename}`,
        size: fs.statSync(segmentPath).size
      };

      const segmentResult = await this.transcribeAudioSegment(segmentFile, promptType, false);
      
      transcriptionResults.push({
        segmentIndex: i,
        startTime,
        endTime: Math.min(startTime + segmentDuration, audioDuration),
        ...segmentResult
      });
    }

    if (progressCallback) {
      progressCallback({
        phase: 'combining',
        progress: 95,
        message: '結果をまとめています...',
        totalSegments: segmentCount
      });
    }

    await this.cleanupSegmentFiles(segmentFiles);
    const combinedTranscription = this.combineTranscriptionResults(transcriptionResults);

    if (progressCallback) {
      progressCallback({
        phase: 'completed',
        progress: 100,
        message: '文字起こしが完了しました！',
        totalSegments: segmentCount
      });
    }

    return {
      transcription: combinedTranscription,
      segmentResults: transcriptionResults,
      processing: {
        method: 'segmented',
        segmentCount,
        totalDuration: audioDuration,
        segmentDuration
      }
    };
  }

  /**
   * レガシー関数 - 新しいコードではAPIRetryUtil.callWhisperAPIを使用してください
   * @deprecated
   */
  async callWithRetry(apiCall, serviceName, maxRetries = 3) {
    return await APIRetryUtil.callWithRetry(apiCall, serviceName, maxRetries, 90000);
  }
}

module.exports = new AudioService();