#!/usr/bin/env node
/**
 * Whisper Voice Transcription (Unified CLI)
 * LOCAL transcription using OpenAI Whisper
 * 
 * Features:
 * - Dependency checking
 * - Smart model selection based on file size
 * - Language selection
 * - Custom output directory
 * 
 * Usage: node transcribe.js <audio_file> [options]
 * 
 * Options:
 *   --model <model>        Model size: tiny, base, small, medium, large
 *   --language <lang>      Language code: auto, en, de, es, fr, etc.
 *   --output-dir <dir>     Output directory for transcriptions
 *   --smart-model          Enable smart model selection (default: true)
 * 
 * Environment Variables:
 *   WHISPER_MODEL=small      Default model
 *   WHISPER_LANGUAGE=auto    Default language
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration defaults
const DEFAULTS = {
  MODEL: process.env.WHISPER_MODEL || 'small',
  LANGUAGE: process.env.WHISPER_LANGUAGE || 'auto',
  SIZE_THRESHOLD_KB: 100  // File size threshold for smart model selection
};

/**
 * Auto-detect whisper binary location
 * No hardcoded user paths - uses environment variables and standard paths
 */
function findWhisperBinary() {
  // Allow explicit override via environment variable
  if (process.env.WHISPER_CMD) {
    return process.env.WHISPER_CMD;
  }
  
  // Use shell builtin 'command -v' for portable detection
  try {
    const cmdResult = execSync('command -v whisper', { encoding: 'utf-8', shell: true, stdio: 'pipe' }).trim();
    if (cmdResult) return cmdResult;
  } catch (e) {
    // Fall through to common paths
  }
  
  // Standard paths only (no user-specific hardcoded paths)
  const commonPaths = [
    '/usr/bin/whisper',
    '/usr/local/bin/whisper',
    `${process.env.HOME}/.local/bin/whisper`,
    `${process.env.HOME}/.nix-profile/bin/whisper`
  ];
  
  for (const binPath of commonPaths) {
    if (fs.existsSync(binPath)) {
      return binPath;
    }
  }
  
  return null;
}

/**
 * Check if dependencies are installed
 */
function checkDependencies() {
  const deps = {
    ffmpeg: false,
    whisper: false,
    python3: false
  };
  
  // Check FFmpeg
  try {
    execSync('ffmpeg -version', { encoding: 'utf-8', stdio: 'pipe' });
    deps.ffmpeg = true;
  } catch (e) {
    deps.ffmpeg = false;
  }
  
  // Check Whisper (using auto-detect)
  try {
    const whisperPath = findWhisperBinary();
    if (whisperPath) {
      execSync(`"${whisperPath}" --help`, { encoding: 'utf-8', stdio: 'pipe' });
      deps.whisper = whisperPath;
    }
  } catch (e) {
    deps.whisper = false;
  }
  
  // Check Python
  try {
    execSync('python3 --version', { encoding: 'utf-8', stdio: 'pipe' });
    deps.python3 = true;
  } catch (e) {
    deps.python3 = false;
  }
  
  return deps;
}

/**
 * Display dependency status
 */
function showDependencies() {
  console.log('\n📦 Checking dependencies...\n');
  
  const deps = checkDependencies();
  const whisperPath = typeof deps.whisper === 'string' ? deps.whisper : (deps.whisper ? 'found' : 'not found');
  
  console.log(`  ffmpeg:   ${deps.ffmpeg ? '✅' : '❌'}`);
  console.log(`  whisper:  ${deps.whisper ? '✅' : '❌'} (${whisperPath})`);
  console.log(`  python3:  ${deps.python3 ? '✅' : '❌'}`);
  
  return deps;
}

/**
 * Install dependencies (show instructions)
 */
function showInstallInstructions() {
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
}

/**
 * Supported audio formats (Whisper CLI accepts these directly)
 * No conversion needed for these formats
 */
const SUPPORTED_FORMATS = ['.wav', '.mp3', '.m4a', '.flac', '.ogg'];

/**
 * Check if audio format is supported by Whisper CLI
 */
