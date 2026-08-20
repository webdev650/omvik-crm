const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');

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

    const userObj = user.toObject();
    delete userObj.password;

    res.json({
      success: true,
      user: userObj,
      token
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
  res.cookie('token', '', {
    httpOnly: true,
    sameSite: isProd ? 'none' : 'lax',
    secure: isProd,
    expires: new Date(0)
  });
  res.json({ success: true, message: 'Logged out successfully' });
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

// @desc    Send password reset email with secure hashed token
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
        message: 'If an active account exists for that email, a password reset link has been sent.'
      });
    }

    // Generate random 32-byte token & sha256 hash
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    user.resetPasswordTokenHash = hashedToken;
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000; // 15 minutes expiry
    await user.save({ validateBeforeSave: false });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}`;

    const messageText = `You requested a password reset for your OMVIK CRM account.\n\nPlease click the link below to set a new password (valid for 15 minutes):\n${resetUrl}\n\nIf you did not request this, please ignore this email.`;

    const htmlMessage = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #1e293b;">
        <h2 style="color: #4f46e5;">OMVIK CRM Password Reset</h2>
        <p>You requested a password reset for your OMVIK CRM account.</p>
        <p style="margin: 20px 0;">
          <a href="${resetUrl}" style="background-color: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Reset Password</a>
        </p>
        <p style="font-size: 12px; color: #64748b;">Or copy & paste this link into your browser: <br/><code>${resetUrl}</code></p>
        <p style="font-size: 12px; color: #94a3b8; margin-top: 20px;">This link will expire in 15 minutes.</p>
      </div>
    `;

    try {
      await sendEmail({
        email: user.email,
        subject: 'OMVIK CRM — Password Reset Request',
        message: messageText,
        html: htmlMessage
      });

      res.json({
        success: true,
        message: 'Password reset link sent to your email.'
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

// @desc    Reset password using valid token
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'Valid token and new password (min 6 chars) are required.' });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordTokenHash: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    }).select('+resetPasswordTokenHash +resetPasswordExpires');

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired password reset token.' });
    }

    user.password = await bcrypt.hash(newPassword, 12);
    user.mustChangePassword = false;
    user.resetPasswordTokenHash = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    const authToken = generateTokenAndSetCookie(req, res, user._id);

    const userObj = user.toObject();
    delete userObj.password;

    res.json({
      success: true,
      message: 'Password reset successfully',
      user: userObj,
      token: authToken
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
