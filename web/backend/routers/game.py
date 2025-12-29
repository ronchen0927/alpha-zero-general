"""Game API router for MiniShogi."""

from __future__ import annotations

import uuid
from typing import Any

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

from minishogi import MiniShogiGame, Move, PieceType
from minishogi.logic import Board
from minishogi.pytorch import NNetWrapper

router = APIRouter()

# In-memory game sessions (for demo; use Redis in production)
active_games: dict[str, dict[str, Any]] = {}


class NewGameRequest(BaseModel):
    """Request to create a new game."""

    vs_ai: bool = True
    ai_first: bool = False


class NewGameResponse(BaseModel):
    """Response with new game info."""

    game_id: str
    board: list[list[int]]
    current_player: int
    hands: list[dict[str, int]]


class MoveRequest(BaseModel):
    """Request to make a move."""

    from_sq: tuple[int, int] | None = None
    to_sq: tuple[int, int]
    promote: bool = False
    drop_piece: int | None = None  # PieceType value


class GameState(BaseModel):
    """Current game state."""

    board: list[list[int]]
    current_player: int
    hands: list[dict[str, int]]
    valid_moves: list[int]
    game_ended: int
    last_move: dict | None = None


class AIAnalysis(BaseModel):
    """AI analysis of current position."""

    policy: list[float]  # Action probabilities
    value: float  # Position evaluation
    top_moves: list[dict]  # Top 5 moves with probabilities


@router.post("/new", response_model=NewGameResponse)
async def create_game(request: NewGameRequest) -> NewGameResponse:
    """Create a new game session."""
    game_id = str(uuid.uuid4())[:8]
    game = MiniShogiGame()
    board = game.getInitBoard()

    active_games[game_id] = {
        "game": game,
        "board": board,
        "vs_ai": request.vs_ai,
        "ai_first": request.ai_first,
        "moves_history": [],
    }

    return NewGameResponse(
        game_id=game_id,
        board=board.board.tolist(),
        current_player=board.current_player,
        hands=[
            {str(k.value): v for k, v in board.hands[0].items()},
            {str(k.value): v for k, v in board.hands[1].items()},
        ],
    )


@router.get("/{game_id}", response_model=GameState)
async def get_game_state(game_id: str) -> GameState:
    """Get current game state."""
    if game_id not in active_games:
        raise HTTPException(status_code=404, detail="Game not found")

    session = active_games[game_id]
    game: MiniShogiGame = session["game"]
    board: Board = session["board"]

    valids = game.getValidMoves(board, board.current_player)
    valid_indices = [i for i, v in enumerate(valids) if v == 1]
    game_ended = game.getGameEnded(board, board.current_player)

    return GameState(
        board=board.board.tolist(),
        current_player=board.current_player,
        hands=[
            {str(k.value): v for k, v in board.hands[0].items()},
            {str(k.value): v for k, v in board.hands[1].items()},
        ],
        valid_moves=valid_indices,
        game_ended=int(game_ended),
        last_move=session["moves_history"][-1] if session["moves_history"] else None,
    )


@router.post("/{game_id}/move", response_model=GameState)
async def make_move(game_id: str, request: MoveRequest) -> GameState:
    """Make a move in the game."""
    if game_id not in active_games:
        raise HTTPException(status_code=404, detail="Game not found")

    session = active_games[game_id]
    game: MiniShogiGame = session["game"]
    board: Board = session["board"]

    # Create move object
    drop_piece = PieceType(request.drop_piece) if request.drop_piece else None
    move = Move(
        from_sq=request.from_sq,
        to_sq=request.to_sq,
        promote=request.promote,
        drop_piece=drop_piece,
    )

    # Validate move
    action = move.to_action_index()
    valids = game.getValidMoves(board, board.current_player)
    if valids[action] != 1:
        raise HTTPException(status_code=400, detail="Invalid move")

    # Execute move
    new_board, _ = game.getNextState(board, board.current_player, action)
    session["board"] = new_board
    session["moves_history"].append({
        "from_sq": request.from_sq,
        "to_sq": request.to_sq,
        "promote": request.promote,
        "drop_piece": request.drop_piece,
    })

    return await get_game_state(game_id)


@router.get("/{game_id}/analysis", response_model=AIAnalysis)
async def get_ai_analysis(game_id: str) -> AIAnalysis:
    """Get AI analysis of current position."""
    if game_id not in active_games:
        raise HTTPException(status_code=404, detail="Game not found")

    session = active_games[game_id]
    game: MiniShogiGame = session["game"]
    board: Board = session["board"]

    # Get neural network prediction
    # Note: In production, cache the nnet instance
    nnet = NNetWrapper(game)
    pi, v = nnet.predict(board)

    # Get top 5 moves
    valids = game.getValidMoves(board, board.current_player)
    valid_probs = [(i, pi[i]) for i in range(len(pi)) if valids[i] == 1]
    valid_probs.sort(key=lambda x: x[1], reverse=True)
    top_moves = [
        {"action": idx, "probability": float(prob)}
        for idx, prob in valid_probs[:5]
    ]

    return AIAnalysis(
        policy=pi.tolist(),
        value=float(v),
        top_moves=top_moves,
    )


@router.websocket("/ws/{game_id}")
async def websocket_game(websocket: WebSocket, game_id: str):
    """WebSocket endpoint for real-time game updates."""
    await websocket.accept()

    if game_id not in active_games:
        await websocket.close(code=4004, reason="Game not found")
        return

    try:
        while True:
            data = await websocket.receive_json()

            if data.get("type") == "move":
                # Process move
                request = MoveRequest(**data.get("payload", {}))
                try:
                    state = await make_move(game_id, request)
                    await websocket.send_json({
                        "type": "state",
                        "payload": state.model_dump(),
                    })
                except HTTPException as e:
                    await websocket.send_json({
                        "type": "error",
                        "payload": {"detail": e.detail},
                    })

            elif data.get("type") == "get_state":
                state = await get_game_state(game_id)
                await websocket.send_json({
                    "type": "state",
                    "payload": state.model_dump(),
                })

    except WebSocketDisconnect:
        pass
