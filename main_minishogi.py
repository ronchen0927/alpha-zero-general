"""MiniShogi training script using AlphaZero algorithm.

Usage:
    uv run python main_minishogi.py

For parallel training:
    uv run python main_minishogi.py --parallel
"""

import argparse
import logging

import coloredlogs

from Coach import Coach
from minishogi import MiniShogiGame, ParallelConfig
from minishogi.parallel import ParallelCoach
from minishogi.pytorch import NNetWrapper as nn
from utils import TrainingArgs

log = logging.getLogger(__name__)

coloredlogs.install(level="INFO")

# Training configuration using Pydantic model
args = TrainingArgs(
    numIters=100,
    numEps=100,
    tempThreshold=15,
    updateThreshold=0.55,
    maxlenOfQueue=200000,
    numMCTSSims=50,
    arenaCompare=40,
    cpuct=1.5,
    maxSearchDepth=200,  # Matches game max_moves
    checkpoint="./minishogi_checkpoints/",
    load_model=False,
    load_folder_file=("./minishogi_checkpoints/", "best.pth.tar"),
    numItersForTrainExamplesHistory=20,
)

# Parallel training configuration
parallel_config = ParallelConfig(
    num_workers=8,  # CPU workers for self-play
    games_per_worker=12,  # Games per worker (total = 8 * 12 = 96)
)


def main():
    parser = argparse.ArgumentParser(description="Train MiniShogi with AlphaZero")
    parser.add_argument("--parallel", action="store_true", help="Use parallel self-play")
    parser.add_argument("--load", action="store_true", help="Load existing model")
    parser.add_argument("--iters", type=int, default=100, help="Number of iterations")
    parser.add_argument("--episodes", type=int, default=100, help="Episodes per iteration")
    parser.add_argument("--mcts-sims", type=int, default=50, help="MCTS simulations")
    cli_args = parser.parse_args()

    # Update args from CLI
    args.numIters = cli_args.iters
    args.numEps = cli_args.episodes
    args.numMCTSSims = cli_args.mcts_sims
    args.load_model = cli_args.load

    log.info("Loading MiniShogiGame...")
    game = MiniShogiGame()

    log.info("Loading Neural Network...")
    nnet = nn(game)

    if args.load_model:
        log.info(
            'Loading checkpoint "%s/%s"...',
            args.load_folder_file[0],
            args.load_folder_file[1],
        )
        nnet.load_checkpoint(args.load_folder_file[0], args.load_folder_file[1])
    else:
        log.warning("Not loading a checkpoint!")

    if cli_args.parallel:
        log.info("Loading Parallel Coach (workers=%d)...", parallel_config.num_workers)
        coach = ParallelCoach(game, nnet, args, parallel_config)
    else:
        log.info("Loading Coach...")
        coach = Coach(game, nnet, args)

    if args.load_model:
        log.info("Loading 'trainExamples' from file...")
        coach.loadTrainExamples()

    log.info("Starting the learning process 🎉")
    coach.learn()


if __name__ == "__main__":
    main()
