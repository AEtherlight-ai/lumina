# ÆtherLight - Voice-to-Intelligence Platform

[![npm version](https://img.shields.io/npm/v/aetherlight.svg)](https://www.npmjs.com/package/aetherlight)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Voice-to-intelligence platform for developers. Capture voice, match patterns, prevent AI hallucinations.

## Quick Install

**⭐ Easiest way (no install needed):**
```bash
npx aetherlight@latest
```

**Or install globally:**
```bash
npm install -g aetherlight
aetherlight
```

This installs:
- ✅ **VS Code extension** - Voice capture, pattern matching, AI assistance
- ✅ **Desktop app** - (Windows/Mac) Standalone voice capture application
- ✅ **Cursor support** - Automatic installation if Cursor IDE detected

## What You Get

### VS Code Extension
- 🎤 **Voice Capture** - Press backtick (`) to record voice, auto-transcribe with Whisper
- 🧠 **Pattern Matching** - AI-powered code pattern suggestions
- 📊 **Confidence Scoring** - Know when AI might be hallucinating
- 🔍 **Context Awareness** - File context, project state, error detection
- 🚀 **Quick Send** - Enhanced prompts to Claude Code/Cursor CLI
- 📋 **Sprint Planning** - Create and enhance sprints with AI assistance (v0.16.7+)
- 🐛 **Bug Reports & Features** - Structured forms with AI enhancement (v0.16.7+)
- 🗂️ **Multi-Sprint Management** - Switch between multiple sprint files (v0.16.7+)

### Desktop App (Windows/Mac)
- Global voice capture (works in any application)
- System tray integration
- Offline transcription support
- Pattern library management

## How to Use

### In VS Code

After installation, open VS Code and:

1. **Quick Voice Capture:**
   - Press backtick (`) to start/stop recording
   - Transcription appears at cursor automatically

2. **Pattern Matching:**
   - Type naturally in the editor
   - See pattern suggestions in the sidebar
   - Click to apply proven solutions

3. **AI Enhancement:**
   - Select code or text
   - Run "ÆtherLight: Enhance Selection"
   - Get context-enriched AI responses

### Desktop App

After installation:

**Windows:**
- Find "ÆtherLight" in Start Menu
- System tray icon for quick access
- Global hotkey: `Ctrl+Shift+V` (customizable)

**Mac:**
- Open `/Applications/ÆtherLight.app`
- Menu bar icon for quick access
- Global hotkey: `Cmd+Shift+V` (customizable)

## Update to Latest Version

**⭐ Easiest (if using `npx`):**
```bash
npx aetherlight@latest
```
*No update needed - always fetches latest version automatically!*

**If installed globally:**
```bash
npm update -g aetherlight
```

**Or reinstall:**
```bash
npm uninstall -g aetherlight
npm install -g aetherlight
```

## Features

### Voice Capture
- Fast transcription (<2s for 30s audio)
- Multiple models: Whisper base, small, medium
- Offline support (local Whisper.cpp)
- Auto-punctuation and formatting

### Pattern Matching
- 60+ curated code patterns
- Semantic search with confidence scores
- Context-aware recommendations
- Multi-language support (TypeScript, Rust, Python, etc.)

### AI Integration
- Works with Claude Code, Cursor, GitHub Copilot
- Context enrichment (files, project state, errors)
- Hallucination detection
- Performance metrics (<50ms pattern matching)

## Configuration

### VS Code Settings

Open VS Code settings (`Ctrl+,`) and search for "ÆtherLight":

```json
{
  "aetherlight.voice.hotkey": "`",
  "aetherlight.voice.model": "base.en",
  "aetherlight.patterns.enabled": true,
  "aetherlight.patterns.confidenceThreshold": 0.75
}
```

### Desktop App Settings

Access via system tray/menu bar icon → Settings:
- Hotkey customization
- Model selection
- Privacy settings
- Storage location

## Troubleshooting

### Extension not loading in VS Code
```bash
# Reinstall extension
code --uninstall-extension aetherlight
npm install -g aetherlight
```

### Desktop app not starting (Windows)
- Check if blocked by Windows Defender
- Run as Administrator once
- Check system tray for icon

### Voice capture not working
- Check microphone permissions
- Try different Whisper model (Settings)
- Update to latest version

## Platform Support

| Platform | VS Code Extension | Desktop App | Cursor Support |
|----------|-------------------|-------------|----------------|
| Windows 10/11 | ✅ | ✅ | ✅ |
| macOS 11+ (Intel) | ✅ | ✅ | ✅ |
| macOS 11+ (Apple Silicon) | ✅ | ✅ | ✅ |
| Linux (Ubuntu 20.04+) | ✅ | 🚧 Coming soon | ✅ |

## Uninstall

```bash
# Remove npm package
npm uninstall -g aetherlight

# Remove VS Code extension
code --uninstall-extension aetherlight

# Remove desktop app
# Windows: Control Panel → Programs → ÆtherLight
# Mac: Drag /Applications/ÆtherLight.app to Trash
```

## Documentation

### Extension Architecture
- **[Sprint Planner UI](./docs/SPRINT_PLANNER_UI.md)** - WebView architecture, workflow patterns, component reference

### External Resources
- **User Guide:** https://github.com/AEtherlight-ai/lumina
- **API Documentation:** https://github.com/AEtherlight-ai/lumina/wiki

## Links

- **Documentation:** https://github.com/AEtherlight-ai/lumina
- **Issue Tracker:** https://github.com/AEtherlight-ai/lumina/issues
- **Discord Community:** [Coming soon]
- **Website:** https://aetherlight.dev

## License

MIT License - See [LICENSE](LICENSE) file for details

## Privacy

ÆtherLight is **privacy-first**:
- All voice processing local by default
- Pattern matching runs on your machine
- Optional cloud sync (user controlled)
- Zero telemetry unless explicitly enabled
- GDPR & HIPAA compliant architecture

## Support

- 📖 [Documentation](https://github.com/AEtherlight-ai/lumina)
- 🐛 [Report Issues](https://github.com/AEtherlight-ai/lumina/issues)
- 💬 [Discord Community](https://discord.gg/aetherlight) *(coming soon)*
- 📧 Email: support@aetherlight.dev

---

**Made with ❤️ by the ÆtherLight team**

*Voice-to-intelligence platform for the AI age.*
