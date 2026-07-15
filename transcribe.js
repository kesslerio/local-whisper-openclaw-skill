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

const { execSync, spawn, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Lockfile to prevent concurrent runs
const LOCKFILE = '/tmp/whisper-transcribe.lock';
let activeChild = null;

// Configuration defaults
const DEFAULTS = {
  MODEL: process.env.WHISPER_MODEL || 'small',
  LANGUAGE: process.env.WHISPER_LANGUAGE || 'auto',
  SIZE_THRESHOLD_KB: 100  // File size threshold for smart model selection
};

/**
 * Lockfile management to prevent concurrent runs
 */
function acquireLock(force = false) {
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      const fd = fs.openSync(LOCKFILE, 'wx');
      try {
        fs.writeSync(fd, process.pid.toString());
      } finally {
        fs.closeSync(fd);
      }
      return;
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }

    let pid;
    try {
      pid = parseInt(fs.readFileSync(LOCKFILE, 'utf-8').trim(), 10);
    } catch (error) {
      continue;
    }

    const isRunning = !isNaN(pid) && isProcessRunning(pid);
    if (isRunning) {
      if (!force) {
        console.error(`\n❌ Error: Another whisper transcribe is already running (PID: ${pid}). Use --force to override.`);
        process.exit(1);
      }

      if (isTranscribeProcess(pid)) {
        try {
          process.kill(pid, 'SIGTERM');
          console.log(`⚠️  Killed existing whisper process (PID: ${pid})`);
        } catch (error) {
          // Process might have exited already.
        }
        // Wait (bounded) for it to actually exit before reclaiming the lock, so the
        // new run can't start writing the same output files as the dying one.
        waitForProcessExit(pid, 2000);
      } else {
        console.log(`⚠️  Existing lock PID ${pid} is not a Whisper process; removing lockfile`);
      }

      try {
        fs.unlinkSync(LOCKFILE);
      } catch (error) {
        // The lock may have been removed by another process.
      }
      continue;
    }

    console.log('⚠️  Removing stale lockfile from dead process');
    try {
      fs.unlinkSync(LOCKFILE);
    } catch (error) {
      // The lock may have been removed by another process.
    }
  }

  throw new Error('Unable to acquire transcription lock after 100 attempts');
}

function releaseLock() {
  try {
    if (fs.existsSync(LOCKFILE)) {
      const lockPid = fs.readFileSync(LOCKFILE, 'utf-8').trim();
      // Only remove if it's our lock
      if (lockPid === process.pid.toString()) {
        fs.unlinkSync(LOCKFILE);
      }
    }
  } catch (e) {
    // Ignore cleanup errors
  }
}

function isProcessRunning(pid) {
  try {
    // Check if process exists by sending signal 0
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return false;
  }
}

function sleepSync(ms) {
  // Synchronous sleep with no child process; acquireLock is sync and --force is rare.
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function waitForProcessExit(pid, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (isProcessRunning(pid) && Date.now() < deadline) {
    sleepSync(50);
  }
}

function isTranscribeProcess(pid) {
  try {
    const cmdline = fs.readFileSync(`/proc/${pid}/cmdline`, 'utf-8');
    return /whisper|transcribe/i.test(cmdline);
  } catch (error) {
    return process.platform !== 'linux';
  }
}

function killActiveChild(signal) {
  if (activeChild) {
    try {
      activeChild.kill(signal);
    } catch (error) {
      // Child might have exited already.
    }
  }
}

function setupLockCleanup() {
  // Clean up lock on normal exit
  process.on('exit', () => {
    killActiveChild('SIGTERM');
    releaseLock();
  });
  
  // Clean up on signals
  ['SIGINT', 'SIGTERM', 'SIGUSR1', 'SIGUSR2'].forEach(signal => {
    process.on(signal, () => {
      killActiveChild(signal === 'SIGINT' ? 'SIGINT' : 'SIGTERM');
      releaseLock();
      process.exit(1);
    });
  });
  
  // Clean up on uncaught exceptions
  process.on('uncaughtException', (err) => {
    console.error('\n❌ Uncaught exception:', err.message);
    killActiveChild('SIGTERM');
    releaseLock();
    process.exit(1);
  });
}

/**
 * Auto-detect whisper binary location
 * No hardcoded user paths - uses environment variables and standard paths
 */
function findWhisperBinary() {
  // Allow explicit override via environment variable
  if (process.env.WHISPER_CMD) {
    return process.env.WHISPER_CMD;
  }
  
  // Use the POSIX shell builtin so no external `which` binary is required.
  try {
    const cmdResult = spawnSync('sh', ['-c', 'command -v whisper'], { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] });
    if (cmdResult.status === 0 && cmdResult.stdout.trim()) {
      return cmdResult.stdout.trim();
    }
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
      const check = spawnSync(whisperPath, ['--help'], { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] });
      if (check.status !== 0) throw new Error('whisper --help failed');
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
  
  // Default to small model (good balance of speed/accuracy)
  const stats = fs.statSync(filePath);
  const sizeKB = stats.size / 1024;
  console.log(`📏 File size: ${sizeKB.toFixed(1)}KB`);
  console.log(`🧠 Model: small (default)`);
  return 'small';
}

/**
 * Run Whisper transcription
 */
async function transcribeWithWhisper(inputPath, options = {}) {
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
  
  const args = [
    inputPath,
    '--model',
    model,
    '--output_format',
    'all',
    '--output_dir',
    outputDir
  ];
  // Only add --language if not "auto" (Whisper auto-detects when flag is omitted)
  if (language && language.toLowerCase() !== 'auto') {
    args.push('--language', language);
  }

  try {
    await new Promise((resolve, reject) => {
      // stdout is 'ignore' (not 'pipe'): whisper streams the full transcript to
      // stdout, which we do NOT read (the result is read from the .txt output file).
      // An undrained stdout pipe would block the child once it fills the OS pipe
      // buffer (~64 KiB) and hang the wrapper forever on long transcriptions.
      const child = spawn(whisperPath, args, { stdio: ['ignore', 'ignore', 'pipe'] });
      activeChild = child;
      let stderr = '';

      child.stderr.on('data', data => {
        stderr += data.toString();
      });
      child.on('error', error => {
        if (activeChild === child) activeChild = null;
        reject(error);
      });
      child.on('close', (code, signal) => {
        if (activeChild === child) activeChild = null;
        if (signal) {
          reject(new Error(`whisper terminated by signal ${signal}`));
        } else if (code !== 0) {
          const err = stderr.trim();
          reject(new Error(err || `whisper exited with status ${code}`));
        } else {
          resolve();
        }
      });
    });
    
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
async function transcribe(audioPath, options = {}) {
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
  const result = await transcribeWithWhisper(audioPath, options);
  
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
    smartModel: true,
    force: false
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
      case '--force':
      case '-f':
        options.force = true;
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
  --force, -f             Force run, kill any existing whisper process
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
async function main() {
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

  acquireLock(options.force);
  setupLockCleanup();
  
  await transcribe(audioPath, options);
  process.exit(0);
}

// Run if called directly
if (require.main === module) {
  main().catch(err => {
    console.error(`\n❌ Error: ${err.message}`);
    releaseLock();
    process.exit(1);
  });
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
  DEFAULTS,
  acquireLock,
  releaseLock,
  isProcessRunning,
  setupLockCleanup,
  LOCKFILE
};
