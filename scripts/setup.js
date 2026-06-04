#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

function copyIfMissing(src, dest) {
  if (!fs.existsSync(src)) {
    console.warn(`  skip (missing): ${src}`);
    return false;
  }
  if (fs.existsSync(dest)) return false;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  return true;
}

console.log('Exam Management System — setup\n');

// Backend .env
const envExample = path.join(root, 'backend', '.env.example');
const envFile = path.join(root, 'backend', '.env');
if (!fs.existsSync(envFile) && fs.existsSync(envExample)) {
  fs.copyFileSync(envExample, envFile);
  console.log('  ✓ Created backend/.env from .env.example');
} else if (fs.existsSync(envFile)) {
  console.log('  · backend/.env already exists');
} else {
  console.warn('  ! Create backend/.env manually (see backend/.env.example)');
}

// Face-api models for proctoring (after frontend npm install)
const modelDir = path.join(root, 'frontend', 'node_modules', '@vladmandic', 'face-api', 'model');
const publicModels = path.join(root, 'frontend', 'public', 'models');
const faceFiles = [
  'tiny_face_detector_model.bin',
  'tiny_face_detector_model-weights_manifest.json',
];

if (fs.existsSync(modelDir)) {
  fs.mkdirSync(publicModels, { recursive: true });
  let copied = 0;
  for (const file of faceFiles) {
    if (copyIfMissing(path.join(modelDir, file), path.join(publicModels, file))) copied++;
  }
  console.log(copied ? `  ✓ Copied ${copied} face-detector file(s) to frontend/public/models` : '  · Face-detector models already present');
} else {
  console.warn('  ! Run npm install in frontend first, then: npm run setup');
}

console.log('\nDone. Start with:');
console.log('  Terminal 1: npm run dev:backend');
console.log('  Terminal 2: npm run dev:frontend');

