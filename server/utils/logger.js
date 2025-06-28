const fs = require('fs');
const path = require('path');

const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const levels = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

class Logger {
  constructor() {
    this.logLevel = process.env.LOG_LEVEL || 'INFO';
    this.currentLevel = levels[this.logLevel.toUpperCase()] || levels.INFO;
  }

  log(level, message, meta = {}) {
    if (levels[level] > this.currentLevel) return;

    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...meta
    };

    // コンソール出力
    const formattedMessage = `[${timestamp}] ${level}: ${message}`;
    if (level === 'ERROR') {
      console.error(formattedMessage, meta);
    } else if (level === 'WARN') {
      console.warn(formattedMessage, meta);
    } else {
      console.log(formattedMessage, meta);
    }

    // ファイル出力
    this.writeToFile(level, logEntry);
  }

  writeToFile(level, logEntry) {
    try {
      const date = new Date().toISOString().split('T')[0];
      const filename = level === 'ERROR' ? 
        path.join(logsDir, `error-${date}.log`) :
        path.join(logsDir, `app-${date}.log`);
      
      const logLine = JSON.stringify(logEntry) + '\n';
      fs.appendFileSync(filename, logLine);
    } catch (error) {
      console.error('ログファイル書き込みエラー:', error);
    }
  }

  error(message, meta) {
    this.log('ERROR', message, meta);
  }

  warn(message, meta) {
    this.log('WARN', message, meta);
  }

  info(message, meta) {
    this.log('INFO', message, meta);
  }

  debug(message, meta) {
    this.log('DEBUG', message, meta);
  }
}

module.exports = new Logger();