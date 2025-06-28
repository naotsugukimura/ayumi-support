const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');

class AccuracyService {
  constructor() {
    this.measurements = [];
    this.reportsDir = path.join(__dirname, '../../reports');
    this.ensureReportsDirectory();
  }

  /**
   * レポートディレクトリの確保
   */
  ensureReportsDirectory() {
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
  }

  /**
   * 文字誤り率 (Character Error Rate) 計算
   */
  calculateCER(predicted, actual) {
    if (!actual || !predicted) return 1.0;
    
    const actualChars = actual.replace(/\s/g, '').split('');
    const predictedChars = predicted.replace(/\s/g, '').split('');
    
    const distance = this.levenshteinDistance(actualChars, predictedChars);
    return distance / actualChars.length;
  }

  /**
   * 単語誤り率 (Word Error Rate) 計算  
   */
  calculateWER(predicted, actual) {
    if (!actual || !predicted) return 1.0;
    
    const actualWords = actual.trim().split(/\s+/);
    const predictedWords = predicted.trim().split(/\s+/);
    
    const distance = this.levenshteinDistance(actualWords, predictedWords);
    return distance / actualWords.length;
  }

  /**
   * 専門用語の認識精度測定
   */
  measureTechnicalTermAccuracy(predicted, actual) {
    const technicalTerms = [
      '就労移行支援', '就労継続支援', '生活介護', '自立訓練',
      'アセスメント', 'モニタリング', '個別支援計画',
      'サービス管理責任者', '相談支援専門員', 'ADL', 'IADL'
    ];

    let correct = 0;
    let total = 0;

    technicalTerms.forEach(term => {
      const actualCount = (actual.match(new RegExp(term, 'g')) || []).length;
      const predictedCount = (predicted.match(new RegExp(term, 'g')) || []).length;
      
      total += actualCount;
      correct += Math.min(actualCount, predictedCount);
    });

    return total > 0 ? correct / total : 1.0;
  }

  /**
   * 人名の認識精度測定（日本人名パターン）
   */
  measureNameAccuracy(predicted, actual) {
    // 日本人名パターン（姓 + 名）
    const namePattern = /[一-龯]{1,4}[一-龯]{1,3}[さん|氏|君|ちゃん]?/g;
    
    const actualNames = actual.match(namePattern) || [];
    const predictedNames = predicted.match(namePattern) || [];
    
    if (actualNames.length === 0) return 1.0;
    
    let correct = 0;
    actualNames.forEach(name => {
      if (predictedNames.includes(name)) {
        correct++;
      }
    });
    
    return correct / actualNames.length;
  }

  /**
   * 数値の認識精度測定
   */
  measureNumberAccuracy(predicted, actual) {
    // 数値パターン（日付、時間、評価点数等）
    const numberPatterns = [
      /\d{4}年\d{1,2}月\d{1,2}日/g,  // 日付
      /\d{1,2}時\d{1,2}分/g,        // 時間
      /\d{1,2}点/g,                  // 点数
      /\d{1,2}段階/g,                // 段階評価
      /\d+%/g,                       // パーセンテージ
      /\d+回/g                       // 回数
    ];

    let totalCorrect = 0;
    let totalNumbers = 0;

    numberPatterns.forEach(pattern => {
      const actualNumbers = actual.match(pattern) || [];
      const predictedNumbers = predicted.match(pattern) || [];
      
      totalNumbers += actualNumbers.length;
      
      actualNumbers.forEach(num => {
        if (predictedNumbers.includes(num)) {
          totalCorrect++;
        }
      });
    });

    return totalNumbers > 0 ? totalCorrect / totalNumbers : 1.0;
  }

