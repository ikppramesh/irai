# irai — Offline AI Assistant for Android

**irai** is a fully offline, on-device LLM chat application for Android built with React Native and [llama.rn](https://github.com/mybigday/llama.rn). It runs large language models (LLMs) entirely on your phone — no internet, no cloud, no data leaving your device.

Designed for the **Samsung Galaxy Fold 7** (Snapdragon 8 Elite, 12GB RAM) but works on any modern Android phone.

---

## Features

- **100% Offline** — all inference runs locally via llama.cpp
- **GGUF model support** — load any GGUF model from your device storage
- **Built-in model downloader** — download popular models directly to your phone
- **Streaming responses** — tokens appear in real time as they're generated
- **Token speed display** — see t/s (tokens per second) for each response
- **Stop generation** — cancel mid-response with one tap
- **Model manager** — import, load, unload, and delete models
- **Adjustable parameters** — temperature, top-p, max tokens, context length
- **Custom system prompt** — set your own personality/instructions
- **Dark UI** — deep purple AMOLED-friendly theme
- **Bottom tab navigation** — Chat / Models / Settings

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native 0.75 |
| LLM Runtime | llama.rn (llama.cpp bindings) |
| State Management | Zustand |
| Navigation | React Navigation v6 (bottom tabs) |
| File System | react-native-fs |
| File Picker | react-native-document-picker |
| UI Components | react-native-paper, react-native-gesture-handler |
| Settings Sliders | @react-native-community/slider |

---

## Supported Models

Any GGUF-format model works. Recommended models for mobile:

| Model | Size (4-bit) | Notes |
|---|---|---|
| **Phi-3 Mini 4K Instruct** | ~2.2 GB | Best balance of speed and quality |
| **Llama 3.2 3B Instruct** | ~2.0 GB | Fast, good reasoning |
| **Llama 3.2 1B Instruct** | ~0.7 GB | Fastest, lightweight |
| **Gemma 2 2B Instruct** | ~1.5 GB | Strong instruction following |
| **Qwen 2.5 3B Instruct** | ~2.0 GB | Excellent multilingual |
| **SmolLM2 1.7B Instruct** | ~1.0 GB | Very fast, small footprint |
| **Mistral 7B Instruct** | ~4.1 GB | Highest quality (needs 6GB+ RAM) |

---

## Prerequisites

### Development Machine (macOS)

- **Node.js** v18+ — `brew install node`
- **JDK 17** — `brew install openjdk@17`
- **Android Studio** — [developer.android.com/studio](https://developer.android.com/studio)
  - Android SDK (API 35+)
  - Android NDK 26.1.10909125
  - CMake 3.22+
- **ADB** — included with Android Studio or `brew install android-platform-tools`

### Android Device

- Android 12+ (API 31+)
- arm64-v8a architecture
- 4GB+ RAM recommended (8GB+ for 7B models)
- USB debugging enabled

---

## Project Setup

### 1. Clone the repository

```bash
git clone https://github.com/ikppramesh/irai.git
cd irai
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Add to your `~/.zshrc` or `~/.bashrc`:

```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
```

Then reload: `source ~/.zshrc`

---

## Building & Installing

### Quick install (debug APK — standalone, no server needed)

```bash
# Step 1: Bundle JavaScript into the APK
mkdir -p android/app/src/main/assets
npx react-native bundle \
  --platform android \
  --dev false \
  --entry-file index.js \
  --bundle-output android/app/src/main/assets/index.android.bundle \
  --assets-dest android/app/src/main/res/

# Step 2: Build the APK
cd android && ./gradlew assembleDebug

# Step 3: Install on connected device
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

> APK output: `android/app/build/outputs/apk/debug/app-debug.apk` (~123 MB)

---

## Development Mode

For hot-reload during development:

```bash
# Start Metro bundler
npx react-native start

# In a second terminal
npx react-native run-android
```

---

## Project Structure

```
irai/
├── App.tsx                          # App root (providers + navigation)
├── index.js                         # Entry point
├── src/
│   ├── theme/
│   │   └── index.ts                 # Colors, spacing, typography
│   ├── store/
│   │   └── useAppStore.ts           # Zustand global state
│   ├── utils/
│   │   └── modelUtils.ts            # Model file helpers, prompt builder
│   ├── components/
│   │   ├── MessageBubble.tsx        # Chat bubble (user + AI)
│   │   ├── ChatInput.tsx            # Text input + send/stop buttons
│   │   └── ModelBar.tsx             # Active model status bar
│   ├── screens/
│   │   ├── ChatScreen.tsx           # Main chat interface
│   │   ├── ModelsScreen.tsx         # Model import/download/load/delete
│   │   └── SettingsScreen.tsx       # Parameter sliders + system prompt
│   └── navigation/
│       └── AppNavigator.tsx         # Bottom tab navigator
└── android/
    └── app/src/main/
        ├── java/com/irai/           # Android native code
        └── AndroidManifest.xml
```

---

## How to Use the App

### Getting a model onto your device

**Option A: Download directly in the app (recommended)**
1. Open **irai** → tap **Models** tab
2. Tap the **Download** button
3. Select a model from the list (Phi-3 Mini, Llama 3.2, etc.)
4. The download starts automatically with a progress bar
5. Once complete, tap **Load**

**Option B: Import a local file**
1. Download a `.gguf` file to your phone (via browser or `adb push`)
2. Tap **+ Import** in the Models tab
3. Select the file from your file manager

**Option C: Transfer via ADB**
```bash
adb push ~/Downloads/phi-3-mini-q4.gguf /sdcard/Download/
```
Then import it in the app.

### Start chatting

1. Tap the **Chat** tab
2. The model name appears in the status bar at top
3. Type your message and tap ▲ to send
4. Responses stream in real time
5. Tap ■ to stop generation early

---

## Settings Reference

| Setting | Default | Description |
|---|---|---|
| Temperature | 0.7 | Creativity (0 = deterministic, 2 = very random) |
| Top P | 0.9 | Nucleus sampling cutoff |
| Max Tokens | 512 | Maximum tokens per response |
| Context Length | 2048 | How many tokens of history to keep |
| System Prompt | Built-in | Personality/instructions for the AI |

---

## Performance on Samsung Galaxy Fold 7 (Snapdragon 8 Elite)

| Model | Load Time | Speed |
|---|---|---|
| Llama 3.2 1B Q4_K_M | ~5s | ~35–50 t/s |
| Phi-3 Mini Q4_K_M | ~10s | ~20–35 t/s |
| Llama 3.2 3B Q4_K_M | ~12s | ~18–28 t/s |
| Gemma 2 2B Q4_K_M | ~10s | ~20–30 t/s |
| Mistral 7B Q4_K_M | ~25s | ~8–14 t/s |

---

## Troubleshooting

### "Unable to load script"
Bundle the JS before building:
```bash
npx react-native bundle --platform android --dev false \
  --entry-file index.js \
  --bundle-output android/app/src/main/assets/index.android.bundle \
  --assets-dest android/app/src/main/res/
```

### Model fails to load
- Try a smaller model (Q4_K_M or Q3_K_M variant)
- Restart the app and try again
- Check free RAM: Settings > Device Care > Memory

### Build fails with NDK error
Install NDK via Android Studio: SDK Manager > SDK Tools > NDK (Side by side) > 26.1.10909125

### App not visible in drawer
```bash
adb shell am start -n com.irai/.MainActivity
```

---

## Permissions

| Permission | Reason |
|---|---|
| `READ_EXTERNAL_STORAGE` | Import GGUF model files |
| `WRITE_EXTERNAL_STORAGE` | Save downloaded/imported models |
| `INTERNET` | Download models from Hugging Face |

---

## Architecture

```
User Input
    │
    ▼
ChatScreen.tsx
    │
    ├── buildPrompt() ── Converts message history to ChatML format
    │
    ▼
llamaContext.completion()   ← llama.rn (llama.cpp native)
    │
    ├── Token callback (streaming) → updateLastAssistantMessage()
    │
    ▼
Zustand Store → React → FlatList → MessageBubble
```

**Prompt format:** ChatML
```
<|im_start|>system
You are irai...<|im_end|>
<|im_start|>user
Hello<|im_end|>
<|im_start|>assistant
```

---

## Acknowledgments

- [llama.rn](https://github.com/mybigday/llama.rn) — React Native bindings for llama.cpp
- [llama.cpp](https://github.com/ggerganov/llama.cpp) — C++ LLM inference engine
- [PocketPal AI](https://github.com/a-ghorbani/pocketpal-ai) — UX inspiration
- [Hugging Face](https://huggingface.co) — Model repository

---

## License

MIT License

---

*Built with React Native · Powered by llama.cpp · Runs 100% on-device*
