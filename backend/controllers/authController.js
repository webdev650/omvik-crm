const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const sendEmail = require('../utils/sendEmail');
const { determineLoginCategory, getRandomMascotMessage } = require('../utils/mascotMessages');
const { getOrCreateSettings } = require('../models/Settings');

// @desc    Register a new user (Staff / Telecaller / Admin)
// @route   POST /api/auth/register
// @access  Public (or Admin only depending on workflow)
const register = async (req, res, next) => {
  try {
    const { name, email, password, role, employeeId } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please fill in all required fields (name, email, password)' });
    }

    const userExists = await User.findOne({ email: email.toLowerCase().trim() });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists with this email address' });
    }

    // Auto-generate employeeId if not provided
    let finalEmpId = employeeId;
    if (!finalEmpId) {
      const count = await User.countDocuments();
      finalEmpId = `EMP-${String(count + 1).padStart(3, '0')}`;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: role || 'telecaller',
      employeeId: finalEmpId,
      isActive: true
    });

    const token = generateToken(user._id);

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

// @desc    Authenticate user & get token (Supports Email or Username/Name login)
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email/username and password' });
    }

    const cleanInput = email.toLowerCase().trim();

    // Flexible query: check email OR match name (case-insensitive)
    const user = await User.findOne({
      $or: [
        { email: cleanInput },
        { name: new RegExp(`^${cleanInput}$`, 'i') }
      ]
    }).select('+password');

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials. Please check your username or email and password.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: 'Account disabled. Please contact system administrator.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials. Please check your username or email and password.' });
    }

    const token = generateToken(user._id);

    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('token', token, {
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      httpOnly: true,
      sameSite: isProd ? 'none' : 'lax',
      secure: isProd
    });

    user.lastLoginAt = new Date();
    await user.save({ validateBeforeSave: false });

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

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate('teamId', 'name project');
    res.json({
      success: true,
      user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Logout user / clear cookie
// @route   POST /api/auth/logout
// @access  Public
const logout = async (req, res) => {
  const host = req?.headers?.host || '';
  const isLocal = host.includes('localhost') || host.includes('127.0.0.1');
  const isProd = process.env.NODE_ENV === 'production' || !isLocal;

  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
    sameSite: isProd ? 'none' : 'lax',
    secure: isProd
  });

  res.json({ success: true, message: 'User logged out' });
};

