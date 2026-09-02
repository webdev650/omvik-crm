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
  resetPassword
} = require('../controllers/authController');
const validate = require('../middlewares/validate');
const { protect } = require('../middlewares/auth');
const { registerSchema, loginSchema } = require('../validators/authValidators');

// Specific Brute-Force Rate Limiter for Login & Password Recovery (100 attempts / 15 minutes window)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { message: 'Too many requests from this IP, please try again later' },
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
router.post('/forgot-password', loginLimiter, forgotPassword);
router.post('/reset-password', loginLimiter, resetPassword);

module.exports = router;
