const express = require('express');
const router = express.Router();
const { upload } = require('../../../config/storage');
const { validateAudioFile, validateApiKeys } = require('../../middleware/validation');
const { asyncHandler } = require('../../middleware/errorHandler');
const databaseController = require('../../controllers/databaseController');

// 音声からデータベース自動更新（包括的）
router.post('/process-audio',
  upload.single('audioFile'),
  validateAudioFile,
  validateApiKeys,
  asyncHandler(databaseController.processAudioToDatabase)
);

// 利用者マスタ自動更新
router.post('/update-user-master',
  upload.single('audioFile'),
  validateAudioFile,
  validateApiKeys,
  asyncHandler(databaseController.updateUserMaster)
);

// サービス提供実績自動記録
router.post('/record-service',
  upload.single('audioFile'),
  validateAudioFile,
  validateApiKeys,
  asyncHandler(databaseController.recordServiceProvision)
);

// 目標達成度自動評価・入力
router.post('/evaluate-goals',
  upload.single('audioFile'),
  validateAudioFile,
  validateApiKeys,
  asyncHandler(databaseController.evaluateGoals)
);

// サポートされているテーブル一覧
router.get('/supported-tables',
  asyncHandler(databaseController.getSupportedTables)
);

// 推奨テーブルの提案
router.post('/suggest-tables',
  asyncHandler(databaseController.suggestTables)
);

// データベース更新プレビュー
router.post('/preview-update',
  validateApiKeys,
  asyncHandler(databaseController.previewDatabaseUpdate)
);

module.exports = router;