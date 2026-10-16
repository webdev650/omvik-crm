const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');

// Load env vars
dotenv.config();
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

// === SECURITY: Fail fast on missing JWT_SECRET — never silently fall back to a hardcoded value ===
if (!process.env.JWT_SECRET) {
  throw new Error(
    'FATAL: JWT_SECRET environment variable is not set. ' +
    'Set it in your .env file (local) or Render environment variables (production) before starting the server.'
  );
}

// Connect to database
connectDB();

// Start SLA, Followup, Daily Digest & Visit Reminder Cron Jobs
const { startSlaCron } = require('./jobs/slaSweep');
const { startFollowupCron } = require('./jobs/followupSweep');
const { startDailyDigestCron } = require('./jobs/dailyDigest');
const { startVisitReminderCron } = require('./jobs/visitReminderSweep');
startSlaCron();
startFollowupCron();
startDailyDigestCron();
startVisitReminderCron();

const app = express();

// Enable HTTP response compression
app.use(compression());

// Trust proxy for reverse proxies (Render, Vercel, Heroku) for secure cookies & rate limiting
app.set('trust proxy', 1);

// Whitelisted Origins for CORS
const allowedOrigins = [
  'https://omvik-crm.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
  process.env.FRONTEND_URL,
  process.env.CLIENT_URL
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (
      allowedOrigins.includes(origin) ||
      /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)
    ) {
      return callback(null, true);
    }
    return callback(new Error('Blocked by CORS policy'), false);
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Api-Key', 'x-api-key'],
  credentials: true
}));

// Security HTTP headers
app.use(helmet({
  crossOriginResourcePolicy: false,
}));

// Fast health check endpoints (exempt from auth, DB queries, and rate limiter for keep-alive pings)
app.get('/health', (req, res) => res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() }));
app.get('/api/health', (req, res) => res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() }));

// Data sanitization against NoSQL query injection (strips $ and .)
app.use(mongoSanitize());

// General Rate Limiting (200 requests per 15 minutes window for /api)
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { message: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', generalLimiter);

// Cookie parser
app.use(cookieParser());

// Body parser with 10MB payload limit
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/projects', require('./routes/projectRoutes'));
app.use('/api/teams', require('./routes/teamRoutes'));
app.use('/api/leads', require('./routes/leadRoutes'));
const { opportunitySiteVisitRouter, siteVisitRouter } = require('./routes/siteVisitRoutes');
app.use('/api/opportunities', opportunitySiteVisitRouter);
app.use('/api/opportunities', require('./routes/activityRoutes'));
app.use('/api/opportunities', require('./routes/opportunityRoutes'));
app.use('/api/site-visits', siteVisitRouter);
app.use('/api/followups', require('./routes/followupRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/test', require('./routes/testRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/contact', require('./routes/contactRoutes'));
app.use('/api/properties', require('./routes/propertyRoutes'));
app.use('/api/posts', require('./routes/postRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));
app.use('/api/performance', require('./routes/performanceRoutes'));
app.use('/api/customers', require('./routes/customerRoutes'));
app.use('/api/public', require('./routes/publicRoutes'));
app.use('/api/search', require('./routes/searchRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/admin/lead-batches', require('./routes/leadBatchRoutes'));
app.use('/api/import', require('./routes/importRoutes'));
app.use('/api/import-history', require('./routes/importHistoryRoutes'));
app.use('/api/employees', require('./routes/employeeRoutes'));
app.use('/api/upload', require('./routes/uploadRoutes'));
app.use('/api/daily-reports', require('./routes/dailyReportRoutes'));
app.use('/api/leave', require('./routes/leaveRoutes'));
app.use('/api/bookings', require('./routes/bookingRoutes'));
app.use('/api/visit-reminders', require('./routes/visitReminderRoutes'));
app.use('/api/tasks', require('./routes/taskRoutes'));
app.use('/api/assistant', require('./routes/assistantRoutes'));
app.use('/api/batch-access', require('./routes/batchAccessRoutes'));
app.get('/api/my-accessible-batches', require('./middlewares/auth').protect, require('./controllers/batchAccessController').getMyAccessibleBatches);


// Keep-alive monitor: ping /api/health every 10 minutes to prevent Render free instance sleep
const keepAliveUrl = process.env.RENDER_EXTERNAL_URL || process.env.BACKEND_URL || 'https://omvik-crm-dy3u.onrender.com';
if (keepAliveUrl) {
  const pingUrl = `${keepAliveUrl.replace(/\/$/, '')}/api/health`;
  console.log(`[KeepAlive] Registered ping target: ${pingUrl}`);
  setInterval(() => {
    try {
      const httpModule = pingUrl.startsWith('https') ? require('https') : require('http');
      httpModule.get(pingUrl, (res) => {
        res.resume();
      }).on('error', (err) => {
        console.warn(`[KeepAlive] Ping failed: ${err.message}`);
      });
    } catch (e) {}
  }, 10 * 60 * 1000);
}

app.get('/', (req, res) => {
  res.send('OMVIK API is running...');
});

// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.originalUrl} not found` });
});

// Global error handler (never leaks stack traces or internal DB details in production)
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  const isProd = process.env.NODE_ENV === 'production';
  res.status(status).json({
    message: isProd && status === 500 ? 'An internal server error occurred' : (err.message || 'Internal Server Error')
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(
    `Server running in ${process.env.NODE_ENV} mode on port ${PORT}`
  );
});

module.exports = app;
