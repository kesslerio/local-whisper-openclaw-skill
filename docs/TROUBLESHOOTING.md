# Troubleshooting Guide

## Common Issues

### "ffmpeg: command not found"

**Cause:** FFmpeg is not installed or not in PATH.

**Solution:**
```bash
# NixOS: Add to configuration.nix
environment.systemPackages = with pkgs; [ ffmpeg ];

# Then rebuild
sudo nixos-rebuild switch
```

### "whisper: command not found"

**Cause:** Whisper is not installed or not in PATH.

**Solution:**
```bash
pip install openai-whisper

# Verify
whisper --help
```

If still not found, check your Python bin directory is in PATH:
```bash
# Add to your shell profile
export PATH="$HOME/.local/bin:$PATH"
```

### "No module named whisper"

**Cause:** Python package not properly installed.

**Solution:**
```bash
pip install --upgrade openai-whisper ffmpeg-python
```

### "CUDA out of memory"

**Cause:** GPU doesn't have enough VRAM for the selected model.

**Solutions:**
1. Use a smaller model:
   ```bash
   node transcribe.js audio.ogg --model tiny
   ```
2. Set default model in environment:
   ```bash
   export WHISPER_MODEL=base
   ```
3. Use CPU instead of GPU (slower but works on any hardware)

### Slow transcription

**Solutions:**
1. Use a smaller model:
   ```bash
   node transcribe.js audio.ogg --model tiny  # Fastest
   node transcribe.js audio.ogg --model base   # Fast, good accuracy
   ```

2. Enable smart model selection (default):
   ```bash
   node transcribe.js audio.ogg --smart-model
   ```

### "Unsupported audio format"

**Cause:** File format not in supported list.

**Supported formats:** WAV, MP3, M4A, FLAC, OGG

**Solution:** Convert to a supported format:
```bash
ffmpeg -i input.wma output.mp3
```

### Permission denied errors

**Solution:**
```bash
# Make script executable
chmod +x transcribe.js

# Or run with node explicitly
node transcribe.js audio.ogg
```

## Debug Mode

Run with verbose output:
```bash
node transcribe.js audio.ogg --verbose 2>&1 | tee debug.log
```

## Getting Help

1. Check the [GitHub Issues](https://github.com/kesslerio/local-whisper-openclaw-skill/issues)
2. Run `node transcribe.js --check` to verify dependencies
3. Check [OpenAI Whisper documentation](https://github.com/openai/whisper)
