#!/usr/bin/env node
/**
 * Whisper Voice Transcription Script
 * Transcribes audio files using OpenAI Whisper API
 * 
 * Usage: node transcribe.js <audio_file_path>
 * 
 * Supports: OGG, MP3, WAV, M4A, FLAC
 * Languages: Auto-detect (en, de, +97 others)
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Configuration
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const WHISPER_MODEL = 'whisper-1';

/**
 * Transcribe audio file using OpenAI Whisper API
 */
async function transcribeAudio(audioPath, language = null) {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not set. Please set environment variable.');
  }

  if (!fs.existsSync(audioPath)) {
    throw new Error(`Audio file not found: ${audioPath}`);
  }

  console.log(`🎙️ Transcribing: ${audioPath}`);

  return new Promise((resolve, reject) => {
    // Prepare form data
    const boundary = '----FormBoundary' + Date.now().toString(16);
    const fileName = path.basename(audioPath);
    const fileContent = fs.readFileSync(audioPath);
    
    // Build multipart form data
    const formData = Buffer.concat([
      Buffer.from(`--${boundary}\r\n`),
      Buffer.from(`Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n`),
      Buffer.from(`Content-Type: audio/ogg\r\n\r\n`),
      fileContent,
      Buffer.from(`\r\n--${boundary}\r\n`),
      Buffer.from(`Content-Disposition: form-data; name="model"\r\n\r\n`),
      Buffer.from(`${WHISPER_MODEL}\r\n`),
      Buffer.from(`--${boundary}\r\n`),
      Buffer.from(`Content-Disposition: form-data; name="response_format"\r\n\r\n`),
      Buffer.from(`text\r\n`),
      Buffer.from(`--${boundary}--\r\n`)
    ]);

    // API request options
    const options = {
      hostname: 'api.openai.com',
      path: '/v1/audio/transcriptions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': formData.length
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const result = JSON.parse(data);
            const transcription = result.text;
            console.log(`✅ Transcription complete (${transcription.length} chars)`);
            resolve(transcription);
          } catch (e) {
            reject(new Error(`Failed to parse response: ${e.message}`));
          }
        } else {
          reject(new Error(`API error: ${res.statusCode} - ${data}`));
        }
      });
    });

    req.on('error', (e) => {
      reject(new Error(`Request failed: ${e.message}`));
    });

    req.write(formData);
    req.end();
  });
}

/**
 * Save transcription to file
 */
function saveTranscription(audioPath, text) {
  const txtPath = audioPath.replace(/\.[^/.]+$/, '.txt');
  fs.writeFileSync(txtPath, text);
  return txtPath;
}

// CLI Interface
const audioPath = process.argv[2];

if (!audioPath) {
  console.error('❌ Usage: node transcribe.js <audio_file>');
  console.error('   Example: node transcribe.js /home/art/.clawdbot/media/inbound/voice.ogg');
  process.exit(1);
}

// Run transcription
transcribeAudio(audioPath)
  .then((text) => {
    // Save to file
    const txtPath = saveTranscription(audioPath, text);
    
    // Output result
    console.log(`\n📝 Transcription:`);
    console.log('='.repeat(50));
    console.log(text);
    console.log('='.repeat(50));
    console.log(`\n💾 Saved to: ${txtPath}`);
    
    process.exit(0);
  })
  .catch((error) => {
    console.error(`\n❌ Error: ${error.message}`);
    process.exit(1);
  });
