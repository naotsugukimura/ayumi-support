const pdfService = require('../services/pdfService');
const { HTTP_STATUS, SUCCESS_MESSAGES } = require('../utils/constants');
const logger = require('../utils/logger');

class PdfController {
  async generateAssessmentSheet(req, res) {
    logger.info('Assessment sheet PDF generation started', {
      userName: req.body.userName,
      ip: req.ip
    });

    const result = await pdfService.generateAssessmentSheet(req.body);
    
    logger.info('Assessment sheet PDF generation completed', {
      filename: result.filename,
      path: result.path
    });

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'アセスメント表PDFの生成が完了しました',
      filename: result.filename,
      path: result.path
    });
  }

  async generateInterviewRecord(req, res) {
    logger.info('Interview record PDF generation started', {
      userName: req.body.userName,
      ip: req.ip
    });

    const result = await pdfService.generateInterviewRecord(req.body);
    
    logger.info('Interview record PDF generation completed', {
      filename: result.filename,
      path: result.path
    });

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: '面談記録PDFの生成が完了しました',
      filename: result.filename,
      path: result.path
    });
  }

  async generateServiceRecord(req, res) {
    logger.info('Service record PDF generation started', {
      userName: req.body.userName,
      ip: req.ip
    });

    const result = await pdfService.generateServiceRecord(req.body);
    
    logger.info('Service record PDF generation completed', {
      filename: result.filename,
      path: result.path
    });

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'サービス提供実績記録表PDFの生成が完了しました',
      filename: result.filename,
      path: result.path
    });
  }

  async generateIndividualSupportPlan(req, res) {
    logger.info('Individual support plan PDF generation started', {
      userName: req.body.userName,
      ip: req.ip
    });

    const result = await pdfService.generateIndividualSupportPlan(req.body);
    
    logger.info('Individual support plan PDF generation completed', {
      filename: result.filename,
      path: result.path
    });

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: '個別支援計画書PDFの生成が完了しました',
      filename: result.filename,
      path: result.path
    });
  }

  async generateMonitoringRecord(req, res) {
    logger.info('Monitoring record PDF generation started', {
      userName: req.body.userName,
      ip: req.ip
    });

    const result = await pdfService.generateMonitoringRecord(req.body);
    
    logger.info('Monitoring record PDF generation completed', {
      filename: result.filename,
      path: result.path
    });

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'モニタリング記録表PDFの生成が完了しました',
      filename: result.filename,
      path: result.path
    });
  }
}

module.exports = new PdfController();