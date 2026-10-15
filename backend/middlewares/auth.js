const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  } else if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({ message: 'Not authorized, user not found' });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: 'User account is deactivated' });
    }

    if (user.mustChangePassword) {
      const allowedPaths = ['/api/auth/change-password', '/api/auth/me', '/api/auth/logout'];
      const currentPath = req.originalUrl ? req.originalUrl.split('?')[0] : '';
      const isAllowed = allowedPaths.some(p => currentPath === p || currentPath.endsWith('/change-password') || currentPath.endsWith('/logout') || currentPath.endsWith('/me'));
      if (!isAllowed) {
        return res.status(403).json({
          message: 'Password change is required before accessing system resources',
          code: 'PASSWORD_CHANGE_REQUIRED'
        });
      }
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Not authorized, token failed' });
  }
};

module.exports = { protect };
