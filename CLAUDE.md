# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Python (using `uv`)

```bash
# Run tests for MiniShogi
uv run pytest tests/test_minishogi*.py -v

# Run a single test
uv run pytest tests/test_minishogi.py::TestClassName::test_method -v

# Run all game regression tests
uv run python -m pytest test_all_games.py

# Lint
uv run ruff check minishogi/

# Type check
uv run mypy minishogi/ --ignore-missing-imports

# Train MiniShogi (parallel recommended)
uv run python main_minishogi.py --parallel --iters 100

# Resume training from checkpoint
uv run python main_minishogi.py --load

# CLI pit (human vs AI)
uv run python pit_minishogi.py --mode ai --model ./minishogi_checkpoints/best.pth.tar
```

### Web Server

```bash
# Backend (FastAPI, port 8000)
uv run uvicorn web.backend.main:app --reload --port 8000

# Frontend (Vite dev server, port 5173)
cd web/frontend && npm run dev

# Frontend lint
cd web/frontend && npm run lint
```

## Architecture

### Core Framework (inherited from alpha-zero-general)

The repo implements AlphaZero self-play RL. Every game plugs into a common interface:

- **`Game.py`** — abstract base class defining the game interface (`getInitBoard`, `getNextState`, `getValidMoves`, `getGameEnded`, `getCanonicalForm`, `getSymmetries`, `stringRepresentation`)
- **`NeuralNet.py`** — abstract base class for neural networks (`train`, `predict`, `save_checkpoint`, `load_checkpoint`)
- **`MCTS.py`** — Monte Carlo Tree Search, uses `game` + `nnet`
- **`Coach.py`** — self-play training loop (self-play → train → arena → accept/reject)
- **`Arena.py`** — pits two players against each other to evaluate new models
- **`main.py`** — entry point for Othello training (configure game/framework here)
- **`pit.py`** — entry point for human-vs-AI play

### MiniShogi Module (`minishogi/`)

The active development focus. A 5×5 Shogi implementation:

- **`models.py`** — `Move`, `PieceType`, `GameConfig`, `NNetConfig`, `ParallelConfig` (Pydantic models)
- **`logic.py`** — `Board` class: all game rules, piece movement, check detection, repetition detection
- **`game.py`** — `MiniShogiGame(Game)`: framework adapter; action space = 1376 (1250 move + 125 drop + 1 pass)
- **`players.py`** — `RandomPlayer`, `HumanMiniShogiPlayer`, `GreedyMiniShogiPlayer`
- **`parallel.py`** — multi-process self-play workers
- **`pytorch/model.py`** — CNN architecture
- **`pytorch/nnet.py`** — `NNetWrapper(NeuralNet)`: training/inference wrapper
- **`ai_players.py`** — factory `create_ai_player(algorithm, game)` dispatches to random/greedy/MCTS/neural-net players

Board coordinates: row 0 = top (white back rank), row 4 = bottom (black back rank). Player 1 = black (sente), player -1 = white (gote). `getCanonicalForm` flips the board for white's perspective.

### Web Interface (`web/`)

- **`web/backend/`** — FastAPI app serving the MiniShogi game via REST + WebSocket
  - `routers/game.py` — game sessions held in-memory dict `active_games`; endpoints: `POST /api/game/new`, `GET /api/game/{id}`, `POST /api/game/{id}/move`, `POST /api/game/{id}/resign`, `POST /api/game/{id}/ai-step`, WebSocket `/api/game/ws/{id}`
  - `routers/train.py` — reads `./minishogi_checkpoints/training_log.json` for metrics; training start/stop are stubs
  - `routers/records.py` — game record storage/retrieval
- **`web/frontend/`** — React 19 + TypeScript + Vite app
  - Three pages: `GamePage` (play), `DashboardPage` (training monitor), `ReplayPage` (game history)
  - Components: `Board`, `ShogiPiece`, `Hand`, `MoveHistory`, `Analysis`

### Other Games

Directories `othello/`, `tictactoe/`, `connect4/`, `gobang/`, `tafl/`, `dotsandboxes/`, `rts/`, `santorini/` each follow the same `<Game>Game.py` + `<framework>/NNet.py` pattern. Each has its own `main*.py` and `pit*.py` entry points.

## Key Conventions

- **Player encoding**: always `1` for the current-perspective player, `-1` for opponent. `getCanonicalForm` must normalize the board so the "current player" is always player `1` from the network's perspective.
- **Checkpoints**: saved as `.pth.tar` files under `./minishogi_checkpoints/` (or `./temp/` for generic games). `best.pth.tar` is the accepted model; `checkpoint_N.pth.tar` are iteration snapshots.
- **Training examples**: pickled as `checkpoint_N.pth.tar.examples` alongside checkpoints.
- **`dotdict`** from `utils.py` is used for config args throughout.