  /**
   * レーベンシュタイン距離計算
   */
  levenshteinDistance(a, b) {
    const matrix = Array(b.length + 1).fill().map(() => Array(a.length + 1).fill(0));

    for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= b.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= b.length; j++) {
      for (let i = 1; i <= a.length; i++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // 挿入
          matrix[j - 1][i] + 1,     // 削除
          matrix[j - 1][i - 1] + cost // 置換
        );
      }
    }

    return matrix[b.length][a.length];
  }

  /**
   * 総合精度測定
   */
  async measureOverallAccuracy(transcriptionResult, groundTruth, metadata = {}) {
    const predicted = transcriptionResult.text;
    
    const accuracy = {
      timestamp: new Date().toISOString(),
      filename: metadata.filename || 'unknown',
      duration: transcriptionResult.duration || 0,
      
      // 基本精度指標
      characterAccuracy: 1 - this.calculateCER(predicted, groundTruth),
      wordAccuracy: 1 - this.calculateWER(predicted, groundTruth),
      
      // 専門領域精度
      technicalTermAccuracy: this.measureTechnicalTermAccuracy(predicted, groundTruth),
      nameAccuracy: this.measureNameAccuracy(predicted, groundTruth),
      numberAccuracy: this.measureNumberAccuracy(predicted, groundTruth),
      
      // 音声品質指標
      audioQuality: this.estimateAudioQuality(transcriptionResult),
      
      // テキスト長
      predictedLength: predicted.length,
      actualLength: groundTruth.length,
      
      // 信頼度（Whisperの場合）
      confidence: this.calculateAverageConfidence(transcriptionResult.segments),
      
      // 結果データ
      predicted: predicted,
      actual: groundTruth
    };

    // 総合スコア計算（重み付き平均）
    accuracy.overallScore = (
      accuracy.characterAccuracy * 0.3 +
      accuracy.wordAccuracy * 0.3 +
      accuracy.technicalTermAccuracy * 0.25 +
      accuracy.nameAccuracy * 0.1 +
      accuracy.numberAccuracy * 0.05
    );

    // 測定結果を保存
    this.measurements.push(accuracy);
    
    logger.info('Accuracy measurement completed', {
      filename: metadata.filename,
      overallScore: Math.round(accuracy.overallScore * 100),
      characterAccuracy: Math.round(accuracy.characterAccuracy * 100),
      wordAccuracy: Math.round(accuracy.wordAccuracy * 100),
      technicalTermAccuracy: Math.round(accuracy.technicalTermAccuracy * 100)
    });

    return accuracy;
  }

  /**
   * 音声品質推定
   */
  estimateAudioQuality(transcriptionResult) {
    if (!transcriptionResult.segments || transcriptionResult.segments.length === 0) {
      return 0.5; // 不明な場合は中程度
    }

    // セグメント間の無音時間から品質を推定
    let totalGaps = 0;
    let gapCount = 0;
    
    for (let i = 1; i < transcriptionResult.segments.length; i++) {
      const gap = transcriptionResult.segments[i].start - transcriptionResult.segments[i-1].end;
      if (gap > 0.1) { // 0.1秒以上の無音
        totalGaps += gap;
        gapCount++;
      }
    }

    const averageGap = gapCount > 0 ? totalGaps / gapCount : 0;
    
    // 無音が多いほど音質が悪いと仮定
    return Math.max(0.1, Math.min(1.0, 1.0 - (averageGap / 5.0)));
  }

  /**
   * 平均信頼度計算
   */
  calculateAverageConfidence(segments) {
    if (!segments || segments.length === 0) return 0.5;
    
    // Whisperには信頼度がないため、セグメント長から推定
    const avgLength = segments.reduce((sum, seg) => sum + seg.text.length, 0) / segments.length;
    
    // 長いセグメントほど信頼度が高いと仮定
    return Math.min(1.0, avgLength / 50);
  }

  /**
   * 精度レポート生成
   */
  generateAccuracyReport(timeRange = 7) { // 過去7日間
    const cutoff = new Date(Date.now() - timeRange * 24 * 60 * 60 * 1000);
    const recentMeasurements = this.measurements.filter(m => new Date(m.timestamp) > cutoff);
    
    if (recentMeasurements.length === 0) {
      return { error: '測定データがありません' };
    }

    const avg = (arr) => arr.reduce((sum, val) => sum + val, 0) / arr.length;

    return {
      period: `過去${timeRange}日間`,
      measurementCount: recentMeasurements.length,
      averageScores: {
        overall: avg(recentMeasurements.map(m => m.overallScore)),
        character: avg(recentMeasurements.map(m => m.characterAccuracy)),
        word: avg(recentMeasurements.map(m => m.wordAccuracy)),
        technicalTerm: avg(recentMeasurements.map(m => m.technicalTermAccuracy)),
        name: avg(recentMeasurements.map(m => m.nameAccuracy)),
        number: avg(recentMeasurements.map(m => m.numberAccuracy))
      },
      qualityMetrics: {
        averageAudioQuality: avg(recentMeasurements.map(m => m.audioQuality)),
        averageConfidence: avg(recentMeasurements.map(m => m.confidence)),
        averageDuration: avg(recentMeasurements.map(m => m.duration))
      },
      trends: this.calculateTrends(recentMeasurements)
    };
  }

  /**
   * 精度トレンド分析
   */
  calculateTrends(measurements) {
    if (measurements.length < 2) return { trend: 'insufficient_data' };
    
    const sorted = measurements.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const firstHalf = sorted.slice(0, Math.floor(sorted.length / 2));
    const secondHalf = sorted.slice(Math.floor(sorted.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, m) => sum + m.overallScore, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, m) => sum + m.overallScore, 0) / secondHalf.length;
    
    const improvement = secondAvg - firstAvg;
    
    return {
      trend: improvement > 0.02 ? 'improving' : improvement < -0.02 ? 'declining' : 'stable',
      improvement: improvement,
      firstPeriodAvg: firstAvg,
      secondPeriodAvg: secondAvg
    };
  }

  /**
   * 精度測定（API用メソッド）
   */
  async measureAccuracy(predictedText, groundTruthText, metadata = {}) {
    const transcriptionResult = {
      text: predictedText,
      duration: metadata.duration || 0,
      segments: metadata.segments || []
    };

    return await this.measureOverallAccuracy(transcriptionResult, groundTruthText, metadata);
  }

  /**
   * バッチ精度測定
   */
  async batchMeasureAccuracy(testFiles) {
    const results = [];
    
    for (const testFile of testFiles) {
      try {
        const result = await this.measureAccuracy(
          testFile.predicted,
          testFile.groundTruth,
          testFile.metadata
        );
        results.push(result);
      } catch (error) {
        logger.error('Batch accuracy measurement failed for file', {
          filename: testFile.metadata?.filename,
          error: error.message
        });
        results.push({
          filename: testFile.metadata?.filename,
          error: error.message
        });
      }
    }

    return {
      totalFiles: testFiles.length,
      successfulMeasurements: results.filter(r => !r.error).length,
      failedMeasurements: results.filter(r => r.error).length,
      results: results
    };
  }

  /**
   * レポート保存
   */
  async saveReport(reportType = 'weekly') {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `accuracy-report-${reportType}-${timestamp}.json`;
    const filePath = path.join(this.reportsDir, filename);

    const report = {
      type: reportType,
      timestamp: new Date().toISOString(),
      data: this.generateAccuracyReport(reportType === 'weekly' ? 7 : 30),
      errorPatterns: this.analyzeErrorPatterns(),
      measurements: this.measurements.slice(-100) // 最新100件
    };

    try {
      fs.writeFileSync(filePath, JSON.stringify(report, null, 2));
      logger.info('Accuracy report saved', { filename, path: filePath });
      return { success: true, filename, path: filePath };
    } catch (error) {
      logger.error('Failed to save accuracy report', { error: error.message });
      throw error;
    }
  }

  /**
   * 問題パターン分析
   */
  analyzeErrorPatterns() {
    const patterns = {
      commonMisrecognitions: new Map(),
      problematicTerms: new Map(),
      audioQualityIssues: []
    };

    this.measurements.forEach(measurement => {
      // 音質問題の特定
      if (measurement.audioQuality < 0.6) {
        patterns.audioQualityIssues.push({
          filename: measurement.filename,
          quality: measurement.audioQuality,
          accuracy: measurement.overallScore
        });
      }

      // 専門用語の問題特定
      if (measurement.technicalTermAccuracy < 0.8) {
        patterns.problematicTerms.set(measurement.filename, measurement.technicalTermAccuracy);
      }
    });

    return patterns;
  }

  /**
   * 継続的改善提案生成
   */
  generateImprovementSuggestions() {
    const report = this.generateAccuracyReport();
    const patterns = this.analyzeErrorPatterns();
    const suggestions = [];

    // 低精度領域の特定
    if (report.averageScores.technicalTerm < 0.85) {
      suggestions.push({
        priority: 'high',
        category: 'prompt_engineering',
        suggestion: '専門用語プロンプトの強化が必要です',
        expectedImprovement: '5-8%',
        implementationCost: 'low'
      });
    }

    if (report.qualityMetrics.averageAudioQuality < 0.7) {
      suggestions.push({
        priority: 'high',
        category: 'audio_preprocessing',
        suggestion: '音声前処理パラメータの調整が推奨されます',
        expectedImprovement: '3-5%',
        implementationCost: 'medium'
      });
    }

    if (report.averageScores.character < 0.9) {
      suggestions.push({
        priority: 'medium',
        category: 'model_optimization',
        suggestion: '複数音声認識APIの併用を検討してください',
        expectedImprovement: '8-12%',
        implementationCost: 'high'
      });
    }

    return {
      timestamp: new Date().toISOString(),
      suggestions,
      currentPerformance: report.averageScores,
      issueCount: patterns.audioQualityIssues.length + patterns.problematicTerms.size
    };
  }
}

module.exports = new AccuracyService();