"""AI player implementations for MiniShogi web game.

All players follow a unified interface:
    player.play(board, current_player) -> action_index (original coordinates)
"""

from __future__ import annotations

import math
import random
from typing import Any

import numpy as np

from .game import MiniShogiGame
from .logic import Board
from .models import Move


class BaseAIPlayer:
    """Base class for all AI players."""

    def __init__(self, game: MiniShogiGame):
        self.game = game

    def play(self, board: Board, player: int) -> int:
        """Select an action for the given player.

        Args:
            board: Current board state (original coordinates).
            player: Which player to move for (1 or -1).

        Returns:
            Action index in original coordinates.
        """
        raise NotImplementedError


class RandomAI(BaseAIPlayer):
    """Picks a random legal move."""

    def play(self, board: Board, player: int) -> int:
        valids = self.game.getValidMoves(board, player)
        valid_indices = np.where(valids == 1)[0]
        if len(valid_indices) == 0:
            return self.game.getActionSize() - 1  # pass
        return int(np.random.choice(valid_indices))


class GreedyAI(BaseAIPlayer):
    """Picks the move that maximizes immediate material advantage."""

    def play(self, board: Board, player: int) -> int:
        valids = self.game.getValidMoves(board, player)
        valid_indices = np.where(valids == 1)[0]
        if len(valid_indices) == 0:
            return self.game.getActionSize() - 1

        best_action = int(valid_indices[0])
        best_score = float("-inf")

        for action in valid_indices:
            # Execute move directly on a copy (original coords)
            move = Move.from_action_index(int(action))
            next_board = board.copy()
            next_board.current_player = player
            next_board.execute_move(move)
            next_board.current_player = -player

            score = self.game.getScore(next_board, player)
            if score > best_score:
                best_score = score
                best_action = int(action)

        return best_action


def _evaluate(game: MiniShogiGame, board: Board, player: int) -> float:
    """Heuristic evaluation: material score from player's perspective."""
    return game.getScore(board, player)


def _execute_action(game: MiniShogiGame, board: Board, player: int, action: int) -> Board:
    """Execute an action (original coordinates) and return new board."""
    move = Move.from_action_index(action)
    new_board = board.copy()
    new_board.current_player = player
    new_board.execute_move(move)
    new_board.current_player = -player
    return new_board


class MinimaxAI(BaseAIPlayer):
    """Classic Minimax search with depth-limited evaluation."""

    def __init__(self, game: MiniShogiGame, depth: int = 3):
        super().__init__(game)
        self.depth = depth

    def play(self, board: Board, player: int) -> int:
        valids = self.game.getValidMoves(board, player)
        valid_indices = np.where(valids == 1)[0]
        if len(valid_indices) == 0:
            return self.game.getActionSize() - 1

        best_action = int(valid_indices[0])
        best_score = float("-inf")

        for action in valid_indices:
            new_board = _execute_action(self.game, board, player, int(action))
            score = self._minimax(new_board, -player, player, self.depth - 1, False)
            if score > best_score:
                best_score = score
                best_action = int(action)

        return best_action

    def _minimax(
        self, board: Board, current: int, maximizing_player: int, depth: int, is_max: bool
    ) -> float:
        # Check terminal
        ended = self.game.getGameEnded(board, current)
        if ended != 0:
            # Convert to maximizing_player's perspective
            if current == maximizing_player:
                return ended * 1000
            else:
                return -ended * 1000

        if depth == 0:
            return _evaluate(self.game, board, maximizing_player)

        valids = self.game.getValidMoves(board, current)
        valid_indices = np.where(valids == 1)[0]
        if len(valid_indices) == 0:
            return _evaluate(self.game, board, maximizing_player)

        if is_max:
            best = float("-inf")
            for action in valid_indices:
                new_board = _execute_action(self.game, board, current, int(action))
                val = self._minimax(new_board, -current, maximizing_player, depth - 1, False)
                best = max(best, val)
            return best
        else:
            best = float("inf")
            for action in valid_indices:
                new_board = _execute_action(self.game, board, current, int(action))
                val = self._minimax(new_board, -current, maximizing_player, depth - 1, True)
                best = min(best, val)
            return best


