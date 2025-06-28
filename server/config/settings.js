/**
 * 統一設定管理
 * 全ての設定値をここで一元管理
 */

require('dotenv').config();

const config = {
  // サーバー設定
  server: {
    port: parseInt(process.env.PORT) || 3000,
    environment: process.env.NODE_ENV || 'development',
    clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000'
  },

  // セキュリティ設定
  security: {
    jwtSecret: process.env.JWT_SECRET,
    sessionTimeout: parseInt(process.env.SESSION_TIMEOUT) || 3600,
    rateLimit: parseInt(process.env.RATE_LIMIT) || 100,
    apiKey: process.env.API_KEY,
    cspeEnabled: process.env.CSP_ENABLED !== 'false',
    hstsMaxAge: parseInt(process.env.HSTS_MAX_AGE) || 31536000
  },

  // データベース設定
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    name: process.env.DB_NAME || 'support_docs',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS) || 20
  },

  // API設定
  apis: {
    openai: {
      key: process.env.OPENAI_API_KEY,
      timeout: parseInt(process.env.OPENAI_TIMEOUT) || 90000,
      maxRetries: parseInt(process.env.OPENAI_MAX_RETRIES) || 3,
      model: process.env.OPENAI_MODEL || 'whisper-1'
    },
    anthropic: {
      key: process.env.ANTHROPIC_API_KEY,
      timeout: parseInt(process.env.ANTHROPIC_TIMEOUT) || 60000,
      maxRetries: parseInt(process.env.ANTHROPIC_MAX_RETRIES) || 3,
      model: process.env.ANTHROPIC_MODEL || 'claude-3-sonnet-20240229'
    }
  },

  // 音声処理設定
  audio: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 100, // MB
    maxDurationMinutes: parseInt(process.env.MAX_AUDIO_DURATION) || 120,
    segmentDuration: parseInt(process.env.SEGMENT_DURATION) || 600, // 秒
    concurrency: parseInt(process.env.AUDIO_CONCURRENCY) || 2,
    supportedFormats: ['mp3', 'wav', 'm4a', 'aac', 'flac'],
    enablePreprocessing: process.env.ENABLE_PREPROCESSING !== 'false'
  },

  // PDF生成設定
  pdf: {
    concurrency: parseInt(process.env.PDF_CONCURRENCY) || 3,
    timeout: parseInt(process.env.PDF_TIMEOUT) || 30000,
    maxConcurrentPages: parseInt(process.env.PDF_MAX_PAGES) || 5,
    outputFormat: 'A4',
    margins: {
      top: '20mm',
      right: '15mm',
      bottom: '20mm',
      left: '15mm'
    }
  },

  // ファイル管理設定
  files: {
    uploadDir: process.env.UPLOAD_DIR || './uploads',
    generatedDir: process.env.GENERATED_DIR || './generated',
    tempDir: process.env.TEMP_DIR || './temp',
    cleanupHours: parseInt(process.env.UPLOAD_CLEANUP_HOURS) || 24,
    autoDelete: process.env.AUTO_DELETE_ENABLED !== 'false'
  },

  // ログ設定
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    maxFileSize: process.env.LOG_FILE_MAX_SIZE || '10MB',
    maxFiles: parseInt(process.env.LOG_MAX_FILES) || 5,
    enableConsole: process.env.NODE_ENV === 'development'
  },

  // メモリ管理設定
  memory: {
    maxMemoryMB: parseInt(process.env.MAX_MEMORY_MB) || 2048,
    checkInterval: parseInt(process.env.MEMORY_CHECK_INTERVAL) || 60000,
    aiConcurrency: parseInt(process.env.AI_CONCURRENCY) || 3,
    enableGC: process.env.ENABLE_GC === 'true'
  },

  // AWS設定
  aws: {
    region: process.env.AWS_REGION || 'ap-northeast-1',
    s3Bucket: process.env.AWS_S3_BUCKET,
    parameterStorePrefix: process.env.AWS_PARAMETER_STORE_PREFIX || '/ayumi-support/',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  },

  // SSL設定
  ssl: {
    certPath: process.env.SSL_CERT_PATH,
    keyPath: process.env.SSL_KEY_PATH,
    enabled: process.env.SSL_ENABLED === 'true'
  },

  // タイムアウト設定
  timeouts: {
    api: parseInt(process.env.API_TIMEOUT) || 30000,
    audioProcessing: parseInt(process.env.AUDIO_TIMEOUT) || 600000,
    pdfGeneration: parseInt(process.env.PDF_TIMEOUT) || 300000,
    upload: parseInt(process.env.UPLOAD_TIMEOUT) || 120000
  }
};

/**
 * 設定値の検証
 */
function validateConfig() {
  const errors = [];

  // 必須設定の確認
  if (!config.security.jwtSecret) {
    errors.push('JWT_SECRET is required');
  }

  if (config.server.environment === 'production') {
    if (!config.apis.openai.key) {
      errors.push('OPENAI_API_KEY is required in production');
    }
    if (!config.apis.anthropic.key) {
      errors.push('ANTHROPIC_API_KEY is required in production');
    }
    if (config.security.jwtSecret === 'CHANGE_THIS_TO_STRONG_SECRET_KEY') {
      errors.push('JWT_SECRET must be changed in production');
    }
  }

  if (errors.length > 0) {
    throw new Error(`Configuration errors:\n${errors.join('\n')}`);
  }
}

/**
 * 環境別設定の取得
 */
function getEnvironmentConfig() {
  const env = config.server.environment;
  
  const envConfigs = {
    development: {
      logging: { level: 'debug', enableConsole: true },
      security: { rateLimit: 1000 }, // 開発時は制限緩和
      memory: { maxMemoryMB: 1024 }
    },
    production: {
      logging: { level: 'info', enableConsole: false },
      security: { rateLimit: 100 },
      memory: { maxMemoryMB: 4096 }
    },
    test: {
      logging: { level: 'warn', enableConsole: false },
      database: { name: 'support_docs_test' },
      files: { cleanupHours: 1 }
    }
  };

  return { ...config, ...envConfigs[env] };
}

/**
 * AWS Parameter Store から設定を取得（本番環境用）
 */
async function loadFromParameterStore() {
  if (config.server.environment !== 'production' || !config.aws.region) {
    return config;
  }

  try {
    const AWS = require('aws-sdk');
    const ssm = new AWS.SSM({ region: config.aws.region });
    
    const parameterNames = [
      '/ayumi-support/openai-api-key',
      '/ayumi-support/anthropic-api-key',
      '/ayumi-support/jwt-secret',
      '/ayumi-support/database-password'
    ];

    const result = await ssm.getParameters({
      Names: parameterNames,
      WithDecryption: true
    }).promise();

    // Parameter Store の値で設定を上書き
    result.Parameters.forEach(param => {
      switch (param.Name) {
        case '/ayumi-support/openai-api-key':
          config.apis.openai.key = param.Value;
          break;
        case '/ayumi-support/anthropic-api-key':
          config.apis.anthropic.key = param.Value;
          break;
        case '/ayumi-support/jwt-secret':
          config.security.jwtSecret = param.Value;
          break;
        case '/ayumi-support/database-password':
          config.database.password = param.Value;
          break;
      }
    });

    console.log('✅ Configuration loaded from AWS Parameter Store');
  } catch (error) {
    console.warn('⚠️ Failed to load from Parameter Store, using environment variables:', error.message);
  }

  return config;
}

// 設定値の検証
validateConfig();

module.exports = {
  config: getEnvironmentConfig(),
  loadFromParameterStore,
  validateConfig
};