function isSupportedFormat(audioPath) {
  const ext = path.extname(audioPath).toLowerCase();
  return SUPPORTED_FORMATS.includes(ext);
}

/**
 * Select model based on file size (smart selection)
 */
function selectModel(filePath, options = {}) {
  // If explicit model is specified, use it
  if (options.model && options.model !== 'auto') {
    return options.model;
  }
  
  // Smart selection based on file size
  const stats = fs.statSync(filePath);
  const sizeKB = stats.size / 1024;
  
  if (sizeKB < DEFAULTS.SIZE_THRESHOLD_KB) {
    console.log(`📏 File size: ${sizeKB.toFixed(1)}KB`);
    console.log(`🧠 Smart model: large (short messages - max accuracy)`);
    return 'large';
  } else {
    console.log(`📏 File size: ${sizeKB.toFixed(1)}KB`);
    console.log(`🧠 Smart model: medium (longer messages - faster)`);
    return 'medium';
  }
}

/**
 * Run Whisper transcription
 */
function transcribeWithWhisper(inputPath, options = {}) {
  const whisperPath = findWhisperBinary();
  if (!whisperPath) {
    throw new Error('Whisper binary not found. Please install: pip install openai-whisper');
  }
  
  // Determine model
  let model;
  if (options.smartModel !== false && !options.model) {
    model = selectModel(inputPath, { model: 'auto' });
  } else {
    model = options.model || DEFAULTS.MODEL;
    console.log(`🧠 Using model: ${model}`);
  }
  
  const language = options.language || DEFAULTS.LANGUAGE;
  const outputDir = options.outputDir || path.dirname(inputPath);
  
  console.log(`🎙️ Transcribing with Whisper...`);
  
  // Build command
  let command = `"${whisperPath}" "${inputPath}"`;
  command += ` --model ${model}`;
  command += ` --language ${language}`;
  command += ` --output_format all`;  // Outputs .txt, .srt, .vtt, .json
  command += ` --output_dir "${outputDir}"`;
  
  try {
    execSync(command, { encoding: 'utf-8', stdio: 'pipe' });
    
    // Read the transcription
    const txtPath = inputPath.replace(/\.[^/.]+$/, '.txt');
    const outputTxtPath = path.join(outputDir, path.basename(txtPath));
    
    const finalTxtPath = fs.existsSync(outputTxtPath) ? outputTxtPath : txtPath;
    
    if (fs.existsSync(finalTxtPath)) {
      const text = fs.readFileSync(finalTxtPath, 'utf-8');
      return { text, txtPath: finalTxtPath, model, language };
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
function transcribe(audioPath, options = {}) {
  console.log(`\n🎙️ Whisper Voice Transcription`);
  console.log('='.repeat(50));
  console.log(`📁 Input: ${audioPath}`);
  console.log(`🌐 Language: ${options.language || DEFAULTS.LANGUAGE}`);
  console.log(`📂 Output: ${options.outputDir || 'same as input'}`);
  
  if (!fs.existsSync(audioPath)) {
    throw new Error(`Audio file not found: ${audioPath}`);
  }
  
  // Validate audio format
  if (!isSupportedFormat(audioPath)) {
    const ext = path.extname(audioPath).toLowerCase() || 'unknown';
    throw new Error(`Unsupported audio format: ${ext}. Supported formats: ${SUPPORTED_FORMATS.join(', ')}`);
  }
  
  // Transcribe directly (Whisper CLI supports MP3, M4A, FLAC, OGG natively)
  const result = transcribeWithWhisper(audioPath, options);
  
  console.log('\n' + '='.repeat(50));
  console.log('📝 Transcription:');
  console.log('-'.repeat(50));
  console.log(result.text);
  console.log('-'.repeat(50));
  console.log(`\n💾 Saved to: ${result.txtPath}`);
  console.log(`🧠 Model used: ${result.model}`);
  console.log('✅ Transcription complete!\n');
  
  return result;
}

/**
 * Parse command line arguments
 */
function parseArgs(args) {
  const options = {
    model: null,
    language: null,
    outputDir: null,
    smartModel: true
  };
  
  let audioPath = null;
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--model':
        options.model = args[++i];
        options.smartModel = false;  // Disable smart model if explicit
        break;
      case '--language':
      case '--lang':
      case '-l':
        options.language = args[++i];
        break;
      case '--output-dir':
      case '--output':
      case '-o':
        options.outputDir = args[++i];
        break;
      case '--smart-model':
        options.smartModel = true;
        break;
      case '--no-smart-model':
        options.smartModel = false;
        break;
      case '--help':
      case '-h':
        showHelp();
        process.exit(0);
        break;
      case '--version':
      case '-v':
        console.log('transcribe.js v1.0.0');
        process.exit(0);
        break;
      case '--check':
      case '-c':
        showDependencies();
        showInstallInstructions();
        process.exit(0);
        break;
      default:
        if (!arg.startsWith('-') && !audioPath) {
          audioPath = arg;
        }
        break;
    }
  }
  
  return { audioPath, options };
}

/**
 * Show help message
 */
function showHelp() {
  console.log(`
🎙️ Whisper Voice Transcription (Unified CLI)
============================================

Transcribe audio files locally using OpenAI Whisper.

USAGE:
  node transcribe.js <audio_file> [OPTIONS]

ARGUMENTS:
  audio_file              Path to audio file (WAV, MP3, M4A, FLAC, OGG)

OPTIONS:
  --model <model>         Model size: tiny, base, small, medium, large
  --language <lang>       Language code: auto (default), en, de, es, fr, etc.
  --output-dir <dir>      Output directory for transcriptions
  --smart-model           Enable smart model selection (default: on)
  --no-smart-model        Disable smart model selection
  --check, -c             Check dependencies and show status
  --help, -h              Show this help message
  --version, -v           Show version

ENVIRONMENT VARIABLES:
  WHISPER_MODEL=small     Default model (tiny, base, small, medium, large)
  WHISPER_LANGUAGE=auto   Default language (auto, en, de, es, etc.)

SMART MODEL SELECTION:
  When enabled (default), automatically selects model based on file size:
  - Files < 100KB: Uses 'large' model (max accuracy)
  - Files >= 100KB: Uses 'medium' model (faster)

EXAMPLES:
  # Auto-detect language with smart model selection
  node transcribe.js voice.ogg

  # German language
  node transcribe.js voice.ogg --language de

  # Specific model
  node transcribe.js voice.ogg --model large

  # Custom output directory
  node transcribe.js voice.ogg --output-dir ~/transcriptions/

  # Disable smart model, use environment default
  node transcribe.js voice.ogg --no-smart-model

  # Check dependencies
  node transcribe.js --check

MODEL SIZES:
  tiny   - 39 MB   - ⚡⚡⚡⚡ Fast, ⭐⭐ Lower accuracy
  base   - 74 MB   - ⚡⚡⚡  Fast, ⭐⭐⭐ Good accuracy
  small  - 244 MB  - ⚡⚡   Medium, ⭐⭐⭐⭐ Better accuracy
  medium - 769 MB  - ⚡    Slow, ⭐⭐⭐⭐⭐ High accuracy
  large  - 1550 MB - 🐢    Slowest, ⭐⭐⭐⭐⭐ Best accuracy
`);
}

// Main entry point
function main() {
  const { audioPath, options } = parseArgs(process.argv.slice(2));
  
  if (!audioPath) {
    showHelp();
    process.exit(1);
  }
  
  // Check dependencies
  const deps = checkDependencies();
  if (!deps.whisper || !deps.ffmpeg) {
    console.log('\n❌ Missing dependencies!');
    showDependencies();
    showInstallInstructions();
    process.exit(1);
  }
  
  try {
    transcribe(audioPath, options);
    process.exit(0);
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

// Export for testing
module.exports = {
  transcribe,
  checkDependencies,
  findWhisperBinary,
  selectModel,
  isSupportedFormat,
  SUPPORTED_FORMATS,
  parseArgs,
  DEFAULTS
};
