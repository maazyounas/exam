#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const modelDir = path.join(__dirname, '..', 'frontend', 'node_modules', '@vladmandic', 'face-api', 'model');
const publicModels = path.join(__dirname, '..', 'frontend', 'public', 'models');
const files = ['tiny_face_detector_model.bin', 'tiny_face_detector_model-weights_manifest.json'];

if (!fs.existsSync(modelDir)) process.exit(0);

fs.mkdirSync(publicModels, { recursive: true });
for (const file of files) {
  const src = path.join(modelDir, file);
  const dest = path.join(publicModels, file);
  if (fs.existsSync(src)) fs.copyFileSync(src, dest);
}
