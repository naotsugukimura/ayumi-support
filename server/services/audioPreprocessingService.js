const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

class AudioPreprocessingService {
  constructor() {
    this.tempDir = path.join(__dirname, '../../temp');
    this.ensureTempDirectory();
  }

  /**
   * 一時ディレクトリの確保
   */
  ensureTempDirectory() {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * 音声ファイルの前処理（品質向上）
   */
  async preprocessAudio(inputPath, options = {}) {
    const filename = path.basename(inputPath, path.extname(inputPath));
    const outputPath = path.join(this.tempDir, `processed_${filename}.wav`);

    const defaultOptions = {
      // ノイズ除去
      highpassFilter: 80,        // 低周波ノイズ除去（Hz）
      lowpassFilter: 8000,       // 高周波ノイズ除去（Hz） 
      enableDynamicNorm: true,   // 音量正規化
      
      // Whisper最適化
      sampleRate: 16000,         // サンプリングレート
      channels: 1,               // モノラル変換
      bitDepth: 16,              // ビット深度
      
      // 音質改善
      enableDeEss: true,         // デエッサー（サ行ノイズ除去）
      enableCompressor: true,    // コンプレッサー（音量平均化）
      
      // 品質設定
      removeClipping: true,      // クリッピング除去
      normalizeLoudness: true    // ラウドネス正規化
    };

    const settings = { ...defaultOptions, ...options };

    try {
      logger.info('Audio preprocessing started', {
        inputPath,
        outputPath,
        settings
      });

      await this.processAudioWithFFmpeg(inputPath, outputPath, settings);

      // 処理結果の検証
      const stats = await this.analyzeAudioFile(outputPath);
      
      logger.info('Audio preprocessing completed', {
        inputPath,
        outputPath,
        stats
      });

      return {
        processedPath: outputPath,
        originalPath: inputPath,
        stats,
        settings
      };

    } catch (error) {
      logger.error('Audio preprocessing failed', {
        inputPath,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * FFmpegを使った音声処理
   */
  async processAudioWithFFmpeg(inputPath, outputPath, settings) {
    return new Promise((resolve, reject) => {
      let command = ffmpeg(inputPath);

      // 音声フィルター設定
      const filters = [];

      // ノイズ除去フィルター
      if (settings.highpassFilter) {
        filters.push(`highpass=f=${settings.highpassFilter}`);
      }
      if (settings.lowpassFilter) {
        filters.push(`lowpass=f=${settings.lowpassFilter}`);
      }

      // デエッサー（サ行ノイズ除去）
      if (settings.enableDeEss) {
        filters.push('deesser');
      }

      // コンプレッサー（音量平均化）
      if (settings.enableCompressor) {
        filters.push('acompressor=threshold=0.089:ratio=9:attack=1:release=50');
      }

      // 動的音量正規化
      if (settings.enableDynamicNorm) {
        filters.push('dynaudnorm=p=0.9:s=5');
      }

      // クリッピング除去
      if (settings.removeClipping) {
        filters.push('alimiter=level_in=1:level_out=0.8:limit=0.7');
      }

      // ラウドネス正規化
      if (settings.normalizeLoudness) {
        filters.push('loudnorm=I=-16:TP=-1.5:LRA=11');
      }

      // フィルター適用
      if (filters.length > 0) {
        command = command.audioFilters(filters);
      }

      // 出力設定
      command
        .audioFrequency(settings.sampleRate)
        .audioChannels(settings.channels)
        .audioBitrate('128k')
        .audioCodec('pcm_s16le')
        .output(outputPath)
        .on('end', () => {
          logger.debug('FFmpeg processing completed', { outputPath });
          resolve();
        })
        .on('error', (error) => {
          logger.error('FFmpeg processing failed', { 
            error: error.message,
            inputPath,
            outputPath 
          });
          reject(error);
        })
        .on('progress', (progress) => {
          if (progress.percent) {
            logger.debug('FFmpeg progress', { 
              percent: Math.round(progress.percent),
              timemark: progress.timemark
            });
          }
        })
        .run();
    });
  }

  /**
   * 音声ファイル分析
   */
  async analyzeAudioFile(filePath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          reject(err);
          return;
        }

        const audioStream = metadata.streams.find(stream => stream.codec_type === 'audio');
        
        if (!audioStream) {
          reject(new Error('音声ストリームが見つかりません'));
          return;
        }

        const stats = {
          duration: parseFloat(metadata.format.duration),
          sampleRate: parseInt(audioStream.sample_rate),
          channels: parseInt(audioStream.channels),
          bitRate: parseInt(audioStream.bit_rate || metadata.format.bit_rate),
          codec: audioStream.codec_name,
          size: parseInt(metadata.format.size),
          format: metadata.format.format_name
        };

        resolve(stats);
      });
    });
  }

