const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const {
  register,
  login,
  getMe,
  logout,
  changePassword,
  forgotPassword,
  verifyOtp,
  resetPasswordWithToken
} = require('../controllers/authController');
const validate = require('../middlewares/validate');
const { protect } = require('../middlewares/auth');
const { registerSchema, loginSchema } = require('../validators/authValidators');

// Rate limiter for login (50 attempts per 15 mins per IP)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { message: 'Too many login attempts from this IP, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
});

// Dedicated rate limiter for forgot-password:
// 10 requests per 15 minutes per IP address.
// Additional per-account throttle (max 5 in 15 min) is enforced inside the controller.
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Too many password reset requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiter for OTP verification (prevent brute-force of the 6-digit code)
const verifyOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: 'Too many OTP verification attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

router.post('/register', validate(registerSchema), register);
router.post('/login', loginLimiter, validate(loginSchema), login);
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);

// Password Security & Recovery Routes
router.post('/change-password', protect, changePassword);
router.patch('/change-password', protect, changePassword);

// OTP Password Reset flow (rate-limited)
router.post('/forgot-password', forgotPasswordLimiter, forgotPassword);
router.post('/verify-otp',      verifyOtpLimiter,      verifyOtp);
router.post('/reset-with-token',                        resetPasswordWithToken);

module.exports = router;
