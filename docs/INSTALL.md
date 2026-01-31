# Installation Guide

## Prerequisites

- Node.js (for the transcribe.js script)
- Python 3 and pip (for Whisper)
- FFmpeg (for audio format support)

## Step 1: Install FFmpeg

FFmpeg is required for audio format support.

**NixOS:**
```bash
# Add to /etc/nixos/configuration.nix:
environment.systemPackages = with pkgs; [ ffmpeg ];

# Apply:
sudo nixos-rebuild switch
```

**macOS:**
```bash
brew install ffmpeg
```

**Ubuntu/Debian:**
```bash
sudo apt install ffmpeg
```

**Arch Linux:**
```bash
sudo pacman -S ffmpeg
```

## Step 2: Install OpenAI Whisper

```bash
# Install Whisper
pip install openai-whisper ffmpeg-python

# Or with GPU support (NVIDIA):
pip install openai-whisper[torch]

# Verify installation
whisper --help
```

## Step 3: Verify Installation

```bash
node transcribe.js --check
```

Expected output:
```
📦 Checking dependencies...

  ffmpeg:   ✅
  whisper:  ✅ (/path/to/whisper)
  python3:  ✅
```

## Model Downloads

Whisper automatically downloads models on first use:

| Model | Size | Download Time |
|-------|------|---------------|
| tiny | 39 MB | ~10s |
| base | 74 MB | ~20s |
| small | 244 MB | ~1m |
| medium | 769 MB | ~3m |
| large | 1550 MB | ~6m |

Models are cached in `~/.cache/whisper/`.

## Environment Variables

```bash
export WHISPER_MODEL=small      # Default model
export WHISPER_LANGUAGE=auto    # Default language
export WHISPER_CMD=/path/to/whisper  # Custom whisper binary path
```

Add these to your shell profile (`.bashrc`, `.zshrc`, etc.) to make them persistent.
