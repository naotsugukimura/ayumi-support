const logger = require('./logger');

/**
 * メモリ使用量管理ユーティリティ
 * - メモリ監視
 * - 並列処理制限
 * - ガベージコレクション最適化
 */
class MemoryManager {
  constructor() {
    this.maxMemoryMB = parseInt(process.env.MAX_MEMORY_MB) || 2048;
    this.warningThresholdMB = this.maxMemoryMB * 0.8; // 80%で警告
    this.criticalThresholdMB = this.maxMemoryMB * 0.9; // 90%で制限
    
    this.concurrencyLimits = {
      audio: parseInt(process.env.AUDIO_CONCURRENCY) || 2,
      pdf: parseInt(process.env.PDF_CONCURRENCY) || 3,
      ai: parseInt(process.env.AI_CONCURRENCY) || 3
    };
    
    this.activeTasks = {
      audio: 0,
      pdf: 0,
      ai: 0
    };
    
    this.taskQueues = {
      audio: [],
      pdf: [],
      ai: []
    };
    
    // 定期的なメモリ監視
    this.startMemoryMonitoring();
  }

  /**
   * メモリ使用量を取得
   */
  getMemoryUsage() {
    const usage = process.memoryUsage();
    return {
      rss: Math.round(usage.rss / 1024 / 1024), // MB
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024), // MB
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024), // MB
      external: Math.round(usage.external / 1024 / 1024), // MB
      arrayBuffers: Math.round(usage.arrayBuffers / 1024 / 1024) // MB
    };
  }

  /**
   * メモリ状態を確認
   */
  checkMemoryStatus() {
    const usage = this.getMemoryUsage();
    
    if (usage.heapUsed >= this.criticalThresholdMB) {
      return 'critical';
    } else if (usage.heapUsed >= this.warningThresholdMB) {
      return 'warning';
    }
    return 'normal';
  }

  /**
   * 並列処理の制限管理
   */
  async acquireSlot(taskType) {
    return new Promise((resolve) => {
      if (this.activeTasks[taskType] < this.concurrencyLimits[taskType]) {
        this.activeTasks[taskType]++;
        logger.debug(`Acquired ${taskType} slot`, {
          active: this.activeTasks[taskType],
          limit: this.concurrencyLimits[taskType]
        });
        resolve();
      } else {
        this.taskQueues[taskType].push(resolve);
        logger.debug(`Queued ${taskType} task`, {
          queueLength: this.taskQueues[taskType].length
        });
      }
    });
  }

  /**
   * 並列処理スロットを解放
   */
  releaseSlot(taskType) {
    this.activeTasks[taskType]--;
    
    if (this.taskQueues[taskType].length > 0) {
      const nextResolve = this.taskQueues[taskType].shift();
      this.activeTasks[taskType]++;
      nextResolve();
    }
    
    logger.debug(`Released ${taskType} slot`, {
      active: this.activeTasks[taskType],
      queueLength: this.taskQueues[taskType].length
    });
  }

  /**
   * タスクの実行（並列制限付き）
   */
  async executeWithLimit(taskType, taskFn) {
    const memoryStatus = this.checkMemoryStatus();
    
    if (memoryStatus === 'critical') {
      // クリティカル状態では新しいタスクを拒否
      throw new Error('メモリ不足のため処理を停止しました。しばらくお待ちください。');
    }
    
    if (memoryStatus === 'warning') {
      // 警告状態では並列数を削減
      this.concurrencyLimits[taskType] = Math.max(1, Math.floor(this.concurrencyLimits[taskType] / 2));
      logger.warn(`Memory warning: Reduced ${taskType} concurrency`, {
        newLimit: this.concurrencyLimits[taskType]
      });
    }

    await this.acquireSlot(taskType);
    
    try {
      const result = await taskFn();
      return result;
    } finally {
      this.releaseSlot(taskType);
      
      // メモリ状況改善時は制限を元に戻す
      if (memoryStatus === 'warning' && this.checkMemoryStatus() === 'normal') {
        this.restoreDefaultLimits(taskType);
      }
    }
  }

  /**
   * デフォルトの並列制限を復元
   */
  restoreDefaultLimits(taskType) {
    const defaults = {
      audio: parseInt(process.env.AUDIO_CONCURRENCY) || 2,
      pdf: parseInt(process.env.PDF_CONCURRENCY) || 3,
      ai: parseInt(process.env.AI_CONCURRENCY) || 3
    };
    
    this.concurrencyLimits[taskType] = defaults[taskType];
    logger.info(`Restored default ${taskType} concurrency`, {
      limit: this.concurrencyLimits[taskType]
    });
  }

  /**
   * 強制ガベージコレクション実行
   */
  forceGarbageCollection() {
    if (global.gc) {
      const beforeUsage = this.getMemoryUsage();
      global.gc();
      const afterUsage = this.getMemoryUsage();
      
      logger.info('Forced garbage collection', {
        before: beforeUsage,
        after: afterUsage,
        freed: beforeUsage.heapUsed - afterUsage.heapUsed
      });
    } else {
      logger.warn('Garbage collection not available (start with --expose-gc flag)');
    }
  }

  /**
   * メモリクリーンアップ
   */
  async cleanup() {
    // アップロードファイルのクリーンアップ
    await this.cleanupOldFiles();
    
    // 強制ガベージコレクション
    this.forceGarbageCollection();
  }

  /**
   * 古いファイルのクリーンアップ
   */
  async cleanupOldFiles() {
    const fs = require('fs').promises;
    const path = require('path');
    
    const directories = [
      path.join(__dirname, '../../uploads'),
      path.join(__dirname, '../../generated'),
      path.join(__dirname, '../../temp')
    ];
    
    const maxAge = parseInt(process.env.UPLOAD_CLEANUP_HOURS) || 24;
    const cutoffTime = Date.now() - (maxAge * 60 * 60 * 1000);
    
    for (const dir of directories) {
      try {
        const files = await fs.readdir(dir);
        
        for (const file of files) {
          const filePath = path.join(dir, file);
          const stats = await fs.stat(filePath);
          
          if (stats.mtime.getTime() < cutoffTime) {
            await fs.unlink(filePath);
            logger.debug('Cleaned up old file', { filePath });
          }
        }
      } catch (error) {
        logger.warn('Cleanup failed for directory', { dir, error: error.message });
      }
    }
  }

  /**
   * 定期的なメモリ監視を開始
   */
  startMemoryMonitoring() {
    const interval = parseInt(process.env.MEMORY_CHECK_INTERVAL) || 60000; // 1分
    
    setInterval(() => {
      const usage = this.getMemoryUsage();
      const status = this.checkMemoryStatus();
      
      logger.debug('Memory usage', { usage, status });
      
      if (status === 'critical') {
        logger.error('Critical memory usage detected', { usage });
        this.cleanup();
      } else if (status === 'warning') {
        logger.warn('High memory usage detected', { usage });
      }
      
    }, interval);
  }

  /**
   * システム統計を取得
   */
  getSystemStats() {
    return {
      memory: this.getMemoryUsage(),
      status: this.checkMemoryStatus(),
      activeTasks: { ...this.activeTasks },
      queueLengths: {
        audio: this.taskQueues.audio.length,
        pdf: this.taskQueues.pdf.length,
        ai: this.taskQueues.ai.length
      },
      limits: { ...this.concurrencyLimits }
    };
  }
}

// シングルトンインスタンス
let instance = null;

module.exports = {
  getInstance() {
    if (!instance) {
      instance = new MemoryManager();
    }
    return instance;
  }
};