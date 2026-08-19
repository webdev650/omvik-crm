const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');
const { errorHandler } = require('./middleware/errorMiddleware');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

// Start SLA & Followup Cron Jobs
const { startSlaCron } = require('./jobs/slaSweep');
const { startFollowupCron } = require('./jobs/followupSweep');
startSlaCron();
startFollowupCron();

const app = express();

// Security HTTP headers
app.use(helmet());

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

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Enable CORS with dynamic origins
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://192.168.29.34:3000',
  'https://omvik.vercel.app',
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    // Allow any localhost origin (e.g. 5173, 5174, 3000)
    if (/^http:\/\/localhost:\d+$/.test(origin) || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

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
app.use('/api/upload', require('./routes/uploadRoutes'));

app.get('/health', (req, res) => res.json({ status: 'ok', db: 'omvik-crm' }));

app.get('/', (req, res) => {
  res.send('OMVIK API is running...');
});

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(
    `Server running in ${process.env.NODE_ENV} mode on port ${PORT}`
  );
});
