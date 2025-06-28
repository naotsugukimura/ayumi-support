const express = require('express');
const router = express.Router();
const { upload } = require('../../../config/storage');
const { validateAudioFile, validateApiKeys } = require('../../middleware/validation');
const { asyncHandler } = require('../../middleware/errorHandler');
const audioController = require('../../controllers/audioController');

// 音声ファイルアップロード
router.post('/upload', 
  upload.single('audioFile'),
  validateAudioFile,
  asyncHandler(audioController.uploadAudio)
);

// 音声認識 + アップロード
router.post('/upload-and-transcribe',
  upload.single('audioFile'),
  validateAudioFile,
  validateApiKeys,
  asyncHandler(audioController.uploadAndTranscribe)
);

// AI解析 + 音声認識 + アップロード
router.post('/upload-transcribe-analyze',
  upload.single('audioFile'),
  validateAudioFile,
  validateApiKeys,
  asyncHandler(audioController.uploadTranscribeAnalyze)
);

// デモ用: APIキー無しでのサンプル音声処理
router.post('/demo-transcribe',
  upload.single('audioFile'),
  validateAudioFile,
  asyncHandler(audioController.demoTranscribe)
);

// テスト用: 簡単なエコーバック
router.post('/test-upload',
  upload.single('audioFile'),
  validateAudioFile,
  asyncHandler(audioController.testUpload)
);

// 精度測定
router.post('/measure-accuracy',
  upload.single('audioFile'),
  validateAudioFile,
  validateApiKeys,
  asyncHandler(audioController.measureAccuracy)
);

// 音質評価
router.post('/evaluate-quality',
  upload.single('audioFile'),
  validateAudioFile,
  asyncHandler(audioController.evaluateQuality)
);

// 音声前処理
router.post('/preprocess',
  upload.single('audioFile'),
  validateAudioFile,
  asyncHandler(audioController.preprocessAudio)
);

// 精度レポート生成
router.get('/accuracy-report',
  asyncHandler(audioController.generateAccuracyReport)
);

// 改善提案取得
router.get('/improvement-suggestions',
  asyncHandler(audioController.getImprovementSuggestions)
);

// 精度レポート保存
router.post('/save-report',
  asyncHandler(audioController.saveAccuracyReport)
);

// 品質評価（APIキー不要）
router.post('/evaluate-quality',
  upload.single('audioFile'),
  validateAudioFile,
  asyncHandler(audioController.evaluateQuality)
);

module.exports = router;