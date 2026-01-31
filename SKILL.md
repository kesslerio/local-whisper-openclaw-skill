---
name: local-whisper
description: LOCAL voice transcription using OpenAI Whisper. 100% private - audio never leaves your machine. Supports 97+ languages.
homepage: https://github.com/kesslerio/local-whisper-openclaw-skill
metadata: {"openclaw":{"emoji":"🎙️","requires":{"bins":["whisper","ffmpeg"]},"install":[{"id":"pip","kind":"pip","package":"openai-whisper","bins":["whisper"],"label":"Install Whisper (pip)"}]}}
---

# 🎙️ Local Whisper Transcription

100% private voice transcription using OpenAI Whisper. Audio never leaves your machine.

## Quick Start

```bash
# Install dependencies
pip install openai-whisper

# Transcribe audio
node transcribe.js voice.ogg
```

## CLI Options

```
--model <tiny|base|small|medium|large>  Model size (default: small)
--language <lang>                        Language code (default: auto)
--output-dir <dir>                       Output directory
--smart-model                           Auto-select model by file size
--check                                 Verify dependencies
```

## Model Sizes

| Model | Size | Speed | RAM |
|-------|------|-------|-----|
| tiny | 39 MB | ⚡⚡⚡⚡ | ~1GB |
| base | 74 MB | ⚡⚡⚡ | ~1GB |
| small | 244 MB | ⚡⚡ | ~2GB |
| medium | 769 MB | ⚡ | ~5GB |
| large | 1550 MB | 🐢 | ~10GB |

## Documentation

- [Installation Guide](docs/INSTALL.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)
- [GitHub Repository](https://github.com/kesslerio/local-whisper-openclaw-skill)
