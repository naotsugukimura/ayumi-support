const logger = require('../utils/logger');
const { HTTP_STATUS, ERROR_MESSAGES } = require('../utils/constants');

const errorHandler = (err, req, res, next) => {
  logger.error('Error occurred:', {
    error: err.message,
    stack: err.stack,
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });

  // Multer エラー
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: ERROR_MESSAGES.FILE_SIZE_EXCEEDED,
      details: `ファイルサイズは${process.env.MAX_FILE_SIZE || 100}MB以下にしてください`
    });
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: 'アップロード形式が正しくありません',
      details: err.message
    });
  }

  // OpenAI エラー
  if (err.name === 'APIConnectionError' || err.name === 'APIError') {
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: ERROR_MESSAGES.TRANSCRIPTION_FAILED,
      details: 'API接続エラーが発生しました'
    });
  }

  // Puppeteer エラー
  if (err.message.includes('Failed to launch the browser')) {
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: ERROR_MESSAGES.PDF_GENERATION_FAILED,
      details: 'PDF生成環境の初期化に失敗しました'
    });
  }

  // データベース エラー
  if (err.code && err.code.startsWith('ER_') || err.name === 'DatabaseError') {
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: ERROR_MESSAGES.DATABASE_ERROR,
      details: process.env.NODE_ENV === 'development' ? err.message : 'データベース処理でエラーが発生しました'
    });
  }

  // バリデーション エラー
  if (err.name === 'ValidationError') {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: 'バリデーションエラー',
      details: err.message,
      fields: err.fields || {}
    });
  }

  // JWT エラー
  if (err.name === 'JsonWebTokenError') {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      error: ERROR_MESSAGES.UNAUTHORIZED,
      details: 'トークンが無効です'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      error: ERROR_MESSAGES.UNAUTHORIZED,
      details: 'トークンの有効期限が切れています'
    });
  }

  // デフォルトエラー
  const statusCode = err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  const message = err.message || 'Internal Server Error';
  
  res.status(statusCode).json({
    error: message,
    details: process.env.NODE_ENV === 'development' ? err.stack : '内部サーバーエラーが発生しました'
  });
};

// 404 Not Found ハンドラー
const notFoundHandler = (req, res) => {
  res.status(HTTP_STATUS.NOT_FOUND).json({
    error: 'リクエストされたリソースが見つかりません',
    path: req.originalUrl,
    method: req.method
  });
};

// 非同期エラーハンドラー
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler
};