  /**
   * 音声を時間でセグメント分割
   */
  async segmentAudio(inputPath, segmentDuration = 300) { // 5分ごと
    const filename = path.basename(inputPath, path.extname(inputPath));
    const segments = [];

    try {
      // 音声ファイルの総時間を取得
      const stats = await this.analyzeAudioFile(inputPath);
      const totalDuration = stats.duration;
      const segmentCount = Math.ceil(totalDuration / segmentDuration);

      logger.info('Audio segmentation started', {
        inputPath,
        totalDuration,
        segmentDuration,
        segmentCount
      });

      // セグメントごとに分割
      for (let i = 0; i < segmentCount; i++) {
        const startTime = i * segmentDuration;
        const endTime = Math.min((i + 1) * segmentDuration, totalDuration);
        const segmentPath = path.join(this.tempDir, `${filename}_segment_${i + 1}.wav`);

        await this.extractSegment(inputPath, segmentPath, startTime, endTime);
        
        segments.push({
          path: segmentPath,
          startTime,
          endTime,
          duration: endTime - startTime,
          segmentNumber: i + 1
        });

        logger.debug('Segment created', {
          segmentNumber: i + 1,
          startTime,
          endTime,
          path: segmentPath
        });
      }

      logger.info('Audio segmentation completed', {
        inputPath,
        segmentCount: segments.length
      });

      return segments;

    } catch (error) {
      logger.error('Audio segmentation failed', {
        inputPath,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 音声セグメント抽出
   */
  async extractSegment(inputPath, outputPath, startTime, endTime) {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .seekInput(startTime)
        .duration(endTime - startTime)
        .audioCodec('pcm_s16le')
        .output(outputPath)
        .on('end', () => resolve())
        .on('error', (error) => reject(error))
        .run();
    });
  }

  /**
   * 音質評価
   */
  async evaluateAudioQuality(filePath) {
    try {
      const stats = await this.analyzeAudioFile(filePath);
      
      let score = 0;
      let factors = [];

      // サンプリングレート評価
      if (stats.sampleRate >= 16000) {
        score += 25;
      } else if (stats.sampleRate >= 8000) {
        score += 15;
        factors.push('低サンプリングレート');
      } else {
        score += 5;
        factors.push('極低サンプリングレート');
      }

      // ビットレート評価
      if (stats.bitRate >= 128000) {
        score += 25;
      } else if (stats.bitRate >= 64000) {
        score += 15;
        factors.push('低ビットレート');
      } else {
        score += 5;
        factors.push('極低ビットレート');
      }

      // チャンネル数評価
      if (stats.channels === 1) {
        score += 25; // モノラルはWhisperに最適
      } else if (stats.channels === 2) {
        score += 20;
      } else {
        score += 10;
        factors.push('多チャンネル音声');
      }

      // 時間長評価
      if (stats.duration <= 600) { // 10分以下
        score += 25;
      } else if (stats.duration <= 1800) { // 30分以下
        score += 20;
      } else {
        score += 10;
        factors.push('長時間音声');
      }

      return {
        score: Math.min(100, score),
        grade: this.getQualityGrade(score),
        factors: factors,
        stats: stats,
        recommendations: this.getQualityRecommendations(stats, factors)
      };

    } catch (error) {
      logger.error('Audio quality evaluation failed', {
        filePath,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 音質グレード判定
   */
  getQualityGrade(score) {
    if (score >= 90) return 'A+';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C';
    return 'D';
  }

  /**
   * 音質改善推奨事項
   */
  getQualityRecommendations(stats, factors) {
    const recommendations = [];

    if (stats.sampleRate < 16000) {
      recommendations.push('サンプリングレートを16kHz以上に設定してください');
    }

    if (stats.bitRate < 128000) {
      recommendations.push('ビットレートを128kbps以上に設定してください');
    }

    if (stats.channels > 1) {
      recommendations.push('モノラル録音を推奨します');
    }

    if (stats.duration > 1800) {
      recommendations.push('30分以下に分割することを推奨します');
    }

    if (factors.length === 0) {
      recommendations.push('音質は良好です');
    }

    return recommendations;
  }

  /**
   * 一時ファイルのクリーンアップ
   */
  async cleanup(processedFiles = []) {
    try {
      for (const file of processedFiles) {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
          logger.debug('Temporary file deleted', { file });
        }
      }

      // 1時間以上古い一時ファイルを削除
      const files = fs.readdirSync(this.tempDir);
      const cutoff = Date.now() - (60 * 60 * 1000); // 1時間前

      for (const file of files) {
        const filePath = path.join(this.tempDir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.mtime.getTime() < cutoff) {
          fs.unlinkSync(filePath);
          logger.debug('Old temporary file deleted', { file });
        }
      }

    } catch (error) {
      logger.error('Cleanup failed', { error: error.message });
    }
  }
}

module.exports = new AudioPreprocessingService();