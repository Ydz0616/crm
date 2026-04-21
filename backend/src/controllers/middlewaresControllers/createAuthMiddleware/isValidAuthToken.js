const jwt = require('jsonwebtoken');

const mongoose = require('mongoose');

const isValidAuthToken = async (req, res, next, { userModel, jwtSecret = 'JWT_SECRET' }) => {
  // In development mode with setup flag, skip authentication
  if (process.env.NODE_ENV === 'development' && process.env.BYPASS_AUTH === 'true') {
    console.log('🔓 Authentication bypassed in development mode');
    const User = mongoose.model(userModel);
    // Find any admin user to use
    const user = await User.findOne({ removed: false }).sort({ created: -1 });
    if (user) {
      const reqUserName = userModel.toLowerCase();
      req[reqUserName] = user;
      return next();
    }
  }

  try {
    const UserPassword = mongoose.model(userModel + 'Password');
    const User = mongoose.model(userModel);
    const token = req.cookies.token;
    if (!token)
      return res.status(401).json({
        success: false,
        result: null,
        message: 'No authentication token, authorization denied.',
        jwtExpired: true,
      });

    const verified = jwt.verify(token, process.env[jwtSecret]);

    if (!verified)
      return res.status(401).json({
        success: false,
        result: null,
        message: 'Token verification failed, authorization denied.',
        jwtExpired: true,
      });

    const userPasswordPromise = UserPassword.findOne({ user: verified.id, removed: false });
    const userPromise = User.findOne({ _id: verified.id, removed: false });

    const [user, userPassword] = await Promise.all([userPromise, userPasswordPromise]);

    if (!user)
      return res.status(401).json({
        success: false,
        result: null,
        message: "User doesn't Exist, authorization denied.",
        jwtExpired: true,
      });

    const { loggedSessions } = userPassword;
    if (!loggedSessions.includes(token))
      return res.status(401).json({
        success: false,
        result: null,
        message: 'User is already logout try to login, authorization denied.',
        jwtExpired: true,
      });
    else {
      const reqUserName = userModel.toLowerCase();
      req[reqUserName] = user;
      next();
    }
  } catch (error) {
    // JWT lib 抛的错都是认证失败（invalid signature / expired / malformed），
    // 返 401 + jwtExpired 让前端清 cookie 走登出流程；
    // 503 会被 errorHandler 识别为 "Cannot connect to server" 假象，导致用户陷在
    // "登录报 Invalid Signature" 而无法登录（issue #110 根因：JWT_SECRET 换过或
    // 本地/生产环境不同，浏览器残留旧 cookie 签名验不过，永久卡住）。
    if (
      error.name === 'JsonWebTokenError' ||
      error.name === 'TokenExpiredError' ||
      error.name === 'NotBeforeError'
    ) {
      return res.status(401).json({
        success: false,
        result: null,
        message: 'Authentication token invalid or expired. Please log in again.',
        jwtExpired: true,
      });
    }
    // 其他才是真 server error（DB 挂等）
    console.error('Auth middleware error:', error);
    return res.status(503).json({
      success: false,
      result: null,
      message: error.message,
    });
  }
};

module.exports = isValidAuthToken;
