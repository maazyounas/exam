const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { connectDB } = require('./db');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

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

// Routes — loaded defensively for Vercel bundler compatibility
function safeRequire(name, path) {
  try {
    const mod = require(path);
    if (typeof mod !== 'function') {
      console.error(`Route "${name}" exported ${typeof mod} instead of function — skipping`);
      return null;
    }
    return mod;
  } catch (err) {
    console.error(`Route "${name}" failed to load:`, err.message);
    return null;
  }
}

const routeDefs = [
  { path: '/api/auth',          mod: safeRequire('auth', './routes/auth') },
  { path: '/api/students',      mod: safeRequire('students', './routes/students') },
  { path: '/api/educators',     mod: safeRequire('educators', './routes/educators') },
  { path: '/api/monitoring',    mod: safeRequire('monitoring', './routes/monitoring') },
  { path: '/api/feedback',      mod: safeRequire('feedback', './routes/feedback') },
  { path: '/api/issues',        mod: safeRequire('issues', './routes/issues') },
  { path: '/api/reports',       mod: safeRequire('reports', './routes/reporting') },
  { path: '/api/notifications', mod: safeRequire('notifications', './routes/notifications') },
];

app.use('/api', requireDatabase);
for (const route of routeDefs) {
  if (route.mod) {
    app.use(route.path, route.mod);
  }
}
app.use('/uploads', express.static('uploads'));

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
