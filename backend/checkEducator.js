require('dotenv').config();
const mongoose = require('mongoose');

async function check() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/examdb');
  const db = mongoose.connection.db;
  const educator = await db.collection('users').findOne({ role: 'educator' });
  console.log('Educator:', educator.email);
  process.exit();
}
check();
