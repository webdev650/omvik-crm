const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const LoginLog = require('../models/LoginLog');
const { getOrCreateSettings } = require('../models/Settings');
const { getRandomMascotMessage } = require('../utils/mascotMessages');
const sendEmail = require('../utils/sendEmail');
const sendAdminAlert = require('../utils/sendAdminAlert');

const generateTokenAndSetCookie = (req, res, userId) => {
  const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: '7d'
  });

  const host = req?.headers?.host || '';
  const isLocal = host.includes('localhost') || host.includes('127.0.0.1');
  const isProd = process.env.NODE_ENV === 'production' || !isLocal;

  res.cookie('token', token, {
    httpOnly: true,
    sameSite: isProd ? 'none' : 'lax',
    secure: isProd,
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  return token;
};

// Helper: Determine Login Time Category
const parseHHMM = (str, defaultMins) => {
  if (!str || typeof str !== 'string' || !str.includes(':')) return defaultMins;
  const [h, m] = str.split(':').map(Number);
  return h * 60 + m;
};

const determineLoginCategory = (settings) => {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const workStartMins = parseHHMM(settings.workStartTime, 10 * 60);
  const graceMins = Number(settings.workStartGraceMinutes) || 30;
  const workCutoffMins = workStartMins + graceMins;

  const lunchStartMins = parseHHMM(settings.lunchWindowStart, 13 * 60);
  const lunchEndMins = parseHHMM(settings.lunchWindowEnd, 14 * 60);

  if (currentMinutes < 7 * 60 || currentMinutes >= 20 * 60) {
    return 'lateNightLogin';
  }
  if (currentMinutes >= lunchStartMins && currentMinutes <= lunchEndMins) {
    return 'lunchLogin';
  }
  if (currentMinutes <= workCutoffMins) {
    return 'onTimeLogin';
  }
  return 'lateLogin';
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res, next) => {
  try {
    const { name, email, password, role, teamId } = req.validatedData;

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: role || 'telecaller',
      teamId: teamId || null
    });

    const token = generateTokenAndSetCookie(req, res, user._id);

    const userObj = user.toObject();
    delete userObj.password;

    res.status(201).json({
      success: true,
      user: userObj,
      token
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res, next) => {
  try {
    const { email, password } = req.validatedData;

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: 'User account is deactivated' });
    }

    const token = generateTokenAndSetCookie(req, res, user._id);

    // Non-blocking LoginLog record creation
    try {
      const rawIp = req.headers['x-forwarded-for']
        ? req.headers['x-forwarded-for'].split(',')[0].trim()
        : req.ip || req.connection?.remoteAddress || 'Unknown';

      const userAgent = req.headers['user-agent'] || 'Unknown';

      await LoginLog.create({
        user: user._id,
        loginAt: new Date(),
        ipAddress: rawIp,
        userAgent
      });
    } catch (logErr) {
      console.error('Failed to record LoginLog:', logErr.message);
    }

    const userObj = user.toObject();
    delete userObj.password;

    // Mascot Greeting Category Determination
    let greeting = null;
    if (user.nudgesEnabled !== false) {
      const settings = await getOrCreateSettings();
      const category = determineLoginCategory(settings);
      greeting = getRandomMascotMessage(category, user.name);
    }

    res.json({
      success: true,
      user: userObj,
      token,
      greeting
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
};

// @desc    Log user out / clear cookie
// @route   POST /api/auth/logout
// @access  Private
const logout = async (req, res) => {
  const host = req?.headers?.host || '';
  const isLocal = host.includes('localhost') || host.includes('127.0.0.1');
  const isProd = process.env.NODE_ENV === 'production' || !isLocal;

  let farewell = null;
  if (req.user && req.user.nudgesEnabled !== false) {
    farewell = getRandomMascotMessage('logout', req.user.name);
  }

  res.cookie('token', '', {
    httpOnly: true,
    sameSite: isProd ? 'none' : 'lax',
    secure: isProd,
    expires: new Date(0)
  });

  res.json({
    success: true,
    message: 'Logged out successfully',
    farewell
  });
};

// @desc    Change password for logged-in user (clears mustChangePassword)
// @route   POST /api/auth/change-password
// @access  Private
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword || newPassword.length < 6) {
      return res.status(400).json({
        message: 'Please provide current password and a new password with at least 6 characters.'
      });
    }

    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    user.password = await bcrypt.hash(newPassword, 12);
    user.mustChangePassword = false;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send 6-digit password reset OTP email
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Please provide an email address' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user || !user.isActive) {
      return res.json({
        success: true,
        message: 'If an active account exists for that email, a 6-digit verification OTP has been sent.'
      });
    }

    // Generate 6-digit numeric OTP & sha256 hash
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');

    user.resetPasswordTokenHash = hashedOtp;
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000; // 15 minutes expiry
    await user.save({ validateBeforeSave: false });

    const messageText = `Password Reset OTP for OMVIK CRM user ${user.name} (${user.email}): ${otp}\n\nThis OTP is valid for 15 minutes.`;

    const htmlMessage = `
      <div style="font-family: Arial, sans-serif; padding: 24px; color: #0f172a; max-width: 480px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
        <h2 style="color: #4f46e5; font-size: 20px; margin-bottom: 8px;">OMVIK CRM Password Reset OTP</h2>
        <p style="font-size: 14px; color: #475569; margin-top: 0;">Password Reset OTP requested for: <strong>${user.name}</strong> (${user.email})</p>
        <div style="background-color: #f1f5f9; border: 1px solid #cbd5e1; padding: 16px; border-radius: 12px; text-align: center; margin: 20px 0;">
          <span style="font-family: monospace; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1e1b4b;">${otp}</span>
        </div>
        <p style="font-size: 12px; color: #64748b;">This OTP code is valid for 15 minutes. Use this code to reset password for ${user.email}.</p>
      </div>
    `;

    try {
      // Send OTP ONLY to omvikrealcon@gmail.com for both admins and employees
      const targetEmail = process.env.ADMIN_ALERT_EMAIL || 'omvikrealcon@gmail.com';
      await sendEmail({
        email: targetEmail,
        subject: `Your 6-Digit Reset OTP: ${otp} (${user.name}) — OMVIK CRM`,
        message: messageText,
        html: htmlMessage
      });

      res.json({
        success: true,
        message: `A 6-digit verification OTP has been sent to ${targetEmail}.`
      });
    } catch (emailErr) {
      console.error('[forgotPassword Email Error]', emailErr);
      user.resetPasswordTokenHash = undefined;
      user.resetPasswordExpires = undefined;
      await user.save({ validateBeforeSave: false });

      return res.status(500).json({ message: 'Email could not be sent. Please try again later.' });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Reset password using 6-digit numeric OTP
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'Email, 6-digit OTP, and new password (min 6 chars) are required.' });
    }

    const cleanOtp = otp.toString().trim();
    const hashedOtp = crypto.createHash('sha256').update(cleanOtp).digest('hex');

    const user = await User.findOne({
      email: email.toLowerCase().trim(),
      resetPasswordTokenHash: hashedOtp,
      resetPasswordExpires: { $gt: Date.now() }
    }).select('+resetPasswordTokenHash +resetPasswordExpires');

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired 6-digit OTP code. Please request a new OTP.' });
    }

    user.password = await bcrypt.hash(newPassword, 12);
    user.resetPasswordTokenHash = undefined;
    user.resetPasswordExpires = undefined;
    user.mustChangePassword = false;
    await user.save();

    res.json({
      success: true,
      message: 'Password reset successfully! You can now log in with your new password.'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getMe,
  logout,
  changePassword,
  forgotPassword,
  resetPassword
};
