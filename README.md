# local-whisper

**Local voice transcription using OpenAI Whisper. 100% private — audio never leaves your machine.**

## Why This Skill?

OpenClaw includes a bundled `openai-whisper-api` skill that sends audio to OpenAI's cloud API. This skill runs Whisper **locally** instead:

| Feature | `openai-whisper-api` (bundled) | `local-whisper` (this skill) |
|---------|-------------------------------|------------------------------|
| **Privacy** | Audio sent to OpenAI | Audio stays local |
| **Cost** | Pay per minute | Free after setup |
| **Speed** | Fast (cloud GPUs) | Depends on your hardware |
| **Offline** | ❌ Requires internet | ✅ Works offline |
| **API Key** | Required | Not needed |
| **Setup** | Just add key | Install Whisper + models |

## When to Use Which

- **Use `openai-whisper-api`** when you need fast transcription and don't mind cloud processing
- **Use `local-whisper`** when privacy matters, you're offline, or you want to avoid API costs

## ⚠️ Critical: OpenClaw Integration

**This skill is NOT automatically used for voice messages.** You must configure OpenClaw's `tools.media.audio` to use it, otherwise:

1. Without any `tools.media.audio` config: OpenClaw may pass raw audio data to the model, causing **token overflow errors** (e.g., "requested: 446497 tokens" for an 18-second voice message)
2. With the bundled `openai-whisper-api`: Audio is sent to OpenAI's cloud API

### Configure OpenClaw to Use This Skill

Add this to your `~/.openclaw/openclaw.json`:

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
              "/path/to/skills/local-whisper/transcribe.js",
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

Replace `/path/to/skills/local-whisper` with the actual path where this skill is installed. In Alphaclaw, that is commonly `/data/.openclaw/skills/local-whisper`; source development usually happens in a workspace skills directory.

The `--output-dir "{{OutputDir}}"` argument is important. It lets OpenClaw read the final `.txt` transcript instead of relying on progress output from the wrapper. The `300` second timeout avoids cutting off local CPU transcription on longer voice messages.

### Fallback Chain (Recommended)

For reliability, you can configure a fallback to cloud transcription if local Whisper fails. Skip this if privacy must be strict.

```json5
{
  tools: {
    media: {
      audio: {
        enabled: true,
        timeoutSeconds: 300,
        models: [
          // Try local first (free, private)
          {
            type: "cli",
            command: "node",
            args: [
              "/path/to/skills/local-whisper/transcribe.js",
              "{{MediaPath}}",
              "--model",
              "small",
              "--language",
              "auto",
              "--output-dir",
              "{{OutputDir}}"
            ]
          },
          // Fallback to OpenAI API if local fails
          { provider: "openai", model: "gpt-4o-mini-transcribe" }
        ]
      }
    }
  }
}
```

## Quick Start

```bash
# Install Whisper (one-time)
pip install openai-whisper

# Transcribe
node transcribe.js audio.ogg

# Transcribe an OpenClaw inbound audio file
node transcribe.js /data/.openclaw/media/inbound/example.ogg --model small --language auto --output-dir /tmp/openclaw-whisper
```

## Agent Behavior

Agents that have this skill should use it for voice recordings whenever a local media path is available. If a provider-generated transcript is empty, partial, or just Whisper metadata, agents should retry the concrete file path locally before asking the user to resend.

Common OpenClaw media locations:

- `/data/.openclaw/media/inbound/`
- `~/.openclaw/media/inbound/`

Agents should not claim that `media://` files are inaccessible when the message context includes a resolved filesystem path.

## Requirements

- Python 3.8+
- `ffmpeg` (for audio conversion)
- ~2GB RAM minimum (more for larger models)

## Documentation

- [SKILL.md](SKILL.md) — Agent-facing skill documentation
- [docs/INSTALL.md](docs/INSTALL.md) — Detailed installation guide
- [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) — Common issues and solutions

## License

MIT
