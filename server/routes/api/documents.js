const express = require('express');
const router = express.Router();
const { upload } = require('../../../config/storage');
const { validateAudioFile, validateApiKeys } = require('../../middleware/validation');
const { asyncHandler } = require('../../middleware/errorHandler');
const multiDocumentController = require('../../controllers/multiDocumentController');

// 音声から複数帳票同時生成
router.post('/generate-multiple-from-audio',
  upload.single('audioFile'),
  validateAudioFile,
  validateApiKeys,
  asyncHandler(multiDocumentController.generateMultipleFromAudio)
);

// テキストから複数帳票生成
router.post('/generate-multiple-from-text',
  validateApiKeys,
  asyncHandler(multiDocumentController.generateMultipleFromText)
);

// 利用可能な帳票タイプ一覧
router.get('/available-types',
  asyncHandler(multiDocumentController.getAvailableDocuments)
);

// 推奨帳票の提案
router.post('/suggest',
  asyncHandler(multiDocumentController.suggestDocuments)
);

// 帳票生成プレビュー
router.post('/preview',
  validateApiKeys,
  asyncHandler(multiDocumentController.previewGeneration)
);

module.exports = router;