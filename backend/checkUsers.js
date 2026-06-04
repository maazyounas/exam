require('dotenv').config();
const mongoose = require('mongoose');

async function check() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/examdb');
  const db = mongoose.connection.db;
  const users = await db.collection('users').find({}).toArray();
  console.log('Total users:', users.length);
  const roles = users.map(u => u.role);
  console.log('Roles found:', [...new Set(roles)]);
  process.exit();
}
check();
