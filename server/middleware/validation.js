const { HTTP_STATUS } = require('../utils/constants');
const logger = require('../utils/logger');

// ファイルバリデーション
const validateAudioFile = (req, res, next) => {
  if (!req.file) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: 'ファイルがアップロードされていません',
      field: 'audioFile'
    });
  }

  const allowedTypes = ['.mp3', '.wav', '.m4a', '.aac'];
  const fileExt = req.file.originalname.toLowerCase().substring(req.file.originalname.lastIndexOf('.'));
  
  if (!allowedTypes.includes(fileExt)) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: '対応していないファイル形式です',
      allowedTypes: allowedTypes,
      receivedType: fileExt
    });
  }

  // ファイルサイズチェック (追加)
  const maxSizeBytes = (process.env.MAX_FILE_SIZE || 100) * 1024 * 1024;
  if (req.file.size > maxSizeBytes) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: 'ファイルサイズが制限を超えています',
      maxSize: `${process.env.MAX_FILE_SIZE || 100}MB`,
      fileSize: `${Math.round(req.file.size / 1024 / 1024)}MB`
    });
  }

  logger.info('Audio file validation passed', {
    filename: req.file.filename,
    originalName: req.file.originalname,
    size: req.file.size,
    mimetype: req.file.mimetype
  });

  next();
};

// PDFデータバリデーション
const validatePdfData = (req, res, next) => {
  const { body } = req;
  
  if (!body || typeof body !== 'object') {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: 'リクエストボディが必要です'
    });
  }

  // 基本的な必須フィールドチェック
  const requiredFields = ['userName'];
  const missingFields = requiredFields.filter(field => !body[field]);
  
  if (missingFields.length > 0) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: '必須フィールドが不足しています',
      missingFields: missingFields
    });
  }

  logger.info('PDF data validation passed', {
    userName: body.userName,
    dataSize: JSON.stringify(body).length
  });

  next();
};

// リクエストレート制限
const rateLimitMiddleware = (req, res, next) => {
  // 簡単な実装（本番では redis-rate-limit 等を使用）
  const clientIp = req.ip;
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15分
  const maxRequests = process.env.RATE_LIMIT || 100;

  if (!global.rateLimitStore) {
    global.rateLimitStore = new Map();
  }

  const requests = global.rateLimitStore.get(clientIp) || [];
  const recentRequests = requests.filter(timestamp => now - timestamp < windowMs);

  if (recentRequests.length >= maxRequests) {
    logger.warn('Rate limit exceeded', {
      ip: clientIp,
      requests: recentRequests.length,
      limit: maxRequests
    });

    return res.status(429).json({
      error: 'リクエスト数が制限を超えています',
      retryAfter: Math.ceil(windowMs / 1000),
      limit: maxRequests
    });
  }

  recentRequests.push(now);
  global.rateLimitStore.set(clientIp, recentRequests);

  // 古いエントリをクリーンアップ（メモリ節約）
  if (recentRequests.length > maxRequests * 2) {
    global.rateLimitStore.set(clientIp, recentRequests.slice(-maxRequests));
  }

  next();
};

// APIキーバリデーション
const validateApiKeys = (req, res, next) => {
  const openaiKey = process.env.OPENAI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (!openaiKey || openaiKey.includes('your-') || openaiKey.length < 20) {
    logger.error('Invalid OpenAI API key configuration');
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: 'OpenAI API設定が正しくありません'
    });
  }

  if (!anthropicKey || anthropicKey.includes('your-') || anthropicKey.length < 20) {
    logger.error('Invalid Anthropic API key configuration');
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: 'Anthropic API設定が正しくありません'
    });
  }

  next();
};

// セキュリティヘッダー追加
const securityHeaders = (req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  });

  if (process.env.NODE_ENV === 'production') {
    res.set({
      'Strict-Transport-Security': `max-age=${process.env.HSTS_MAX_AGE || 31536000}; includeSubDomains`,
    });
  }

  next();
};

module.exports = {
  validateAudioFile,
  validatePdfData,
  rateLimitMiddleware,
  validateApiKeys,
  securityHeaders
};