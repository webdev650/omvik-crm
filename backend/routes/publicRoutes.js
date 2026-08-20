const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const { submitPublicLead } = require('../controllers/publicLeadController');
const { verifyApiKey } = require('../middlewares/apiKeyAuth');

// Strict Rate Limiter for Public Website Webhook (30 requests / 1 hour window)
const publicRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  message: { message: 'Too many submissions from this IP address. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

// Specific CORS policy allowing requests from official website domain & local dev
const websiteCors = cors({
  origin: function (origin, callback) {
    if (!origin || origin.includes('omvikrealcon.com') || origin.includes('localhost') || origin.includes('127.0.0.1')) {
      callback(null, true);
    } else {
      callback(null, true); // Permissive for webhook integrations
    }
  },
  methods: ['POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-api-key']
});

router.use(websiteCors);
router.post('/leads', publicRateLimiter, verifyApiKey, submitPublicLead);

module.exports = router;
