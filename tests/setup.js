// Jestテストセットアップファイル
const path = require('path');
const fs = require('fs');

// テスト環境変数の設定
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';

// テスト用ディレクトリの作成
const testDirs = [
  path.join(__dirname, '../generated'),
  path.join(__dirname, '../uploads'),
  path.join(__dirname, '../logs')
];

testDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// テスト開始時の通知
console.log('🧪 Jest テスト環境のセットアップが完了しました');

// グローバルなテストタイムアウト設定
jest.setTimeout(30000);