class AlphaBetaAI(BaseAIPlayer):
    """Minimax with Alpha-Beta pruning — can search deeper."""

    def __init__(self, game: MiniShogiGame, depth: int = 4):
        super().__init__(game)
        self.depth = depth

    def play(self, board: Board, player: int) -> int:
        valids = self.game.getValidMoves(board, player)
        valid_indices = np.where(valids == 1)[0]
        if len(valid_indices) == 0:
            return self.game.getActionSize() - 1

        best_action = int(valid_indices[0])
        best_score = float("-inf")
        alpha = float("-inf")
        beta = float("inf")

        for action in valid_indices:
            new_board = _execute_action(self.game, board, player, int(action))
            score = self._alphabeta(new_board, -player, player, self.depth - 1, alpha, beta, False)
            if score > best_score:
                best_score = score
                best_action = int(action)
            alpha = max(alpha, best_score)

        return best_action

    def _alphabeta(
        self,
        board: Board,
        current: int,
        maximizing_player: int,
        depth: int,
        alpha: float,
        beta: float,
        is_max: bool,
    ) -> float:
        ended = self.game.getGameEnded(board, current)
        if ended != 0:
            if current == maximizing_player:
                return ended * 1000
            else:
                return -ended * 1000

        if depth == 0:
            return _evaluate(self.game, board, maximizing_player)

        valids = self.game.getValidMoves(board, current)
        valid_indices = np.where(valids == 1)[0]
        if len(valid_indices) == 0:
            return _evaluate(self.game, board, maximizing_player)

        if is_max:
            value = float("-inf")
            for action in valid_indices:
                new_board = _execute_action(self.game, board, current, int(action))
                value = max(
                    value,
                    self._alphabeta(new_board, -current, maximizing_player, depth - 1, alpha, beta, False),
                )
                alpha = max(alpha, value)
                if alpha >= beta:
                    break  # β cutoff
            return value
        else:
            value = float("inf")
            for action in valid_indices:
                new_board = _execute_action(self.game, board, current, int(action))
                value = min(
                    value,
                    self._alphabeta(new_board, -current, maximizing_player, depth - 1, alpha, beta, True),
                )
                beta = min(beta, value)
                if alpha >= beta:
                    break  # α cutoff
            return value


class NegamaxAI(BaseAIPlayer):
    """Negamax with Alpha-Beta pruning — zero-sum simplification."""

    def __init__(self, game: MiniShogiGame, depth: int = 4):
        super().__init__(game)
        self.depth = depth

    def play(self, board: Board, player: int) -> int:
        valids = self.game.getValidMoves(board, player)
        valid_indices = np.where(valids == 1)[0]
        if len(valid_indices) == 0:
            return self.game.getActionSize() - 1

        best_action = int(valid_indices[0])
        best_score = float("-inf")

        for action in valid_indices:
            new_board = _execute_action(self.game, board, player, int(action))
            score = -self._negamax(new_board, -player, self.depth - 1, float("-inf"), float("inf"))
            if score > best_score:
                best_score = score
                best_action = int(action)

        return best_action

    def _negamax(
        self, board: Board, player: int, depth: int, alpha: float, beta: float
    ) -> float:
        ended = self.game.getGameEnded(board, player)
        if ended != 0:
            return ended * 1000

        if depth == 0:
            return _evaluate(self.game, board, player)

        valids = self.game.getValidMoves(board, player)
        valid_indices = np.where(valids == 1)[0]
        if len(valid_indices) == 0:
            return _evaluate(self.game, board, player)

        value = float("-inf")
        for action in valid_indices:
            new_board = _execute_action(self.game, board, player, int(action))
            value = max(value, -self._negamax(new_board, -player, depth - 1, -beta, -alpha))
            alpha = max(alpha, value)
            if alpha >= beta:
                break
        return value


class PureMCTS_AI(BaseAIPlayer):
    """Pure Monte Carlo Tree Search with random rollouts (no neural network)."""

    def __init__(self, game: MiniShogiGame, num_simulations: int = 100):
        super().__init__(game)
        self.num_simulations = num_simulations
        self.c_puct = 1.41  # UCB exploration constant

    def play(self, board: Board, player: int) -> int:
        root = _MCTSNode(board, player)

        for _ in range(self.num_simulations):
            node = root
            # Selection — descend tree via UCB
            while node.is_fully_expanded and node.children:
                node = node.best_child(self.c_puct)

            # Expansion
            if not node.is_terminal(self.game):
                node = node.expand(self.game)

            # Simulation (random rollout)
            result = self._rollout(node.board, node.player)

            # Backpropagation
            while node is not None:
                node.visits += 1
                # result is from player 1's perspective. Convert.
                if node.player == player:
                    node.value += result
                else:
                    node.value -= result
                node = node.parent

        # Pick the most-visited child action
        if not root.children:
            return self.game.getActionSize() - 1

        best = max(root.children, key=lambda c: c.visits)
        return best.action

    def _rollout(self, board: Board, player: int, max_depth: int = 50) -> float:
        """Random playout. Returns +1 if root player wins, -1 if loses, 0 draw."""
        b = board.copy()
        p = player
        for _ in range(max_depth):
            ended = self.game.getGameEnded(b, p)
            if ended != 0:
                return ended * (1 if p == player else -1)
            valids = self.game.getValidMoves(b, p)
            valid_indices = np.where(valids == 1)[0]
            if len(valid_indices) == 0:
                return 0
            action = int(np.random.choice(valid_indices))
            b = _execute_action(self.game, b, p, action)
            p = -p
        # If rollout didn't end, use heuristic
        return _evaluate(self.game, b, player) / 100.0


