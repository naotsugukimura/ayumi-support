const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

/**
 * JWT認証ミドルウェア
 * Authorization: Bearer <token> 形式のトークンを検証
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    logger.warn('Authentication failed: No token provided', {
      ip: req.ip,
      endpoint: req.originalUrl
    });
    return res.status(401).json({ 
      error: 'アクセストークンが必要です',
      code: 'NO_TOKEN' 
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      logger.warn('Authentication failed: Invalid token', {
        ip: req.ip,
        endpoint: req.originalUrl,
        error: err.message
      });
      return res.status(403).json({ 
        error: 'トークンが無効です',
        code: 'INVALID_TOKEN' 
      });
    }

    req.user = user;
    logger.info('Authentication successful', {
      userId: user.id,
      endpoint: req.originalUrl
    });
    next();
  });
};

/**
 * ロールベース認証ミドルウェア
 * 特定のロールを持つユーザーのみアクセス許可
 */
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: '認証が必要です',
        code: 'AUTHENTICATION_REQUIRED' 
      });
    }

    const userRoles = req.user.roles || [];
    const hasRequiredRole = roles.some(role => userRoles.includes(role));

    if (!hasRequiredRole) {
      logger.warn('Authorization failed: Insufficient permissions', {
        userId: req.user.id,
        userRoles,
        requiredRoles: roles,
        endpoint: req.originalUrl
      });
      return res.status(403).json({ 
        error: '権限が不足しています',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: roles
      });
    }

    next();
  };
};

/**
 * 管理者権限が必要なエンドポイント用
 */
const requireAdmin = requireRole(['admin']);

/**
 * オプショナル認証（認証されていなくても継続）
 * ユーザー情報があれば req.user に設定
 */
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next();
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (!err) {
      req.user = user;
    }
    next();
  });
};

/**
 * APIキー認証（開発・テスト用）
 * X-API-Key ヘッダーでの認証
 */
const authenticateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  const validApiKey = process.env.API_KEY;

  if (!validApiKey) {
    logger.warn('API key authentication disabled: No API_KEY in environment');
    return next(); // API キーが設定されていない場合はスキップ
  }

  if (!apiKey || apiKey !== validApiKey) {
    logger.warn('API key authentication failed', {
      ip: req.ip,
      endpoint: req.originalUrl,
      providedKey: apiKey ? 'provided' : 'missing'
    });
    return res.status(401).json({ 
      error: 'APIキーが無効です',
      code: 'INVALID_API_KEY' 
    });
  }

  logger.info('API key authentication successful', {
    ip: req.ip,
    endpoint: req.originalUrl
  });
  next();
};

module.exports = {
  authenticateToken,
  requireRole,
  requireAdmin,
  optionalAuth,
  authenticateApiKey
};