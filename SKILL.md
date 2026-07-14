---
name: local-whisper
description: LOCAL voice transcription using OpenAI Whisper. 100% private - audio never leaves your machine. Supports 97+ languages.
homepage: https://github.com/kesslerio/local-whisper-openclaw-skill
metadata: {"openclaw":{"emoji":"🎙️","requires":{"bins":["whisper","ffmpeg"]},"install":[{"id":"pip","kind":"pip","package":"openai-whisper","bins":["whisper"],"label":"Install Whisper (pip)"}]}}
---

# 🎙️ Local Whisper Transcription

100% private voice transcription using OpenAI Whisper. Audio never leaves your machine.

## Agent Instructions

Use this skill whenever the user asks to transcribe, inspect, summarize, or recover a voice/audio recording and a local file path is available. Prefer this local skill over cloud Whisper unless the user explicitly asks for cloud transcription.

When an inbound audio message has a `media://` reference or OpenClaw metadata, first look for the corresponding local path in the message context, commonly under `/data/.openclaw/media/inbound/` or `~/.openclaw/media/inbound/`. Do not claim that a previous audio message is inaccessible until you have checked the concrete filesystem path if one is present.

If OpenClaw supplied an empty or partial provider transcript, treat that transcript as failed preflight and retry locally:

```bash
node <skill-path>/transcribe.js /path/to/audio.ogg --model small --language auto --output-dir /tmp/openclaw-whisper
```

After running, return only the transcript or a concise note about failure. Do not narrate internal search steps, tool selection, or debugging thoughts unless the user asks for diagnostics.

## Important: OpenClaw Configuration Required

This skill must be configured in OpenClaw's `tools.media.audio` to handle incoming voice messages. Without this config, voice messages may cause token overflow errors or be sent to cloud APIs.

Add to `~/.openclaw/openclaw.json`:

```json5
{
  tools: {
    media: {
      audio: {
        enabled: true,
        timeoutSeconds: 300,
        models: [
          {
            type: "cli",
            command: "node",
            args: [
              "<skill-path>/transcribe.js",
              "{{MediaPath}}",
              "--model",
              "small",
              "--language",
              "auto",
              "--output-dir",
              "{{OutputDir}}"
            ]
          }
        ]
      }
    }
  }
}
```

Replace `<skill-path>` with the actual path to this skill (e.g., `/home/user/skills/local-whisper`).

For this checkout, the source skill path is usually:

```text
/home/art/projects/skills/shared/local-whisper
```

Installed Alphaclaw/OpenClaw agents may also have a copied skill at:

```text
/data/.openclaw/skills/local-whisper
```

Prefer the installed `/data/.openclaw/skills/local-whisper` path in Alphaclaw `openclaw.json`. Prefer the source path when developing or testing the skill itself. Treat `/home/art/.openclaw/skills/local-whisper` as a possible read-only mirror; do not assume it is the active writable install.

## Quick Start

```bash
# Install dependencies
pip install openai-whisper

# Transcribe audio
node transcribe.js voice.ogg

# Transcribe an OpenClaw inbound voice file with stable output discovery
node transcribe.js /data/.openclaw/media/inbound/example.ogg --model small --language auto --output-dir /tmp/openclaw-whisper
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
