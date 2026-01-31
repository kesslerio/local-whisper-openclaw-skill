---
name: whisper
description: LOCAL voice transcription using OpenAI Whisper (no cloud API, full privacy). Supports English, German, and 97+ languages with automatic detection.
homepage: https://github.com/openai/whisper
metadata: {"clawdbot":{"emoji":"🎙️","requires":{"bins":["ffmpeg","whisper","python3"]}}}
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
# Test with a voice message
node ~/.openclaw/skills/whisper/scripts/transcribe_local.js ~/.openclaw/media/inbound/voice.ogg
```

## Usage

### Transcribe Voice Message
```bash
# Auto-detect language (recommended)
node ~/.openclaw/skills/whisper/scripts/transcribe_local.js <audio_file>

# Specify language
node ~/.openclaw/skills/whisper/scripts/transcribe_local.js voice.ogg --language de
node ~/.openclaw/skills/whisper/scripts/transcribe_local.js voice.mp3 --language en
```

### Environment Variables
```bash
WHISPER_MODEL=small      # Model: tiny, base, small, medium, large
WHISPER_LANGUAGE=auto    # Language: auto (default), en, de, es, fr, etc.
```

**Model Sizes:**
| Model | Size | Speed | Accuracy | RAM |
|-------|------|-------|----------|-----|
| tiny | 39 MB | ⚡⚡⚡⚡ | ⭐⭐ | ~1GB |
| base | 74 MB | ⚡⚡⚡ | ⭐⭐⭐ | ~1GB |
| small | 244 MB | ⚡⚡ | ⭐⭐⭐⭐ | ~2GB |
| medium | 769 MB | ⚡ | ⭐⭐⭐⭐⭐ | ~5GB |
| large | 1550 MB | 🐢 | ⭐⭐⭐⭐⭐ | ~10GB |

**Recommendation:** `small` model for balance of speed/accuracy

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
→ Use smaller model: `WHISPER_MODEL=small node transcribe_local.js`

**Slow transcription**
→ Use smaller model: tiny or base

## Installation Check

```bash
# Verify all dependencies
node ~/.openclaw/skills/whisper/scripts/transcribe_local.js
```

Should show:
```
🎙️ Local Whisper Transcription
=====================================

✅ ffmpeg
✅ whisper
✅ python3

All dependencies satisfied!
```

## Files

- **Skill:** `~/.openclaw/skills/whisper/`
- **Script:** `~/.openclaw/skills/whisper/scripts/transcribe_local.js`
- **Media:** `~/.openclaw/media/inbound/`
- **Transcriptions:** Saved alongside audio files

## Quick Start

```bash
# 1. Install dependencies (once)
pip install openai-whisper

# 2. Transcribe a voice message
node ~/.openclaw/skills/whisper/scripts/transcribe_local.js \
  ~/.openclaw/media/inbound/750c9438-6e10-4aa7-9582-1264984d87af.ogg

# 3. Get text output immediately!
```

---

**Status:** ✅ Script Ready | ⏳ Dependencies Required

**Next Step:** Install FFmpeg + Whisper (see Installation section above)

