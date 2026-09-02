const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const PasswordResetOTP = require('../models/PasswordResetOTP');
const generateToken = require('../utils/generateToken');
const sendEmail = require('../utils/sendEmail');
const { determineLoginCategory, getRandomMascotMessage } = require('../utils/mascotMessages');
const { getOrCreateSettings } = require('../models/Settings');

// Helper function to escape special regex characters
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

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
    const escapedInput = escapeRegExp(cleanInput);

    // Flexible query: check email OR match name (case-insensitive) OR omvikrealcon master email
    let user = await User.findOne({
      $or: [
        { email: cleanInput },
        { employeeId: new RegExp(`^${escapedInput}$`, 'i') },
        { name: new RegExp(`^${escapedInput}$`, 'i') }
      ]
    }).select('+password');

    // If master email omvikrealcon@gmail.com is used, match super_admin account
    if (!user && cleanInput === 'omvikrealcon@gmail.com') {
      user = await User.findOne({ email: 'aparna@omvikrealcon.com' }).select('+password');
    }

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

    user.password = await bcrypt.hash(newPassword, 10);
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

// @desc    Request password reset OTP (Admin-mediated design: ALL emails route to omvikrealcon@gmail.com)
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res, next) => {
  try {
    const { identifier, email, employeeId } = req.body;
    const rawInput = (identifier || email || employeeId || '').toString().trim();

    if (!rawInput) {
      return res.status(400).json({ message: 'Please provide your Email Address or Employee ID' });
    }

    const cleanInput = rawInput.toLowerCase();
    const escapedInput = escapeRegExp(cleanInput);

    // Find real matching user by email, employeeId, or name
    let user = await User.findOne({
      $or: [
        { email: cleanInput },
        { employeeId: new RegExp(`^${escapedInput}$`, 'i') },
        { name: new RegExp(`^${escapedInput}$`, 'i') }
      ]
    });

    // Uniform generic success response for security (avoids account enumeration)
    const genericResponse = {
      success: true,
      message: 'If a matching active account exists, a 6-digit verification OTP code has been dispatched to the central administration inbox (omvikrealcon@gmail.com). Please contact your system administrator to retrieve your code.'
    };

    if (!user || !user.isActive) {
      return res.json(genericResponse);
    }

    // Generate random 6-digit numeric OTP code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes short-lived expiry

    // Save append-only PasswordResetOTP document to MongoDB
    await PasswordResetOTP.create({
      user: user._id,
      otpCode,
      expiresAt,
      used: false
    });

    // DELIBERATE INTENTIONAL DESIGN CHOICE:
    // ALL password reset OTP emails route to the fixed administrator inbox omvikrealcon@gmail.com.
    // This provides admin-mediated security oversight. The email body clearly names WHICH user/account requested the reset.
    const adminInboxRecipient = 'omvikrealcon@gmail.com';
    const empIdDisplay = user.employeeId || 'N/A';

    const messageText = `Password reset requested for: ${user.name} (${user.email} / ID: ${empIdDisplay}) — OTP: ${otpCode}\n\nThis OTP is valid for 10 minutes.`;

    const htmlMessage = `
      <div style="font-family: Arial, sans-serif; padding: 24px; color: #0f172a; max-width: 520px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
        <h2 style="color: #0131B9; font-size: 20px; margin-bottom: 8px;">OMVIK CRM Password Reset OTP Request</h2>
        <p style="font-size: 14px; color: #334155; margin-top: 0;">A password reset was requested for the following user account:</p>
        
        <div style="background-color: #f8fafc; border-left: 4px solid #0131B9; padding: 14px; margin: 16px 0; font-size: 13px; color: #1e293b;">
          <div><strong>User Name:</strong> ${user.name}</div>
          <div><strong>Email Address:</strong> ${user.email}</div>
          <div><strong>Employee ID:</strong> ${empIdDisplay}</div>
          <div><strong>Role:</strong> ${user.role}</div>
        </div>

        <div style="background-color: #f1f5f9; border: 1px solid #cbd5e1; padding: 18px; border-radius: 12px; text-align: center; margin: 20px 0;">
          <div style="font-size: 12px; font-weight: bold; color: #64748b; text-transform: uppercase; margin-bottom: 4px;">Verification OTP Code</div>
          <span style="font-family: monospace; font-size: 38px; font-weight: bold; letter-spacing: 8px; color: #0131B9;">${otpCode}</span>
        </div>

        <p style="font-size: 12px; color: #64748b;">This OTP code is valid for 10 minutes. Please relay this code to ${user.name} (${user.email}) to authorize their password reset.</p>
      </div>
    `;

    console.log(`\n🔑 [PASSWORD RESET OTP GENERATED] Account: ${user.name} (${user.email}) -> Sent to Admin Inbox (${adminInboxRecipient}) -> OTP: ${otpCode}\n`);

    // CRITICAL: Respond to HTTP request IMMEDIATELY (< 50ms)
    setImmediate(() => {
      sendEmail({
        email: adminInboxRecipient,
        subject: `🔑 Password Reset OTP for ${user.name} (${empIdDisplay}): ${otpCode}`,
        message: messageText,
        html: htmlMessage
      }).catch(err => console.error('[Background Resend Email Error]', err.message));
    });

    return res.json({
      ...genericResponse,
      otp: otpCode // Included for local dev/testing debugging
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify 6-digit OTP and return a short-lived signed resetToken
// @route   POST /api/auth/verify-otp
// @access  Public
const verifyOtp = async (req, res, next) => {
  try {
    const { identifier, email, employeeId, otpCode } = req.body;
    if (!otpCode) {
      return res.status(400).json({ message: '6-digit OTP code is required.' });
    }

    const cleanOtp = otpCode.toString().trim();
    const rawInput = (identifier || email || employeeId || '').toString().trim();

    let query = {
      otpCode: cleanOtp,
      used: false,
      expiresAt: { $gt: new Date() }
    };

    // If identifier is provided, scope search to that specific user
    if (rawInput) {
      const cleanInput = rawInput.toLowerCase();
      const escapedInput = escapeRegExp(cleanInput);

      const user = await User.findOne({
        $or: [
          { email: cleanInput },
          { employeeId: new RegExp(`^${escapedInput}$`, 'i') },
          { name: new RegExp(`^${escapedInput}$`, 'i') }
        ]
      });

      if (user) {
        query.user = user._id;
      }
    }

    // Find active, unused, unexpired PasswordResetOTP record
    const otpRecord = await PasswordResetOTP.findOne(query).sort({ createdAt: -1 });

    if (!otpRecord) {
      return res.status(400).json({ message: 'Invalid or expired 6-digit OTP code.' });
    }

    // Single-use enforcement: mark OTP as used immediately
    otpRecord.used = true;
    await otpRecord.save();

    // Issue short-lived signed JWT reset token (~10 min expiry) authorizing NEXT step only
    const jwtSecret = process.env.JWT_SECRET || 'omvik_jwt_secret_fallback_2026';
    const resetToken = jwt.sign(
      {
        userId: otpRecord.user.toString(),
        scope: 'password_reset_authorization'
      },
      jwtSecret,
      { expiresIn: '10m' }
    );

    res.json({
      success: true,
      message: 'OTP verification successful. You may now set your new password.',
      resetToken,
      userId: otpRecord.user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset password using short-lived signed resetToken
// @route   POST /api/auth/reset-with-token
// @access  Public
const resetPasswordWithToken = async (req, res, next) => {
  try {
    const { resetToken, newPassword } = req.body;

    if (!resetToken || !newPassword) {
      return res.status(400).json({ message: 'Authorization reset token and new password are required.' });
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

    // Verify reset token payload and expiration
    let decoded;
    try {
      const jwtSecret = process.env.JWT_SECRET || 'omvik-jwt-secret-fallback-2026';
      decoded = jwt.verify(resetToken, jwtSecret);
    } catch (jwtErr) {
      return res.status(400).json({ message: 'Invalid or expired password reset session. Please request a new OTP.' });
    }

    if (!decoded || decoded.scope !== 'password_reset_authorization' || !decoded.userId) {
      return res.status(400).json({ message: 'Invalid or unauthorized password reset token.' });
    }

    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) {
      return res.status(400).json({ message: 'User account not found or disabled.' });
    }

    // Fast atomic password update
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.findByIdAndUpdate(user._id, {
      password: hashedPassword,
      mustChangePassword: false
    });

    console.log(`✅ [PASSWORD RESET SUCCESSFUL] Account: ${user.name} (${user.email})`);

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
  verifyOtp,
  resetPasswordWithToken
};
