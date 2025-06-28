const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// ログイン試行の制限
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 5, // 最大5回の試行
  message: {
    error: 'ログイン試行回数が上限に達しました。15分後に再試行してください。',
    code: 'LOGIN_RATE_LIMIT'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // 開発環境では制限をスキップ
    return process.env.NODE_ENV === 'development';
  }
});

// 簡単なユーザーデータ（本番環境ではデータベースを使用）
const users = [
  {
    id: 1,
    username: 'admin',
    password: '$2a$10$rXKnY8nqP1YMzqZ2.F9nMOkN3L4p5Rz7SqVw6Ux8Qy9Wer1T2V3C4', // 'admin123'
    roles: ['admin', 'user'],
    name: '管理者',
    email: 'admin@ayumi-support.com'
  },
  {
    id: 2,
    username: 'staff',
    password: '$2a$10$vWxYzAb1Cd2Ef3Gh4Ij5Kl6Mn7Op8Qr9St0Uv1Wx2Yz3Ab4Cd5Ef6', // 'staff123'
    roles: ['user'],
    name: '職員',
    email: 'staff@ayumi-support.com'
  }
];

/**
 * ログイン認証
 * POST /auth/login
 */
router.post('/login', loginLimiter, asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  // 入力値検証
  if (!username || !password) {
    logger.warn('Login attempt with missing credentials', {
      ip: req.ip,
      username: username || 'missing'
    });
    return res.status(400).json({
      error: 'ユーザー名とパスワードを入力してください',
      code: 'MISSING_CREDENTIALS'
    });
  }

  // ユーザー検索
  const user = users.find(u => u.username === username);
  if (!user) {
    logger.warn('Login attempt with invalid username', {
      ip: req.ip,
      username
    });
    return res.status(401).json({
      error: 'ユーザー名またはパスワードが正しくありません',
      code: 'INVALID_CREDENTIALS'
    });
  }

  // パスワード検証
  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) {
    logger.warn('Login attempt with invalid password', {
      ip: req.ip,
      username,
      userId: user.id
    });
    return res.status(401).json({
      error: 'ユーザー名またはパスワードが正しくありません',
      code: 'INVALID_CREDENTIALS'
    });
  }

  // JWTトークン生成
  const token = jwt.sign(
    {
      id: user.id,
      username: user.username,
      roles: user.roles,
      name: user.name
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.SESSION_TIMEOUT ? `${process.env.SESSION_TIMEOUT}s` : '1h'
    }
  );

  logger.info('User logged in successfully', {
    userId: user.id,
    username: user.username,
    ip: req.ip
  });

  res.json({
    message: 'ログインに成功しました',
    token,
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      roles: user.roles
    },
    expiresIn: process.env.SESSION_TIMEOUT || 3600
  });
}));

/**
 * トークン検証・更新
 * POST /auth/refresh
 */
router.post('/refresh', asyncHandler(async (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      error: 'トークンが必要です',
      code: 'NO_TOKEN'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 新しいトークンを発行
    const newToken = jwt.sign(
      {
        id: decoded.id,
        username: decoded.username,
        roles: decoded.roles,
        name: decoded.name
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.SESSION_TIMEOUT ? `${process.env.SESSION_TIMEOUT}s` : '1h'
      }
    );

    logger.info('Token refreshed successfully', {
      userId: decoded.id,
      username: decoded.username
    });

    res.json({
      message: 'トークンを更新しました',
      token: newToken,
      expiresIn: process.env.SESSION_TIMEOUT || 3600
    });

  } catch (err) {
    logger.warn('Token refresh failed', {
      error: err.message,
      ip: req.ip
    });
    
    res.status(403).json({
      error: 'トークンが無効です',
      code: 'INVALID_TOKEN'
    });
  }
}));

/**
 * ログアウト
 * POST /auth/logout
 */
router.post('/logout', asyncHandler(async (req, res) => {
  // JWTはステートレスなので、クライアント側でトークンを削除する必要がある
  // 将来的にはRedisなどでブラックリストを管理することも可能
  
  logger.info('User logged out', {
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.json({
    message: 'ログアウトしました',
    code: 'LOGOUT_SUCCESS'
  });
}));

/**
 * 現在のユーザー情報取得
 * GET /auth/me
 */
router.get('/me', require('../middleware/auth').authenticateToken, asyncHandler(async (req, res) => {
  const user = users.find(u => u.id === req.user.id);
  
  if (!user) {
    return res.status(404).json({
      error: 'ユーザーが見つかりません',
      code: 'USER_NOT_FOUND'
    });
  }

  res.json({
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      roles: user.roles
    }
  });
}));

/**
 * パスワード変更
 * POST /auth/change-password
 */
router.post('/change-password', 
  require('../middleware/auth').authenticateToken,
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15分
    max: 3, // 最大3回
    message: {
      error: 'パスワード変更の試行回数が上限に達しました',
      code: 'PASSWORD_CHANGE_RATE_LIMIT'
    }
  }),
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: '現在のパスワードと新しいパスワードを入力してください',
        code: 'MISSING_PASSWORDS'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        error: 'パスワードは8文字以上で設定してください',
        code: 'PASSWORD_TOO_SHORT'
      });
    }

    const user = users.find(u => u.id === req.user.id);
    if (!user) {
      return res.status(404).json({
        error: 'ユーザーが見つかりません',
        code: 'USER_NOT_FOUND'
      });
    }

    // 現在のパスワード確認
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      logger.warn('Password change attempt with invalid current password', {
        userId: user.id,
        ip: req.ip
      });
      return res.status(401).json({
        error: '現在のパスワードが正しくありません',
        code: 'INVALID_CURRENT_PASSWORD'
      });
    }

    // 新しいパスワードをハッシュ化
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedNewPassword;

    logger.info('Password changed successfully', {
      userId: user.id,
      ip: req.ip
    });

    res.json({
      message: 'パスワードを変更しました',
      code: 'PASSWORD_CHANGED'
    });
  })
);

module.exports = router;