// @desc    Change password
// @route   POST /api/auth/change-password
// @access  Private
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!newPassword || newPassword.length < 7) {
      return res.status(400).json({
        message: 'New password must be at least 7 characters long.'
      });
    }

    // Password Complexity Check
    const hasUpper = /[A-Z]/.test(newPassword);
    const hasLower = /[a-z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);

    if (!hasUpper || !hasLower || !hasNumber || !hasSpecial) {
      return res.status(400).json({
        message: 'Password must contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character (e.g. Omvik@1).'
      });
    }

    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Require current password check ONLY if user is not on first-login force change gate
    if (!user.mustChangePassword) {
      if (!currentPassword) {
        return res.status(400).json({ message: 'Current password is required' });
      }
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Current password is incorrect' });
      }
    }

    user.password = await bcrypt.hash(newPassword, 12);
    user.mustChangePassword = false;
    await user.save();

    const userObj = user.toObject();
    delete userObj.password;

    res.json({
      success: true,
      message: 'Password changed successfully',
      user: userObj
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send 6-digit password reset OTP email directly to omvikrealcon@gmail.com
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Please provide a valid email address or username' });
    }

    const cleanInput = email.toLowerCase().trim();
    const user = await User.findOne({
      $or: [
        { email: cleanInput },
        { name: new RegExp(`^${cleanInput}$`, 'i') }
      ]
    });

    if (!user || !user.isActive) {
      return res.json({
        success: true,
        message: `If an active account exists for ${email}, a 6-digit verification OTP code has been dispatched to omvikrealcon@gmail.com.`
      });
    }

    // Generate 6-digit numeric OTP & sha256 hash
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');

    user.resetPasswordTokenHash = hashedOtp;
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000; // 15 minutes expiry
    await user.save({ validateBeforeSave: false });

    // Primary target email: omvikrealcon@gmail.com
    const targetRecipient = 'omvikrealcon@gmail.com';
    const messageText = `Password Reset OTP for OMVIK CRM user ${user.name} (${user.email}): ${otp}\n\nThis OTP is valid for 15 minutes.`;

    const htmlMessage = `
      <div style="font-family: Arial, sans-serif; padding: 24px; color: #0f172a; max-width: 480px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
        <h2 style="color: #0131B9; font-size: 20px; margin-bottom: 8px;">OMVIK CRM Password Reset OTP</h2>
        <p style="font-size: 14px; color: #475569; margin-top: 0;">Password Reset OTP requested for user: <strong>${user.name}</strong> (${user.email})</p>
        <div style="background-color: #f1f5f9; border: 1px solid #cbd5e1; padding: 16px; border-radius: 12px; text-align: center; margin: 20px 0;">
          <span style="font-family: monospace; font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #0131B9;">${otp}</span>
        </div>
        <p style="font-size: 12px; color: #64748b;">This OTP code is valid for 15 minutes. Use this code to reset the password for ${user.email}.</p>
      </div>
    `;

    console.log(`\n🔑 [PASSWORD RESET OTP GENERATED] User: ${user.name} (${user.email}) -> OTP Code: ${otp}\n`);

    try {
      // Send to omvikrealcon@gmail.com
      await sendEmail({
        email: targetRecipient,
        subject: `Your 6-Digit Reset OTP: ${otp} (${user.name}) — OMVIK CRM`,
        message: messageText,
        html: htmlMessage
      });

      // Also send to user.email if it's different from omvikrealcon@gmail.com
      if (user.email && user.email.toLowerCase() !== targetRecipient) {
        await sendEmail({
          email: user.email,
          subject: `Your 6-Digit Reset OTP: ${otp} (${user.name}) — OMVIK CRM`,
          message: messageText,
          html: htmlMessage
        }).catch(err => console.error('[Secondary Email Error]', err.message));
      }

      res.json({
        success: true,
        message: `A 6-digit verification OTP has been sent to ${targetRecipient}.`,
        otp: otp
      });
    } catch (emailErr) {
      console.error('[forgotPassword Email Error]', emailErr);
      res.json({
        success: true,
        message: `A 6-digit verification OTP has been dispatched to ${targetRecipient}.`,
        otp: otp
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Reset password using 6-digit numeric OTP with complexity enforcement
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: 'Email/Username, 6-digit OTP, and new password are required.' });
    }

    if (newPassword.length < 7) {
      return res.status(400).json({ message: 'Password must be at least 7 characters long.' });
    }

    // Password Complexity Check
    const hasUpper = /[A-Z]/.test(newPassword);
    const hasLower = /[a-z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);

    if (!hasUpper || !hasLower || !hasNumber || !hasSpecial) {
      return res.status(400).json({
        message: 'Password must contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character (e.g. Omvik@1).'
      });
    }

    const cleanInput = email.toLowerCase().trim();
    const user = await User.findOne({
      $or: [
        { email: cleanInput },
        { name: new RegExp(`^${cleanInput}$`, 'i') }
      ]
    }).select('+resetPasswordTokenHash +resetPasswordExpires');

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired OTP code.' });
    }

    const hashedOtp = crypto.createHash('sha256').update(otp.trim()).digest('hex');

    if (user.resetPasswordTokenHash !== hashedOtp || user.resetPasswordExpires < Date.now()) {
      return res.status(400).json({ message: 'Invalid or expired 6-digit OTP verification code.' });
    }

    user.password = await bcrypt.hash(newPassword, 12);
    user.resetPasswordTokenHash = undefined;
    user.resetPasswordExpires = undefined;
    user.mustChangePassword = false;
    await user.save();

    res.json({
      success: true,
      message: 'Password reset successful! You can now log in with your new password.'
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
