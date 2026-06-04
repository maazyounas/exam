const mongoose = require('mongoose');

async function check() {
  await mongoose.connect('mongodb://localhost:27017/examdb');
  const db = mongoose.connection.db;
  const users = await db.collection('users').find({ role: 'student' }).toArray();
  console.log('Students:', users.length);
  process.exit();
}
check();
