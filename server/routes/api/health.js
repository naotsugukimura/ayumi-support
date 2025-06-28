const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../../middleware/errorHandler');
const { HTTP_STATUS } = require('../../utils/constants');
const logger = require('../../utils/logger');

// ヘルスチェックエンドポイント
router.get('/', asyncHandler(async (req, res) => {
  const healthCheck = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  };

  // 外部サービス確認
  const services = {
    openai: !!process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.includes('your-'),
    anthropic: !!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_API_KEY.includes('your-'),
    database: !!process.env.DB_HOST,
    storage: !!process.env.AWS_S3_BUCKET || true // ローカルストレージ
  };

  healthCheck.services = services;
  healthCheck.openai_configured = services.openai;
  healthCheck.anthropic_configured = services.anthropic;
  
  // 重要なサービスが利用不可の場合は警告
  const criticalServices = ['openai', 'anthropic'];
  const unavailableServices = criticalServices.filter(service => !services[service]);
  
  if (unavailableServices.length > 0) {
    healthCheck.status = 'WARNING';
    healthCheck.warnings = unavailableServices.map(service => `${service} service not configured`);
    healthCheck.demo_mode = true;
    healthCheck.message = 'API keys not configured - demo mode available';
    logger.warn('Health check warning', { unavailableServices });
  } else {
    healthCheck.demo_mode = false;
    healthCheck.message = 'All services configured - full functionality available';
  }

  res.status(HTTP_STATUS.OK).json(healthCheck);
}));

// 詳細ステータス（管理者用）
router.get('/detailed', asyncHandler(async (req, res) => {
  const detailed = {
    application: {
      name: 'ayumi-support',
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      port: process.env.PORT || 5000,
      uptime: {
        seconds: process.uptime(),
        human: formatUptime(process.uptime())
      }
    },
    system: {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      memory: {
        ...process.memoryUsage(),
        total: require('os').totalmem(),
        free: require('os').freemem()
      },
      cpu: require('os').cpus(),
      loadAverage: require('os').loadavg()
    },
    configuration: {
      maxFileSize: process.env.MAX_FILE_SIZE || '100MB',
      uploadDir: process.env.UPLOAD_DIR || './uploads',
      logLevel: process.env.LOG_LEVEL || 'INFO',
      rateLimit: process.env.RATE_LIMIT || 100
    },
    services: {
      openai: {
        configured: !!process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.includes('your-'),
        model: 'whisper-1'
      },
      anthropic: {
        configured: !!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_API_KEY.includes('your-'),
        model: 'claude-3-haiku-20240307'
      },
      database: {
        configured: !!process.env.DB_HOST,
        host: process.env.DB_HOST ? process.env.DB_HOST.replace(/./g, '*') : 'not configured'
      },
      storage: {
        type: process.env.AWS_S3_BUCKET ? 'S3' : 'Local',
        bucket: process.env.AWS_S3_BUCKET || 'local uploads directory'
      }
    }
  };

  res.status(HTTP_STATUS.OK).json(detailed);
}));

// アップタイムフォーマット関数
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  return `${days}d ${hours}h ${minutes}m ${secs}s`;
}

module.exports = router;