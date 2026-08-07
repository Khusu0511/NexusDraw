# ⬡ Nexus Draw

**A real-time multiplayer drawing & guessing game with an AI opponent that "sees" your sketch through a CNN trained from scratch — no API key, no cloud inference, runs entirely in the browser.**

[![Live Demo](https://img.shields.io/badge/demo-play_now-8b5cf6?style=flat-square)](https://nexusdraw.onrender.com)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-339933?style=flat-square&logo=node.js&logoColor=white)](backend/package.json)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=white)](frontend/package.json)
[![TensorFlow.js](https://img.shields.io/badge/TensorFlow.js-4.22-FF6F00?style=flat-square&logo=tensorflow&logoColor=white)](frontend/public/model)
[![Docker](https://img.shields.io/badge/Docker-compose-2496ED?style=flat-square&logo=docker&logoColor=white)](docker-compose.yml)
[![Tests](https://img.shields.io/badge/tests-jest-C21325?style=flat-square&logo=jest&logoColor=white)](backend/tests)

**[🎮 Play the live demo →](https://nexusdraw.onrender.com)**

---

## What is this?

Nexus Draw is a Pictionary-style party game. One player draws a secret word while everyone else — human or AI — races to guess it from the sketch. The twist: the AI opponent isn't calling out to an LLM API. It's a small **convolutional neural network trained from scratch** on Google's [Quick, Draw!](https://quickdraw.withgoogle.com/data) dataset, exported to **TensorFlow.js**, and run **entirely client-side** in every player's browser.

> 📸 Game Interface <img width="1918" height="889" alt="image" src="https://github.com/user-attachments/assets/c052ce85-d15c-45e2-8481-fccec2fc9609" />
> 📸 Waiting Room <img width="958" height="443" alt="image" src="https://github.com/user-attachments/assets/51f0baa0-b844-467c-a6e6-fe2e5721674d" />
> 📸 Live Play <img width="1915" height="870" alt="image" src="https://github.com/user-attachments/assets/252fff0e-f724-4430-8b80-cc84b59b1723" />
<img width="959" height="441" alt="image" src="https://github.com/user-attachments/assets/9d0d6e1b-d762-471b-bb63-82dc7f3ea3ec" />
> 📸 Leaderboard <img width="1918" height="868" alt="image" src="https://github.com/user-attachments/assets/323f01cc-5b6e-48e9-87ce-f87959597ac1" />

## ✨ Features

- 🖌️ **Real-time collaborative canvas** — pen, eraser, fill bucket, 14 colors, 4 brush sizes, undo, clear
- 🤖 **On-device AI opponent** — a 25-category CNN watches the canvas roughly once a second and guesses like a real player, scored the same way
- 🔍 **Live "what does the AI see?" indicator** — the artist gets real-time feedback on what the model currently thinks they're drawing
- 🏠 **Rooms & lobbies** — 6-character invite codes, host controls (kick, promote, restart), 2–16 players per room
- 🎚️ **Configurable rounds** — round count, draw time, and difficulty from single common words up to `photosynthesis`-tier vocabulary
- 🧩 **AI Mode** — restricts the word pool to the 25 shapes/objects the CNN actually knows, so the bot can meaningfully play and even take a turn as the drawer
- 💬 In-round chat with progressive letter-hint reveals
- 🔌 Zero external AI API keys — the only "AI service" is a ~900 KB model file served as a static asset

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, Vite 8, Canvas API |
| **Backend** | Node.js, Express 4, Socket.io 4 |
| **AI Inference** | TensorFlow.js 4.22 (client-side) |
| **ML Training** | Python, TensorFlow/Keras 3, Kaggle |
| **Containerization** | Docker, docker-compose, Nginx |
| **Deployment** | Render (Node + WebSocket) |

## 🧠 How the AI Works

### Training

The CNN is trained in Kaggle using the notebook at `model_training/nexus_draw_cnn.ipynb`. It downloads **50,000 real doodles per category** from the [Quick Draw dataset](https://quickdraw.withgoogle.com/data) (25 categories, 1.25 million drawings total) and trains a compact CNN:

- **Architecture**: Three convolutional blocks (32 → 64 → 128 filters) with batch normalization, ReLU activation, max-pooling, and dropout, followed by global average pooling, a 512-unit dense head with batch norm and dropout, and a 25-class softmax output
- **Augmentation**: Random rotation (±12°), zoom (±15%), translation (±10%), and contrast (±15%)
- **Optimizer**: Adam with cosine decay learning rate schedule
- **Training**: Up to 50 epochs with early stopping (patience=10) and best-model checkpointing

The trained model is exported to TensorFlow.js format using the official `tensorflowjs_converter`, then patched for Keras 2 compatibility so TF.js `loadLayersModel()` can parse it.

### Inference Pipeline

The preprocessing pipeline in `frontend/src/hooks/useAI.js`:

1. **Bounding box detection** — scans the canvas for non-white pixels using min-channel deviation, supporting colored strokes on white backgrounds
2. **Center-of-mass centering** — positions the drawing by its center of mass (matching the Quick Draw dataset convention) inside a padded square
3. **Progressive downsampling** — repeatedly halves the image with smooth interpolation (`imageSmoothingEnabled = true`, quality `high`) from ~840px down to 28×28, preserving thin strokes that would be destroyed by a single large resize
4. **Greyscale inversion** — converts to single-channel using the darkest channel (min of R/G/B), then inverts so strokes are ~1.0 and background is ~0.0, with a light noise floor at 0.05
5. **TF.js inference** — runs the 28×28×1 tensor through the CNN inside `tf.tidy()` to prevent memory leaks

### Bot Guessing

The bot "guesses" by relaying predictions over the network. The backend contains **no ML code** — it only tracks room/game state over Socket.io. The drawer's browser runs inference and emits a `bot-guess` event on the AI's behalf once confidence crosses an adaptive threshold (decaying from 55% → 20% over 30 seconds), and the server scores it exactly like a typed human guess.

## 🗂️ Project Structure

```
NexusDraw/
├── backend/                         ← Express + Socket.io API
│   ├── server.js                      Entry point
│   ├── package.json
│   ├── Dockerfile
│   ├── .env.example
│   ├── src/
│   │   ├── utils.js                   Input sanitisation & settings validation
│   │   └── game/
│   │       ├── constants.js           CNN categories, word pools
│   │       ├── wordPicker.js          Word selection per difficulty/AI mode
│   │       ├── botDrawing.js          Procedural stroke generation for bot turns
│   │       ├── roomManager.js         Room CRUD & player lookup
│   │       ├── gameLoop.js            Rounds, timer, scoring, hint reveals
│   │       └── socketHandlers.js      All Socket.io event handlers
│   └── tests/                         Jest test suite
│       ├── utils.test.js
│       ├── wordPicker.test.js
│       ├── roomManager.test.js
│       └── gameLoop.test.js
├── frontend/                        ← React + Vite
│   ├── index.html
│   ├── vite.config.js                 Dev proxy for Socket.io
│   ├── package.json
│   ├── Dockerfile                     Multi-stage: Vite build → Nginx
│   ├── nginx.conf                     WebSocket proxy config
│   ├── public/
│   │   ├── favicon.svg                App icon
│   │   ├── icons.svg                  UI icon sprite
│   │   └── model/                     Trained CNN (model.json + weight shard)
│   └── src/
│       ├── main.jsx                   React entry point
│       ├── App.jsx                    Global state, screen routing, event dispatch
│       ├── hooks/
│       │   ├── useSocket.js           Socket.io connection & events
│       │   ├── useCanvas.js           Drawing, undo, fill, cursor
│       │   └── useAI.js              TF.js model loading & inference pipeline
│       ├── components/
│       │   ├── HomeScreen.jsx         Name input, create/join tabs
│       │   ├── LobbyScreen.jsx        Player grid, settings, start
│       │   ├── WordSelectScreen.jsx   Word cards or "waiting" animation
│       │   ├── GameScreen.jsx         Canvas + toolbar + sidebar layout
│       │   ├── GameEndScreen.jsx      Podium + leaderboard + confetti
│       │   ├── Canvas.jsx             Canvas element + AI chip
│       │   ├── Toolbar.jsx            Colour palette, brush sizes, tools
│       │   ├── Sidebar.jsx            Player list + chat panel
│       │   ├── RoundResult.jsx        Round end overlay
│       │   ├── PlayerCard.jsx         Lobby player card
│       │   └── Toast.jsx              Toast notifications
│       ├── styles/
│       │   └── index.css              Global styles (semantic class names)
│       └── utils/
│           └── helpers.js             Shared constants & utility functions
├── model_training/
│   └── nexus_draw_cnn.ipynb         ← Train the CNN in Kaggle
├── docker-compose.yml               ← Orchestrates both services
├── README.md
├── LICENSE
└── .gitignore
```

## 🚀 Getting Started

Requires **Node.js ≥ 18**. A trained model is already committed under `frontend/public/model/`, so you can run the game immediately.

### Option 1: Run Locally (Development)

```bash
# Terminal 1 — Backend
cd backend
npm install
npm run dev          # Express + Socket.io on :3001

# Terminal 2 — Frontend
cd frontend
npm install
npm run dev          # Vite dev server on :5173 (proxies /socket.io to :3001)
```

Open **http://localhost:5173** — the Vite dev server proxies WebSocket connections to the backend automatically.

### Option 2: Docker (Production)

```bash
docker-compose up --build
```

Open **http://localhost** — Nginx serves the React build and proxies WebSocket to the backend.

### Option 3: Single-Server Production

```bash
cd frontend && npm install && npm run build    # Build React → frontend/dist/
cd ../backend && npm install
NODE_ENV=production npm start                  # Serves API + frontend/dist/ on :3001
```

Open **http://localhost:3001** — the backend serves the built React app as static files.

## 🧪 Testing

```bash
cd backend
npm test
```

Runs the Jest test suite (44 tests) covering:
- **Utilities** — input sanitisation, settings validation, initials extraction
- **Word picker** — difficulty filtering, AI-mode restriction, no duplicates
- **Room manager** — code generation, CRUD, player/bot lookup, snapshot sanitisation
- **Game loop** — scoring formula, hint generation, guess matching rules

## 🧠 Retraining the Model

The model is trained in **Google Colab / Kaggle** (free GPU) for best results:

### Steps

1. **Open Kaggle** — go to [kaggle.com](https://www.kaggle.com/) and create a new notebook
2. **Set GPU runtime** — click *Settings → Accelerator → GPU → T4 GPU → Save*
3. **Upload the notebook** — upload `model_training/nexus_draw_cnn.ipynb` or paste the training code
4. **Run all cells** — downloads Quick Draw data (~5 min), trains the CNN (~15-25 min), and exports to TF.js format
5. **Download the model** — a `nexusdraw_model.zip` will auto-download containing `model.json` + `group1-shard1of1.bin`
6. **Replace model files** — extract the ZIP and copy both files to `frontend/public/model/`, replacing the existing ones
7. **Patch for compatibility** — if training with Keras 3, the exported `model.json` uses Keras 3 topology format. Run the patching script to convert it to Keras 2 format that TF.js can load:
   ```bash
   python model_training/patch_model_json.py
   ```
8. **Refresh the browser** — hard refresh with `Ctrl+Shift+R` to pick up the new weights

### Training Configuration

| Parameter | Default | Notes |
|-----------|---------|-------|
| Samples per category | 50,000 | More = better accuracy, slower training |
| Categories | 25 | Must match `CNN_CATEGORIES` in `frontend/src/utils/helpers.js` |
| Epochs | 50 | Early stopping at patience=10 |
| Batch size | 256 | Reduce if GPU OOM |
| Validation split | 15% | Stratified |

## 🎮 How to Play

1. **Create a room** — pick round count, draw time, difficulty, and whether to add the AI player
2. **Share the 6-character room code** (or invite link) with friends
3. Each round, the **drawer** picks one of 3 words and sketches it before the timer runs out
4. Everyone else types guesses — or the AI submits its own — while letters are progressively revealed as hints
5. A correct guess scores `60 + (time remaining ÷ draw time) × 240` points, so guessing fast pays off; the drawer earns a flat 60 points for every player who gets it
6. After the configured number of rounds, final standings are shown and you can play again

| Setting | Options |
|---|---|
| Rounds | 2 / 3 / 5 / 7 |
| Draw time | 60s / 80s / 100s / 120s |
| Difficulty | Easy · Mixed · Hard |
| Players per room | 2–16 (default 8) |
| AI Mode | Restricts words to the CNN's 25 known categories |

<details>
<summary>The 25 words the AI can recognize (AI Mode)</summary>

airplane, apple, bicycle, bird, book, butterfly, car, cat, circle, clock, cloud, dog, fish, flower, guitar, house, moon, pizza, shoe, square, star, sun, tree, triangle, umbrella

</details>

## ☁️ Deployment

### Docker (Recommended)

```bash
docker-compose up -d --build
```

This runs the backend on port 3001 and the frontend Nginx on port 80.

### Render / Railway / Fly.io

Since the app has a `backend/` and `frontend/` split, configure two services or use the single-server mode:

| Setting | Value |
|---|---|
| Root directory | `backend` |
| Build command | `cd ../frontend && npm install && npm run build && cd ../backend && npm install` |
| Start command | `NODE_ENV=production node server.js` |

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/Khusu0511/NexusDraw)

Make sure your platform forwards WebSocket upgrade headers so Socket.io can connect.

## 🤝 Contributing

Issues and PRs are welcome. Good first contributions:
- New categories — retrain the notebook with additional Quick Draw categories, then teach the bot to draw the new word by adding a case to `genStrokes()` in `backend/src/game/botDrawing.js`
- Touch support for the canvas
- Additional or localized word lists

## 📜 License

MIT — see [LICENSE](LICENSE).

## 🙏 Acknowledgments

- [Quick, Draw!](https://quickdraw.withgoogle.com/data) dataset by Google Creative Lab, used to train the CNN
- [TensorFlow.js](https://www.tensorflow.org/js) for in-browser inference

## 👤 Author

**Kushagra Gupta ( BTech IT )**

Indian Institute of Information Technology, Allahabad

[GitHub](https://github.com/Khusu0511)
[LinkedIn](https://www.linkedin.com/in/kushagra-gupta-7b49b5302/)
