const logger = require('./logger');

/**
 * API呼び出し用リトライユーティリティ
 * OpenAI WhisperとAnthropic Claude APIの共通リトライロジック
 */
class APIRetryUtil {
  /**
   * リトライ付きAPI呼び出し
   * @param {Function} apiCall - 実行するAPI呼び出し関数
   * @param {string} serviceName - サービス名（ログ用）
   * @param {number} maxRetries - 最大リトライ回数
   * @param {number} timeoutMs - タイムアウト時間（ミリ秒）
   * @returns {Promise} API呼び出し結果
   */
  static async callWithRetry(apiCall, serviceName, maxRetries = 3, timeoutMs = 90000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.info(`${serviceName} API call attempt ${attempt}/${maxRetries}`);
        
        // タイムアウト付きでAPI呼び出し
        const result = await Promise.race([
          apiCall(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error(`${serviceName} API timeout after ${timeoutMs/1000} seconds`)), timeoutMs)
          )
        ]);

        logger.info(`${serviceName} API call successful on attempt ${attempt}`);
        return result;

      } catch (error) {
        const isTimeout = error.message.includes('timeout') || error.code === 'ETIMEDOUT';
        const isRateLimit = error.status === 429;
        const isServerError = error.status >= 500;

        logger.warn(`${serviceName} API call failed on attempt ${attempt}/${maxRetries}`, {
          error: error.message,
          status: error.status,
          isTimeout,
          isRateLimit,
          isServerError
        });

        // 最後の試行でエラーが発生した場合は例外を投げる
        if (attempt === maxRetries) {
          throw new Error(`${serviceName} API failed after ${maxRetries} attempts: ${error.message}`);
        }

        // リトライ前の待機時間（指数バックオフ）
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // 最大10秒
        logger.info(`Retrying ${serviceName} API call in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * OpenAI Whisper API専用設定
   */
  static async callWhisperAPI(apiCall) {
    return await this.callWithRetry(apiCall, 'OpenAI Whisper API', 3, 90000);
  }

  /**
   * Anthropic Claude API専用設定
   */
  static async callClaudeAPI(apiCall) {
    return await this.callWithRetry(apiCall, 'Anthropic Claude API', 3, 60000);
  }
}

module.exports = APIRetryUtil;