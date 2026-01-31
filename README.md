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

## Quick Start

```bash
# Install Whisper (one-time)
pip install openai-whisper

# Transcribe
node transcribe.js audio.ogg
```

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
