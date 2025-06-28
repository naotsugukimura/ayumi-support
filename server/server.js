const app = require('./app');
const logger = require('./utils/logger');
const { DEFAULTS } = require('./utils/constants');

const PORT = process.env.PORT || DEFAULTS.PORT;

// サーバー起動
const server = app.listen(PORT, () => {
  logger.info('Server started', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version,
    pid: process.pid
  });

  console.log(`🚀 サポートドック サーバー起動: http://localhost:${PORT}`);
  console.log(`📁 音声ファイルアップロード機能が利用できます！`);
  console.log(`🎤 音声認識機能が利用できます！`);
  console.log(`📄 PDF生成機能が利用できます！`);
  console.log(`🏥 ヘルスチェック: http://localhost:${PORT}/api/health`);
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`📂 アップロード先: ${require('path').join(__dirname, '../uploads')}`);
    console.log(`🔧 テストページ: ${require('path').join(__dirname, '../tools/test-pages')}`);
  }
});

// グレースフルシャットダウン
const gracefulShutdown = (signal) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);
  
  server.close((err) => {
    if (err) {
      logger.error('Error during server shutdown', { error: err.message });
      process.exit(1);
    }
    
    logger.info('Server closed successfully');
    process.exit(0);
  });

  // 強制終了タイマー（30秒）
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = server;