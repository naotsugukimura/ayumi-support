const express = require('express');
const router = express.Router();
const { validatePdfData } = require('../../middleware/validation');
const { asyncHandler } = require('../../middleware/errorHandler');
const pdfController = require('../../controllers/pdfController');

// アセスメント表PDF生成
router.post('/assessment-sheet',
  validatePdfData,
  asyncHandler(pdfController.generateAssessmentSheet)
);

// 面談記録PDF生成
router.post('/interview-record',
  validatePdfData,
  asyncHandler(pdfController.generateInterviewRecord)
);

// サービス提供実績記録表PDF生成
router.post('/service-record',
  validatePdfData,
  asyncHandler(pdfController.generateServiceRecord)
);

// 個別支援計画書PDF生成
router.post('/individual-support-plan',
  validatePdfData,
  asyncHandler(pdfController.generateIndividualSupportPlan)
);

// モニタリング記録表PDF生成
router.post('/monitoring-record',
  validatePdfData,
  asyncHandler(pdfController.generateMonitoringRecord)
);

module.exports = router;