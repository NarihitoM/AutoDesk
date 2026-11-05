# AutoDesk

Snip any part of your screen and ask AI about it.

Hold **Alt** and drag a box over anything on your screen: an error message, a chart, a math problem, a page in another language. When you let go, AutoDesk sends that area to the AI model you picked, and the answer streams into a small panel right next to it. You can ask follow-up questions in the same panel.

AutoDesk runs in the Windows system tray and works on top of any app.

## Features

- **Hold and drag to capture.** Hold the capture key (Alt by default), then drag. No extra hotkeys or screenshot tools needed.
- **Your normal shortcuts still work.** Capture starts only when you hold the key on its own, so Alt+Tab and other shortcuts are unaffected.
- **Answers appear next to the selection.** The panel streams the response in Markdown, and you can ask follow-up questions about the same screenshot.
- **Choose your AI provider:**
  - OpenAI
  - Anthropic Claude
  - Google Gemini
  - Ollama, LM Studio, OpenRouter, Groq, or any other OpenAI-compatible server (including models running locally on your PC)
- **Works with multiple monitors and high-DPI displays.** Captures stay sharp on scaled screens.
- **API keys stay on your PC.** They are encrypted with Windows' built-in protection and never leave your computer except in requests to the provider you chose.

## Install

1. Download `AutoDesk Setup x.y.z.exe` from the [Releases](https://github.com/NarihitoM/AutoDesk/releases) page.
2. Run the installer.
   - The installer is not code-signed yet, so Windows SmartScreen may warn you. Click **More info**, then **Run anyway**.
3. AutoDesk starts in the system tray, and the Settings window opens the first time.

## Getting started

1. In **Settings**, pick a provider and paste your API key.
   - To get a key: [OpenAI](https://platform.openai.com/api-keys), [Anthropic](https://console.anthropic.com/settings/keys), [Google AI Studio](https://aistudio.google.com/apikey).
   - To use a free local model instead, install [Ollama](https://ollama.com), run `ollama pull llava`, and choose **Ollama / OpenAI-compatible**. No key is needed.
2. Click **Save**.
3. Hold **Alt**, drag over part of your screen, and let go.

| Action | How |
| --- | --- |
| Capture an area | Hold Alt, then left-click and drag |
| Cancel a capture | Press Esc, right-click, or release Alt before you drag |
| Ask a follow-up | Type in the panel and press Enter (Shift+Enter adds a new line) |
| Stop a reply | Click **Stop** |
| Close the panel | Press Esc or click **Close** |
| Pause capture, Settings, Quit | Right-click the tray icon |

## Settings

| Setting | What it does |
| --- | --- |
| AI provider | Which service answers your captures |
| API key | Your key for that provider. Optional for local servers. |
| Model | Any model from that provider that can read images |
| Base URL | Change this only for a proxy or a self-hosted server |
| Capture key | Alt, Ctrl, or Shift |
| Prompt | The instruction sent with every capture |
| Start with Windows | Launch AutoDesk when you sign in |

Default models:

| Provider | Model | Base URL |
| --- | --- | --- |
| OpenAI | `gpt-5` | `https://api.openai.com/v1` |
| Anthropic | `claude-opus-5-5` | `https://api.anthropic.com` |
| Gemini | `gemini-2.5-flash` | `https://generativelanguage.googleapis.com` |
| OpenAI-compatible | `llava` | `http://localhost:11434/v1` (Ollama) |

## Privacy

- A screenshot is taken only when you finish a drag, and only the area you selected.
- That image and your questions go straight from your PC to the provider you chose. There is no AutoDesk server in between.
- Settings are saved in `%APPDATA%\AutoDesk\settings.json`. API keys in that file are encrypted.

## Development

Requirements: Windows 10 or 11, and Node.js 22.12 or newer.

```bash
npm install
npm run dev        # run the app with hot reload
npm test           # unit tests
npm run typecheck  # TypeScript checks
npm run dist       # build the installer into dist/
```

> If `npm run dev` crashes with `Cannot read properties of undefined (reading 'requestSingleInstanceLock')`, your terminal has `ELECTRON_RUN_AS_NODE` set. Clear it and run again: `Remove-Item Env:ELECTRON_RUN_AS_NODE` in PowerShell, or `unset ELECTRON_RUN_AS_NODE` in bash.

Tech stack: Electron, React, TypeScript, Vite (electron-vite), Zustand, and `uiohook-napi` to detect the capture key globally.

### Releases

CI runs typecheck, tests, and a build on every push to `main` and on every pull request. To publish a new installer, push a version tag:

```bash
git tag v0.2.0
git push origin v0.2.0
```

The Release workflow sets the app version from the tag, builds `AutoDesk Setup 0.2.0.exe`, and attaches it to a new GitHub Release with auto-generated notes.

### How capture works

1. A global keyboard hook watches for the capture key being held on its own for 150 ms. Pressing any other key, or clicking first, cancels it.
2. A transparent overlay window then covers the screen under the cursor. Your drag goes to this overlay, not to the app underneath.
3. On release, the selected area is cropped from a full-resolution capture of that monitor. The overlay is excluded from the capture.
4. The image is sent with your prompt to the provider, and the reply streams into the panel.

### Project structure

```
electron/
  main.ts          app startup, tray, and wiring
  preload.ts       safe API exposed to the windows
  Agent/           providers (OpenAI, Anthropic, Gemini), streaming, chat session
  Ipc/             IPC handlers for capture, AI, and settings
  settings/        settings storage, defaults, and input checking
  tools/           capture key logic, screen capture, windows, tray
src/
  features/
    capture-overlay/   the selection overlay
    response-panel/    the answer panel
    settings/          the settings window
  shared/              types and helpers shared with the electron/ code
  pages/               one thin page per window
resources/icon.png     app and tray icon
```
