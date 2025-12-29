"""Training monitoring API router."""

from __future__ import annotations

import json
import os
from pathlib import Path

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

# Training log file path
TRAIN_LOG_PATH = Path("./minishogi_checkpoints/training_log.json")


class TrainingStatus(BaseModel):
    """Current training status."""

    is_running: bool = False
    current_iteration: int = 0
    total_iterations: int = 0
    current_phase: str = ""  # "self_play", "training", "arena"
    episodes_completed: int = 0


class TrainingHistory(BaseModel):
    """Training history data."""

    iterations: list[int]
    policy_losses: list[float]
    value_losses: list[float]
    win_rates: list[float]
    timestamps: list[str]


class CheckpointInfo(BaseModel):
    """Information about a model checkpoint."""

    filename: str
    iteration: int
    size_mb: float
    created_at: str


@router.get("/status", response_model=TrainingStatus)
async def get_training_status() -> TrainingStatus:
    """Get current training status."""
    # TODO: Implement actual training status tracking
    return TrainingStatus(
        is_running=False,
        current_iteration=0,
        total_iterations=100,
        current_phase="idle",
        episodes_completed=0,
    )


@router.get("/history", response_model=TrainingHistory)
async def get_training_history() -> TrainingHistory:
    """Get training history for charts."""
    if TRAIN_LOG_PATH.exists():
        with open(TRAIN_LOG_PATH) as f:
            data = json.load(f)
            return TrainingHistory(**data)

    # Return empty history if no log exists
    return TrainingHistory(
        iterations=[],
        policy_losses=[],
        value_losses=[],
        win_rates=[],
        timestamps=[],
    )


@router.get("/checkpoints", response_model=list[CheckpointInfo])
async def list_checkpoints() -> list[CheckpointInfo]:
    """List available model checkpoints."""
    checkpoint_dir = Path("./minishogi_checkpoints")
    if not checkpoint_dir.exists():
        return []

    checkpoints = []
    for f in checkpoint_dir.glob("*.pth.tar"):
        stat = f.stat()
        # Parse iteration from filename (e.g., checkpoint_5.pth.tar)
        iteration = 0
        if f.stem.startswith("checkpoint_"):
            try:
                iteration = int(f.stem.split("_")[1])
            except (IndexError, ValueError):
                pass

        checkpoints.append(CheckpointInfo(
            filename=f.name,
            iteration=iteration,
            size_mb=round(stat.st_size / 1024 / 1024, 2),
            created_at=str(stat.st_mtime),
        ))

    return sorted(checkpoints, key=lambda x: x.iteration, reverse=True)


@router.post("/start")
async def start_training():
    """Start training (placeholder)."""
    # TODO: Implement background training task
    return {"status": "not_implemented", "message": "Use main_minishogi.py for training"}


@router.post("/stop")
async def stop_training():
    """Stop training (placeholder)."""
    return {"status": "not_implemented"}
