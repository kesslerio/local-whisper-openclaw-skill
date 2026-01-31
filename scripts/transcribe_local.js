#!/usr/bin/env node
/**
 * LOCAL Whisper Voice Transcription
 * Uses OpenAI Whisper installed locally (no cloud API!)
 * 
 * Requirements:
 * - FFmpeg (audio conversion)
 * - OpenAI Whisper (Python package)
 * - Python 3.8+
 * 
 * Usage: node transcribe_local.js <audio_file_path> [--language <lang>]
 * 
 * Languages: en, de, es, fr, +97 more (auto-detect default)
 */

const { execSync, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Configuration
const WHISPER_MODEL = process.env.WHISPER_MODEL || 'small';  // tiny, base, small, medium, large
const LANGUAGE = process.env.WHISPER_LANGUAGE || 'auto';     // auto-detect or specific lang

/**
 * Check if dependencies are installed
 */
function checkDependencies() {
  const deps = [];
  
  // Check FFmpeg
  try {
    execSync('ffmpeg -version', { encoding: 'utf-8', stdio: 'pipe' });
    deps.push('ffmpeg ✅');
  } catch (e) {
    deps.push('ffmpeg ❌');
  }
  
  // Check Whisper
  try {
    execSync('whisper --help', { encoding: 'utf-8', stdio: 'pipe' });
    deps.push('whisper ✅');
  } catch (e) {
    deps.push('whisper ❌');
  }
  
  // Check Python
  try {
    execSync('python3 --version', { encoding: 'utf-8', stdio: 'pipe' });
    deps.push('python3 ✅');
  } catch (e) {
    deps.push('python3 ❌');
  }
  
  return deps;
}

/**
 * Install dependencies (if possible)
 */
function installDependencies() {
  console.log('📦 Checking dependencies...\n');
  
  const deps = checkDependencies();
  console.log(deps.join('\n'));
  console.log('');
  
  const missing = deps.filter(d => d.includes('❌'));
  
  if (missing.length > 0) {
    console.log('❌ Missing dependencies!');
    console.log('\n📋 Installation instructions:\n');
    console.log('1. FFmpeg:');
    console.log('   # NixOS: Add to /etc/nixos/configuration.nix');
    console.log('   environment.systemPackages = with pkgs; [ ffmpeg ];');
    console.log('');
    console.log('   # Or try:');
    console.log('   nix-env -iA nixpkgs.ffmpeg');
    console.log('');
    console.log('2. OpenAI Whisper:');
    console.log('   pip install openai-whisper ffmpeg-python');
    console.log('');
    console.log('   # Or with GPU support:');
    console.log('   pip install openai-whisper[torch]');
    console.log('');
    console.log('3. FFmpeg might already be available on your system.');
    console.log('   Check: which ffmpeg');
    console.log('');
    
    return false;
  }
  
  return true;
}

/**
 * Convert audio to WAV format (Whisper requirement)
 */
function convertToWav(audioPath) {
  console.log('🎵 Converting audio to WAV format...');
  
  const wavPath = audioPath.replace(/\.[^/.]+$/, '.wav');
  
  try {
    // Use ffmpeg to convert
    execSync(`ffmpeg -i "${audioPath}" -ar 16000 -ac 1 -acodec pcm_s16le "${wavPath}" -y`, {
      encoding: 'utf-8',
      stdio: 'pipe'
    });
    
    console.log(`✅ Converted: ${wavPath}`);
    return wavPath;
  } catch (error) {
    throw new Error(`Conversion failed: ${error.message}`);
  }
}

/**
 * Run local Whisper transcription
 */
function transcribeWithWhisper(wavPath, language = 'auto') {
  console.log(`🎙️ Transcribing with Whisper (${WHISPER_MODEL} model)...`);
  
  const outputFormat = 'all';  // Outputs .txt, .srt, .vtt, .json
  
  let command = `whisper "${wavPath}"`;
  command += ` --model ${WHISPER_MODEL}`;
  command += ` --language ${language}`;
  command += ` --output_format ${outputFormat}`;
  command += ` --output_dir ${path.dirname(wavPath)}`;
  
  try {
    execSync(command, { encoding: 'utf-8', stdio: 'pipe' });
    
    // Read the transcription
    const txtPath = wavPath.replace(/\.[^/.]+$/, '.txt');
    
    if (fs.existsSync(txtPath)) {
      const text = fs.readFileSync(txtPath, 'utf-8');
      return text;
    } else {
      throw new Error('Transcription file not found');
    }
  } catch (error) {
    throw new Error(`Whisper transcription failed: ${error.message}`);
  }
}

/**
 * Main transcription function
 */
async function transcribe(audioPath, options = {}) {
  const language = options.language || LANGUAGE;
  
  console.log(`\n🎙️ Local Whisper Transcription`);
  console.log('='.repeat(50));
  console.log(`📁 Input: ${audioPath}`);
  console.log(`🌐 Language: ${language} (auto-detect: ${language === 'auto'})`);
  console.log(`🧠 Model: ${WHISPER_MODEL}`);
  console.log('');
  
  // Check dependencies first
  if (!installDependencies()) {
    console.log('\n❌ Cannot transcribe - missing dependencies');
    console.log('\n💡 Once dependencies are installed, try again!');
    process.exit(1);
  }
  
  try {
    // Convert to WAV if needed
    let inputPath = audioPath;
    const ext = path.extname(audioPath).toLowerCase();
    
    if (ext !== '.wav') {
      inputPath = convertToWav(audioPath);
    }
    
    // Transcribe with Whisper
    const text = transcribeWithWhisper(inputPath, language);
    
    // Save transcription
    const txtPath = inputPath.replace(/\.[^/.]+$/, '.txt');
    
    console.log('\n' + '='.repeat(50));
    console.log('📝 Transcription:');
    console.log('-'.repeat(50));
    console.log(text);
    console.log('-'.repeat(50));
    console.log(`\n💾 Saved to: ${txtPath}`);
    console.log('✅ Transcription complete!\n');
    
    return text;
    
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    process.exit(1);
  }
}

// CLI Interface
const audioPath = process.argv[2];
const langArg = process.argv.indexOf('--language');
const language = langArg > -1 ? process.argv[langArg + 1] : null;

if (!audioPath) {
  console.log(`
🎙️ Local Whisper Voice Transcription
=====================================

Usage: node transcribe_local.js <audio_file> [--language <lang>]

Arguments:
  audio_file         Path to audio file (OGG, MP3, WAV, M4A, FLAC)
  --language <lang>  Language code (default: auto-detect)
                     en = English, de = German, es = Spanish, etc.

Examples:
  node transcribe_local.js message.ogg
  node transcribe_local.js voice.mp3 --language de
  node transcribe_local.js audio.wav --language en

Environment Variables:
  WHISPER_MODEL=small      Model size: tiny, base, small, medium, large
  WHISPER_LANGUAGE=auto    Language: auto, en, de, es, fr, etc.

Prerequisites:
  - FFmpeg: Audio conversion
  - OpenAI Whisper: pip install openai-whisper
  - Python 3.8+: Whisper runtime

For installation instructions, run without arguments.
`);
  process.exit(1);
}

// Run transcription
transcribe(audioPath, { language })
  .then(text => {
    process.exit(0);
  })
  .catch(error => {
    console.error('Failed:', error.message);
    process.exit(1);
  });