class _MCTSNode:
    """Node in the MCTS tree."""

    __slots__ = [
        "board", "player", "parent", "action", "children",
        "visits", "value", "untried_actions"
    ]

    def __init__(self, board: Board, player: int, parent: "_MCTSNode | None" = None, action: int = -1):
        self.board = board
        self.player = player
        self.parent = parent
        self.action = action
        self.children: list[_MCTSNode] = []
        self.visits = 0
        self.value = 0.0
        self.untried_actions: list[int] | None = None  # lazy init

    def _ensure_actions(self, game: MiniShogiGame) -> None:
        if self.untried_actions is None:
            valids = game.getValidMoves(self.board, self.player)
            self.untried_actions = list(np.where(valids == 1)[0])
            random.shuffle(self.untried_actions)

    @property
    def is_fully_expanded(self) -> bool:
        return self.untried_actions is not None and len(self.untried_actions) == 0

    def is_terminal(self, game: MiniShogiGame) -> bool:
        return game.getGameEnded(self.board, self.player) != 0

    def expand(self, game: MiniShogiGame) -> "_MCTSNode":
        self._ensure_actions(game)
        assert self.untried_actions and len(self.untried_actions) > 0
        action = self.untried_actions.pop()
        new_board = _execute_action(game, self.board, self.player, action)
        child = _MCTSNode(new_board, -self.player, parent=self, action=action)
        self.children.append(child)
        return child

    def best_child(self, c_puct: float) -> "_MCTSNode":
        return max(
            self.children,
            key=lambda child: (child.value / (child.visits + 1e-8))
            + c_puct * math.sqrt(math.log(self.visits + 1) / (child.visits + 1e-8)),
        )


class AlphaZeroAI(BaseAIPlayer):
    """AlphaZero: MCTS guided by a neural network."""

    def __init__(self, game: MiniShogiGame, model_path: str | None = None, num_sims: int = 50):
        super().__init__(game)
        self.num_sims = num_sims
        self.model_path = model_path
        self._mcts: Any = None
        self._nnet: Any = None

    def _init_mcts(self) -> None:
        """Lazy-init MCTS with neural network."""
        if self._mcts is not None:
            return

        from ..MCTS import MCTS
        from .pytorch import NNetWrapper

        self._nnet = NNetWrapper(self.game)
        if self.model_path:
            self._nnet.load_checkpoint(self.model_path)

        class Args:
            numMCTSSims = self.num_sims
            cpuct = 1.0
            maxSearchDepth = 200

        self._mcts = MCTS(self.game, self._nnet, Args())

    def play(self, board: Board, player: int) -> int:
        self._init_mcts()
        assert self._mcts is not None

        # MCTS works on canonical form
        canonical = self.game.getCanonicalForm(board, player)
        probs = self._mcts.getActionProb(canonical, temp=0)

        # Convert from canonical action space to original
        # For player 1, canonical == original, so just pick the best action
        # For player -1, canonical actions need to be mapped back
        # But since we use getValidMoves with original coords in the router,
        # and MCTS returns canonical probs, we need to pick the best canonical action
        # then map it back to original coords.
        best_action = int(np.argmax(probs))
        return best_action


# ─── Factory ─────────────────────────────────────────────────

_PLAYER_REGISTRY: dict[str, type[BaseAIPlayer]] = {
    "random": RandomAI,
    "greedy": GreedyAI,
    "minimax": MinimaxAI,
    "alphabeta": AlphaBetaAI,
    "negamax": NegamaxAI,
    "mcts": PureMCTS_AI,
    "alphazero": AlphaZeroAI,
}


def create_ai_player(algorithm: str, game: MiniShogiGame) -> BaseAIPlayer:
    """Create an AI player by algorithm name.

    Args:
        algorithm: One of 'random', 'greedy', 'minimax', 'alphabeta', 'negamax', 'mcts', 'alphazero'.
        game: MiniShogiGame instance.

    Returns:
        An AI player instance.
    """
    cls = _PLAYER_REGISTRY.get(algorithm)
    if cls is None:
        raise ValueError(f"Unknown AI algorithm: {algorithm}. Available: {list(_PLAYER_REGISTRY.keys())}")
    return cls(game)
