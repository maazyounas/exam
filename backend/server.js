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
const dbPromise = connectDB().then(() => {
  dbConnected = true;
}).catch((err) => {
  console.error('MongoDB connection failed:', err.message);
  if (process.env.NODE_ENV === 'production') {
    console.error('CRITICAL: In production, MongoDB connection is required.');
  }
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/students', require('./routes/students'));
app.use('/api/educators', require('./routes/educators'));
app.use('/api/monitoring', require('./routes/monitoring'));
app.use('/uploads', express.static('uploads'));
app.use('/api/feedback', require('./routes/feedback'));
app.use('/api/issues', require('./routes/issues'));
app.use('/api/reports', require('./routes/reporting'));
app.use('/api/notifications', require('./routes/notifications'));

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