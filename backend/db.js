const mongoose = require('mongoose');

let memoryServer = null;

const connectOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
};

async function cleanupLegacyIndexes() {
  try {
    const examCollection = mongoose.connection.collection('exams');
    const indexes = await examCollection.indexes();
    if (indexes.some((index) => index.name === 'examCode_1')) {
      console.log('Dropping legacy examCode_1 index');
      await examCollection.dropIndex('examCode_1');
    }
  } catch (indexErr) {
    console.log('Index cleanup skipped or failed:', indexErr.message);
  }
}

async function connectWithUri(uri) {
  if (mongoose.connection.readyState === 1) {
    return;
  }

  await mongoose.connect(uri, connectOptions);
  console.log(`MongoDB connected (${uri.includes('127.0.0.1') || uri.includes('localhost') ? 'local' : 'remote'})`);
  await cleanupLegacyIndexes();
}

async function connectDB() {
  const configuredUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL;
  const localUri = 'mongodb://127.0.0.1:27017/examdb';

  if (isProduction && !configuredUri) {
    throw new Error('MONGO_URI or MONGODB_URI must be configured in production');
  }

  const candidates = configuredUri
    ? [configuredUri, ...(isProduction ? [] : [localUri])]
    : [localUri];

  for (const uri of candidates) {
    try {
      await connectWithUri(uri);
      return;
    } catch (err) {
      console.warn(`MongoDB connection failed (${uri}):`, err.message);
    }
  }

  if (isProduction || process.env.USE_MEMORY_DB === 'false') {
    throw new Error('Could not connect to MongoDB and in-memory fallback is disabled');
  }

  console.log('Starting in-memory MongoDB (development fallback)...');
  const packageName = 'mongodb-memory-server';
  const { MongoMemoryServer } = require(packageName);
  memoryServer = await MongoMemoryServer.create();
  const memoryUri = memoryServer.getUri('examdb');
  await connectWithUri(memoryUri);
  console.log('Using in-memory MongoDB — data resets when the server stops');
}

async function disconnectDB() {
  await mongoose.disconnect();
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
}

module.exports = { connectDB, disconnectDB };
