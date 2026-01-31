---
name: local-whisper
description: LOCAL voice transcription using OpenAI Whisper (no cloud API, full privacy). Supports English, German, and 97+ languages with automatic detection.
homepage: https://github.com/openai/whisper
metadata: {"openclaw":{"emoji":"🎙️","requires":{"bins":["whisper","ffmpeg"]},"install":[{"id":"pip","kind":"pip","package":"openai-whisper","bins":["whisper"],"label":"Install Whisper (pip)"}]}}
---

# 🎙️ Whisper Voice Transcription (LOCAL)

**100% Private, 100% Local, No API Keys Required!**

Transcribe WhatsApp voice messages using OpenAI Whisper installed locally on your machine.

## Why Local?

✅ **Privacy** - Audio never leaves your machine  
✅ **No API Costs** - Free after installation  
✅ **No Rate Limits** - Unlimited transcription  
✅ **Fast** - No network latency  
✅ **Offline** - Works without internet  

## Installation

### Step 1: Install FFmpeg
**FFmpeg** converts WhatsApp OGG/Opus audio to WAV format.

```bash
# NixOS (add to /etc/nixos/configuration.nix):
environment.systemPackages = with pkgs; [ ffmpeg ];

# Apply: sudo nixos-rebuild switch

# Or on other systems:
# macOS: brew install ffmpeg
# Ubuntu: sudo apt install ffmpeg
# Arch: sudo pacman -S ffmpeg
```

### Step 2: Install OpenAI Whisper
**Whisper** does the actual transcription.

```bash
# Install Python and pip (if not installed)
# NixOS: python3 usually available

# Install Whisper
pip install openai-whisper ffmpeg-python

# Or with GPU support (if you have NVIDIA):
pip install openai-whisper[torch]

# Verify installation
whisper --help
```

### Step 3: Test It
```bash
# Check dependencies
node ~/.openclaw/skills/whisper/transcribe.js --check

# Test with a voice message
node ~/.openclaw/skills/whisper/transcribe.js ~/.openclaw/media/inbound/voice.ogg
```

## Usage

### Basic Usage
```bash
# Transcribe with auto-detect language and smart model selection
node transcribe.js <audio_file>

# Example:
node transcribe.js voice.ogg
```

### Command Line Options

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--model` | | Model size: tiny, base, small, medium, large | `small` |
| `--language` | `-l` | Language code: auto, en, de, es, fr, etc. | `auto` |
| `--output-dir` | `-o` | Output directory for transcriptions | Same as input |
| `--smart-model` | | Enable smart model selection | Enabled |
| `--no-smart-model` | | Disable smart model selection | - |
| `--check` | `-c` | Check dependencies | - |
| `--help` | `-h` | Show help | - |
| `--version` | `-v` | Show version | - |

### Examples

```bash
# Auto-detect language with smart model selection (recommended)
node transcribe.js voice.ogg

# Specify language
node transcribe.js voice.ogg --language de
node transcribe.js voice.mp3 --language en

# Use specific model
node transcribe.js voice.ogg --model large

# Custom output directory
node transcribe.js voice.ogg --output-dir ~/transcriptions/

# Disable smart model, use environment default
node transcribe.js voice.ogg --no-smart-model

# Check dependencies
node transcribe.js --check
```

### Environment Variables
```bash
WHISPER_MODEL=small      # Default model: tiny, base, small, medium, large
WHISPER_LANGUAGE=auto    # Default language: auto, en, de, es, fr, etc.
```

**Model Sizes:**
| Model | Size | Speed | Accuracy | RAM |
|-------|------|-------|----------|-----|
| tiny | 39 MB | ⚡⚡⚡⚡ | ⭐⭐ | ~1GB |
| base | 74 MB | ⚡⚡⚡ | ⭐⭐⭐ | ~1GB |
| small | 244 MB | ⚡⚡ | ⭐⭐⭐⭐ | ~2GB |
| medium | 769 MB | ⚡ | ⭐⭐⭐⭐⭐ | ~5GB |
| large | 1550 MB | 🐢 | ⭐⭐⭐⭐⭐ | ~10GB |

**Recommendation:** Use smart model selection (default), or `small` model for balance of speed/accuracy

### Smart Model Selection

When enabled (default), the script automatically selects the best model based on file size:
- **Files < 100KB**: Uses `large` model for maximum accuracy (short messages)
- **Files ≥ 100KB**: Uses `medium` model for faster processing (longer messages)

Disable with `--no-smart-model` to use your default or explicitly specified model.

## Supported Formats

**Input:**
- WhatsApp OGG/Opus ✅
- MP3
- WAV
- M4A
- FLAC

**Output:**
- Plain text (.txt)
- Subtitles (.srt, .vtt)
- JSON with timestamps (.json)

## Agent Integration

All agents automatically handle voice messages:
1. Voice message received (OGG format)
2. Downloaded to `~/.openclaw/media/inbound/`
3. Transcribed using local Whisper
4. Text processed by agent
5. Response generated

## Troubleshooting

**"ffmpeg: command not found"**
→ Install FFmpeg (see Step 1 above)

**"whisper: command not found"**
→ Install Whisper: `pip install openai-whisper`

**"No module named whisper"**
→ Python package issue: `pip install --upgrade openai-whisper`

**"CUDA out of memory"**
→ Use smaller model: `WHISPER_MODEL=small node transcribe.js <file>`

**Slow transcription**
→ Use smaller model: tiny or base, or enable smart model selection

## Installation Check

```bash
# Verify all dependencies
node transcribe.js --check
```

Should show:
```
📦 Checking dependencies...

  ffmpeg:   ✅
  whisper:  ✅ (/home/art/.nix-profile/bin/whisper)
  python3:  ✅
```

## Files

- **Skill:** `~/.openclaw/skills/whisper/`
- **Script:** `~/.openclaw/skills/whisper/transcribe.js`
- **Media:** `~/.openclaw/media/inbound/`
- **Transcriptions:** Saved alongside audio files (or to `--output-dir`)

## Quick Start

```bash
# 1. Install dependencies (once)
pip install openai-whisper

# 2. Transcribe a voice message
node ~/.openclaw/skills/whisper/transcribe.js \
  ~/.openclaw/media/inbound/750c9438-6e10-4aa7-9582-1264984d87af.ogg

# 3. Get text output immediately!
```

## Development

### Running Tests
```bash
node tests/transcribe.test.js
```

### Project Structure
```
local-whisper/
├── transcribe.js          # Main unified CLI
├── tests/
│   └── transcribe.test.js # Test suite
└── SKILL.md               # This documentation
```

---

**Status:** ✅ Unified CLI Ready | ⏳ Dependencies Required

**Next Step:** Install FFmpeg + Whisper (see Installation section above)
