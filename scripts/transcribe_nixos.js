#!/usr/bin/env node
/**
 * Local Whisper Transcription (NixOS)
 * Smart model selection:
 * - Large model: Short messages (< 100KB) - max accuracy
 * - Medium model: Longer messages (>= 100KB) - faster
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const WHISPER_CMD = '/home/art/.nix-profile/bin/whisper';
const DEFAULT_LANG = 'de';
const SIZE_THRESHOLD = 100 * 1024; // 100KB

function checkWhisper() {
  try {
    execSync(`${WHISPER_CMD} --help`, { encoding: 'utf-8', stdio: 'pipe' });
    return true;
  } catch (e) {
    return false;
  }
}

function selectModel(filePath) {
  const stats = fs.statSync(filePath);
  const sizeKB = stats.size / 1024;
  
  if (sizeKB < SIZE_THRESHOLD) {
    console.log(`📏 File size: ${sizeKB.toFixed(1)}KB`);
    console.log(`🧠 Using model: large (short messages - max accuracy)\n`);
    return 'large';
  } else {
    console.log(`📏 File size: ${sizeKB.toFixed(1)}KB`);
    console.log(`🧠 Using model: medium (longer messages - faster)\n`);
    return 'medium';
  }
}

function transcribe(audioPath, options = {}) {
  const language = options.language || DEFAULT_LANG;
  
  if (!fs.existsSync(audioPath)) {
    throw new Error(`Audio file not found: ${audioPath}`);
  }
  
  console.log(`🎙️ Local Whisper Transcription`);
  console.log(`====================================`);
  console.log(`📁 File: ${audioPath}`);
  console.log(`🌐 Language: ${language}`);
  
  const model = selectModel(audioPath);
  
  const cmd = `${WHISPER_CMD} "${audioPath}" --model ${model} --language ${language} --output_dir ${path.dirname(audioPath)}`;
  
  try {
    execSync(cmd, { encoding: 'utf-8', stdio: 'pipe' });
    const txtPath = audioPath.replace(/\.[^/.]+$/, '.txt');
    if (fs.existsSync(txtPath)) {
      const text = fs.readFileSync(txtPath, 'utf-8');
      console.log('====================================');
      console.log('📝 Transcription:');
      console.log('-'.repeat(50));
      console.log(text);
      console.log('-'.repeat(50));
      console.log(`💾 Saved to: ${txtPath}`);
      console.log('✅ Complete!\n');
      return text;
    }
  } catch (error) {
    throw new Error(`Whisper failed: ${error.message}`);
  }
}

// CLI
const audioPath = process.argv[2];
const langArg = process.argv.indexOf('--language');
const language = langArg > -1 ? process.argv[langArg + 1] : null;

if (!audioPath) {
  console.log(`
🎙️ Local Whisper Transcription (NixOS)
========================================

Smart model selection:
- Large model: Short messages (< 100KB) - max accuracy
- Medium model: Longer messages (>= 100KB) - faster

Usage: node transcribe_nixos.js <audio_file> [--language <lang>]

Status: ✅ Ready!
`);
  process.exit(1);
}

if (!checkWhisper()) {
  console.error('❌ Whisper not found at:', WHISPER_CMD);
  process.exit(1);
}

transcribe(audioPath, { language });
