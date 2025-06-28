const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// ミドルウェア
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { rateLimitMiddleware, securityHeaders } = require('./middleware/validation');
const logger = require('./utils/logger');

// ルート
const audioRoutes = require('./routes/api/audio');
const pdfRoutes = require('./routes/api/pdf');
const healthRoutes = require('./routes/api/health');
const documentsRoutes = require('./routes/api/documents');
const databaseRoutes = require('./routes/api/database');
const authRoutes = require('./routes/auth');

const app = express();

// 基本ミドルウェア
app.use(securityHeaders);
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// レート制限
app.use(rateLimitMiddleware);

// タイムアウト設定ミドルウェア
app.use((req, res, next) => {
  let timeout;
  
  // エンドポイント別タイムアウト設定
  if (req.url.includes('/api/audio/') || req.url.includes('/api/documents/')) {
    timeout = 600000; // 音声・文書処理: 10分
  } else if (req.url.includes('/api/pdf/')) {
    timeout = 300000; // PDF生成: 5分
  } else {
    timeout = 30000;  // 通常API: 30秒
  }
  
  req.setTimeout(timeout, () => {
    logger.warn('Request timeout', {
      url: req.url,
      method: req.method,
      timeout: timeout,
      userAgent: req.get('User-Agent')
    });
    
    if (!res.headersSent) {
      res.status(408).json({
        error: 'Request timeout',
        message: '処理に時間がかかりすぎています。ファイルサイズを小さくして再試行してください。',
        timeout: timeout
      });
    }
  });
  
  next();
});

// リクエストログ
app.use((req, res, next) => {
  logger.info('Request received', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  next();
});

// 静的ファイル配信
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/generated', express.static(path.join(__dirname, '../generated')));
app.use('/tools', express.static(path.join(__dirname, '../tools')));

// 顧客向けページ配信
app.use(express.static(path.join(__dirname, '../public')));

// 管理者ページ（認証が必要）
const { requireRole } = require('./middleware/auth');

// テストページへの直接アクセス（管理者のみ）
app.get('/api-test.html', requireRole(['admin']), (req, res) => {
  res.sendFile(path.join(__dirname, '../tools/test-pages/api-test.html'));
});

app.get('/api-test', requireRole(['admin']), (req, res) => {
  res.sendFile(path.join(__dirname, '../tools/test-pages/api-test.html'));
});

// シンプルテストページ
app.get('/simple-test', (req, res) => {
  res.sendFile(path.join(__dirname, '../tools/test-pages/simple-test.html'));
});

// 簡素化ワークフロー
app.get('/simple-workflow', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/simple-workflow.html'));
});

// 顧客向けページルーティング
app.get('/demo', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/demo.html'));
});

app.get('/workflow', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/workflow.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/dashboard.html'));
});

app.get('/preview', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/preview.html'));
});

app.get('/document-preview', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/document-preview.html'));
});

// ルート設定
app.get('/', (req, res) => {
  res.json({
    message: '🎉 サポートドック サーバー起動中！',
    status: 'OK',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    features: [
      '音声ファイルアップロード機能',
      '音声認識機能 (OpenAI Whisper)',
      'AI解析機能 (Anthropic Claude)',
      'PDF帳票生成機能'
    ],
    endpoints: {
      health: '/api/health',
      auth: '/api/auth/*',
      audio: '/api/audio/*',
      pdf: '/api/pdf/*',
      documents: '/api/documents/*',
      database: '/api/database/*'
    },
    timestamp: new Date().toISOString()
  });
});

// API ルート
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/audio', audioRoutes);
app.use('/api/pdf', pdfRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/database', databaseRoutes);

// 404 ハンドラー
app.use(notFoundHandler);

// エラーハンドラー
app.use(errorHandler);

// プロセス終了処理
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, promise });
  process.exit(1);
});

module.exports = app;