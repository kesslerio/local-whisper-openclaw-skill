#!/usr/bin/env node
/**
 * Auto-Detect Language + Transcribe with Whisper
 * Uses local Whisper + langdetect venv
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const WHISPER_CMD = '/home/art/.nix-profile/bin/whisper';
const MODEL = 'small';
const VENV_PYTHON = '/home/art/langdetect-venv/bin/python';

/**
 * Detect language using langdetect
 */
function detectLanguage(audioPath) {
  try {
    // Read first 10KB for detection
    const buffer = fs.readFileSync(audioPath);
    const sample = buffer.slice(0, 10000).toString('binary');
    
    const result = execSync(
      `${VENV_PYTHON} -c "
from langdetect import detect, LangDetectException
try:
    print(detect('${sample}'))
except:
    print('unknown')
"`,
      { encoding: 'utf-8', stdio: 'pipe' }
    );
    
    const lang = result.trim();
    console.log(`🌐 Detected language: ${lang}`);
    
    // Map to Whisper format
    const langMap = {
      'en': 'English',
      'de': 'German',
      'es': 'Spanish',
      'fr': 'French',
      'it': 'Italian',
      'pt': 'Portuguese',
      'nl': 'Dutch',
      'pl': 'Polish',
      'ru': 'Russian',
      'ja': 'Japanese',
      'ko': 'Korean',
      'zh': 'Chinese'
    };
    
    return langMap[lang] || 'English';  // Default to English
  } catch (e) {
    console.log('⚠️ Language detection failed, defaulting to English');
    return 'English';
  }
}

/**
 * Transcribe with Whisper
 */
function transcribe(audioPath, language) {
  console.log(`🎙️ Transcribing with Whisper...`);
  console.log(`🌐 Language: ${language}`);
  
  const cmd = `${WHISPER_CMD} "${audioPath}" --model ${MODEL} --language ${language} --output_dir ${path.dirname(audioPath)}`;
  
  try {
    execSync(cmd, { encoding: 'utf-8', stdio: 'pipe' });
    
    const txtPath = audioPath.replace(/\.[^/.]+$/, '.txt');
    
    if (fs.existsSync(txtPath)) {
      const text = fs.readFileSync(txtPath, 'utf-8');
      
      console.log('✅ Transcription complete!');
      console.log('📝 Result:');
      console.log(text);
      console.log(`\n💾 Saved to: ${txtPath}`);
      
      return text;
    }
  } catch (error) {
    throw new Error(`Whisper failed: ${error.message}`);
  }
}

// CLI
const audioPath = process.argv[2];

if (!audioPath) {
  console.log(`
🎙️ Whisper Auto-Detect Transcription
=====================================

Usage: node transcribe_auto.js <audio_file>

Features:
- Auto-detects language (de/en/es/fr/etc.)
- Uses local Whisper (no API key)
- Supports all Whisper formats

Example:
  node transcribe_auto.js voice.ogg

Status: Ready!
`);
  process.exit(1);
}

// Run
const language = detectLanguage(audioPath);
transcribe(audioPath, language);

