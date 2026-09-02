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

// Specific Rate Limiter for Login (50 attempts per 15 mins)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { message: 'Too many login attempts from this IP, please try again later' },
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

// New PasswordResetOTP Endpoints
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOtp);
router.post('/reset-with-token', resetPasswordWithToken);

module.exports = router;
