# Phase 3 — LLM Integration (Local AI)
> **Status:** ⏳ Pending
> **Depends on:** [Phase 2 — aisd Core](./PHASE_2_AISD_CORE.md) ✅ complete
> **Next Phase:** [Phase 4 — Custom Compositor](./PHASE_4_COMPOSITOR.md)

---

## Goal
FELBIC OS mein local LLM chalana jisse:
- User natural language mein computer se baat kar sake
- Voice se command de sake (microphone)
- AI voice mein jawab de sake (speaker)
- Poora kaam **offline** ho — koi data cloud pe na jaye

---

## LLM Models (Default Choices)

| VRAM | Model | Size | Quality |
|------|-------|------|---------|
| >= 8 GB | Mistral-7B-Instruct Q4_K_M | ~4.1 GB | Best |
| 4–8 GB | Phi-3 Mini 4K Instruct Q4 | ~2.2 GB | Good |
| < 4 GB / CPU only | TinyLlama-1.1B Q4 | ~0.6 GB | Basic |
| Optional | Qwen2.5-Coder-7B | ~4.1 GB | Coding |

**Voice:** whisper.cpp (ASR) + Kokoro TTS (ONNX)

---

## Tasks

### llama.cpp Integration
- [ ] `llama.cpp` library link karna aisd mein
  - Option A: Rust FFI bindings (`llama-cpp-rs` crate)
  - Option B: Subprocess (safer, slight overhead — decide based on testing)
- [ ] Model loader: GGUF file `/usr/share/felbicos/models/` se load karna
- [ ] Inference endpoint aisd IPC mein add karna:
  - Input: `{prompt, context, max_tokens, temperature}`
  - Output: streaming tokens via Unix socket
- [ ] Context manager:
  - Per-session conversation history maintain karna
  - Bounded context (max 8K tokens, evict oldest)
  - Multiple users ke liye separate contexts

### Tool Use (Function Calling)
- [ ] Tool use framework implement karna:
  - LLM decide kare ki kaunsa tool call karna hai
  - Tool results LLM ko wapas feed karna
  - Loop: LLM → Tool → LLM → Response
- [ ] Available tools (Phase 2 se):
  - `fs_search(query)` — file dhundhna
  - `fs_read(path)` — file padhna
  - `process_list()` — running apps
  - `process_launch(app)` — app kholna
  - `audit_query(date_range)` — log check karna
- [ ] Tool ACL: har tool ke liye permission check

### Voice Input (ASR)
- [ ] `whisper.cpp` binary include karna ISO mein
- [ ] Microphone input PipeWire se capture karna
- [ ] Push-to-talk hotkey: `Super + Space` (configurable)
- [ ] Audio → text via whisper.cpp (local, offline)
- [ ] Text → aisd IPC mein forward karna
- [ ] Noise suppression: RNNoise filter

### Voice Output (TTS)
- [ ] Kokoro TTS model (ONNX Runtime) integrate karna
- [ ] aisd response text → speech synthesis
- [ ] PipeWire pe audio output karna
- [ ] Speed control: 0.75x to 1.5x
- [ ] Voice selection: multiple voices available

### Model Management
- [ ] Model download script: `models/model-select.py` update karna
- [ ] Download progress bar (CLI + GUI notification)
- [ ] Model verify karna: SHA256 checksum
- [ ] Model switch karna runtime pe (heavy → light jab battery low ho)
- [ ] `/usr/share/felbicos/models/` directory structure:
  ```
  models/
  ├── mistral-7b-instruct.Q4_K_M.gguf
  ├── phi-3-mini.Q4_K_M.gguf
  ├── tinyllama-1.1b.Q4_K_M.gguf
  ├── kokoro-tts.onnx
  └── whisper-base.bin
  ```

### CLI / UI Integration
- [ ] `felbicos-ai ask "sawal"` — text se poochhna
- [ ] `felbicos-ai voice` — voice mode start karna
- [ ] `felbicos-ai model list` — available models
- [ ] `felbicos-ai model switch mistral` — model change karna
- [ ] Basic GTK4 AI chat window (baad mein Shell mein integrate hoga)

---

## Exit Criteria

| Test | Expected Result |
|------|----------------|
| `felbicos-ai ask "mere home mein kya files hain"` | Correct file list return kare |
| Tool use test | LLM `fs_search` tool call kare aur results use kare |
| Voice input | Microphone se speech → text convert ho |
| Voice output | AI ka jawab speakers se sunai de |
| Offline test | Internet band karo — sab kuch kaam kare |
| First token latency | < 3 seconds on CPU (8B Q4 model) |
| Context persistence | 10-turn conversation ke baad bhi context yaad rahe |
| Model switch | `felbicos-ai model switch` bina crash ke kaam kare |

---

## Next: Phase 4
LLM integration complete → [Phase 4 — Custom Compositor](./PHASE_4_COMPOSITOR.md) shuru karo.
