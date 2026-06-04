const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { connectDB } = require('./db');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

connectDB().catch((err) => {
  console.error('Fatal: could not connect to MongoDB:', err.message);
  process.exit(1);
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