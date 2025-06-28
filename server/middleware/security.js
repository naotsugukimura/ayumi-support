const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');

/**
 * セキュリティミドルウェアの設定
 */

// CORS設定
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

// Rate Limiting設定
const createRateLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      error: message,
      retryAfter: Math.ceil(windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      console.warn(`Rate limit exceeded for IP: ${req.ip}`);
      res.status(429).json({
        error: message,
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
  });
};

// 一般API用レート制限
const generalLimiter = createRateLimiter(
  15 * 60 * 1000, // 15分
  process.env.RATE_LIMIT || 100, // 100リクエスト
  'リクエスト制限に達しました。しばらくお待ちください。'
);

// ファイルアップロード用レート制限（より厳しく）
const uploadLimiter = createRateLimiter(
  60 * 60 * 1000, // 1時間
  10, // 10ファイル
  'ファイルアップロード制限に達しました。1時間後に再試行してください。'
);

// PDF生成用レート制限
const pdfLimiter = createRateLimiter(
  10 * 60 * 1000, // 10分
  20, // 20PDF
  'PDF生成制限に達しました。10分後に再試行してください。'
);

// Helmetセキュリティヘッダー設定
const helmetOptions = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'"],
      connectSrc: ["'self'", "https://api.openai.com", "https://api.anthropic.com"],
      mediaSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"]
    }
  },
  hsts: {
    maxAge: parseInt(process.env.HSTS_MAX_AGE) || 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  frameguard: { action: 'deny' },
  xssFilter: true
};

// IPホワイトリスト（開発環境用）
const ipWhitelist = (req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    // 本番環境では適切なIPフィルタリングを実装
    const allowedIPs = (process.env.ALLOWED_IPS || '').split(',');
    const clientIP = req.ip || req.connection.remoteAddress;
    
    if (allowedIPs.length > 0 && !allowedIPs.includes(clientIP)) {
      console.warn(`Unauthorized IP access attempt: ${clientIP}`);
      return res.status(403).json({ error: 'アクセスが拒否されました' });
    }
  }
  next();
};

// セキュリティログ記録
const securityLogger = (req, res, next) => {
  const logData = {
    timestamp: new Date().toISOString(),
    ip: req.ip,
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    referer: req.get('Referer')
  };
  
  // 機密情報を含むリクエストのログ記録
  if (req.url.includes('/api/')) {
    console.log('API Access:', JSON.stringify(logData));
  }
  
  next();
};

// ファイルサイズ制限チェック
const fileSizeCheck = (req, res, next) => {
  const maxSize = (parseInt(process.env.MAX_FILE_SIZE) || 100) * 1024 * 1024; // MB to bytes
  
  if (req.headers['content-length'] && parseInt(req.headers['content-length']) > maxSize) {
    return res.status(413).json({
      error: 'ファイルサイズが制限を超えています',
      maxSize: `${process.env.MAX_FILE_SIZE || 100}MB`
    });
  }
  
  next();
};

// 危険なファイル拡張子チェック
const fileExtensionCheck = (req, res, next) => {
  if (req.file && req.file.originalname) {
    const dangerousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.com', '.js', '.vbs', '.jar'];
    const ext = req.file.originalname.toLowerCase().substr(req.file.originalname.lastIndexOf('.'));
    
    if (dangerousExtensions.includes(ext)) {
      return res.status(400).json({
        error: '許可されていないファイル形式です',
        allowedTypes: ['.mp3', '.wav', '.m4a', '.aac']
      });
    }
  }
  
  next();
};

// リクエストボディサイズ制限
const bodySizeLimit = '10mb'; // JSON用

// エラーハンドリングミドルウェア
const errorHandler = (err, req, res, next) => {
  // セキュリティ関連エラーのログ記録
  if (err.status === 429 || err.status === 403) {
    console.warn('Security event:', {
      timestamp: new Date().toISOString(),
      ip: req.ip,
      error: err.message,
      url: req.url
    });
  }
  
  // 本番環境では詳細なエラー情報を隠す
  if (process.env.NODE_ENV === 'production') {
    res.status(err.status || 500).json({
      error: 'サーバーエラーが発生しました'
    });
  } else {
    res.status(err.status || 500).json({
      error: err.message,
      stack: err.stack
    });
  }
};

module.exports = {
  cors: cors(corsOptions),
  helmet: helmet(helmetOptions),
  generalLimiter,
  uploadLimiter,
  pdfLimiter,
  ipWhitelist,
  securityLogger,
  fileSizeCheck,
  fileExtensionCheck,
  bodySizeLimit,
  errorHandler
};