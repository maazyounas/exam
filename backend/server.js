const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { connectDB } = require('./db');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

function loadRouter(routeModule, routeName) {
  const router = routeModule?.default ?? routeModule?.router ?? routeModule;

  if (!router || typeof router.use !== 'function' || typeof router.handle !== 'function') {
    const shape = routeModule && typeof routeModule === 'object'
      ? Object.keys(routeModule).join(', ') || 'no enumerable keys'
      : typeof routeModule;

    throw new TypeError(
      `Invalid Express router export for ${routeName}. ` +
      `Expected a router, but received ${shape}.`
    );
  }

  return router;
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Initialize DB connection on first request (Vercel-friendly)
let dbConnected = false;
let dbError = null;
const dbPromise = connectDB().then(() => {
  dbConnected = true;
}).catch((err) => {
  dbError = err;
  console.error('MongoDB connection failed:', err.message);
  if (process.env.NODE_ENV === 'production') {
    console.error('CRITICAL: In production, MongoDB connection is required.');
  }
});

const requireDatabase = async (req, res, next) => {
  if (dbConnected) return next();

  await dbPromise;

  if (dbConnected) return next();

  return res.status(503).json({
    message: 'Database connection is not available. Check MONGO_URI or MONGODB_URI in Vercel.',
    ...(process.env.NODE_ENV !== 'production' && dbError && { error: dbError.message }),
  });
};

// Routes — static requires so Vercel bundler can trace dependencies
const authRoutes = require('./routes/auth');
const studentsRoutes = require('./routes/students');
const educatorsRoutes = require('./routes/educators');
const monitoringRoutes = require('./routes/monitoring');
const feedbackRoutes = require('./routes/feedback');
const issuesRoutes = require('./routes/issues');
const reportingRoutes = require('./routes/reporting');
const notificationsRoutes = require('./routes/notifications');

app.use('/api', requireDatabase);

app.use('/api/auth', loadRouter(require('./routes/auth'), './routes/auth'));
app.use('/api/students', loadRouter(require('./routes/students'), './routes/students'));
app.use('/api/educators', loadRouter(require('./routes/educators'), './routes/educators'));
app.use('/api/monitoring', loadRouter(require('./routes/monitoring'), './routes/monitoring'));
app.use('/uploads', express.static('uploads'));

app.use('/api/feedback', loadRouter(require('./routes/feedback'), './routes/feedback'));
app.use('/api/issues', loadRouter(require('./routes/issues'), './routes/issues'));
app.use('/api/reports', loadRouter(require('./routes/reporting'), './routes/reporting'));
app.use('/api/notifications', loadRouter(require('./routes/notifications'), './routes/notifications'));

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Endpoint not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(err.status || 500).json({ 
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

const PORT = process.env.PORT || 5000;

let server;

function startServer() {
  server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(
        `Port ${PORT} is already in use. Another backend is still running.\n` +
          `  Fix: kill $(lsof -t -i:${PORT})   or stop the other terminal running npm run dev`
      );
      process.exit(1);
    }
    throw err;
  });
}

function shutdown(signal) {
  console.log(`${signal} received — closing server`);
  if (server) {
    server.close(() => process.exit(0));
  } else {
    process.exit(0);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

if (require.main === module) {
  startServer();
}

module.exports = app;
