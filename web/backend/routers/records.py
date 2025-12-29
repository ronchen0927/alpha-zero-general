"""Game records API router."""

from __future__ import annotations

import json
import uuid
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

# Records storage path
RECORDS_DIR = Path("./minishogi_records")
RECORDS_DIR.mkdir(exist_ok=True)


class GameRecord(BaseModel):
    """A saved game record."""

    id: str
    created_at: str
    player1: str  # "human" or "ai"
    player2: str
    winner: int  # 1, -1, or 0 (draw)
    moves: list[dict]
    final_board: list[list[int]]


class RecordSummary(BaseModel):
    """Summary of a game record."""

    id: str
    created_at: str
    player1: str
    player2: str
    winner: int
    move_count: int


@router.get("/", response_model=list[RecordSummary])
async def list_records(limit: int = 20, offset: int = 0) -> list[RecordSummary]:
    """List saved game records."""
    records = []
    files = sorted(RECORDS_DIR.glob("*.json"), key=lambda x: x.stat().st_mtime, reverse=True)

    for f in files[offset : offset + limit]:
        with open(f) as fp:
            data = json.load(fp)
            records.append(RecordSummary(
                id=data["id"],
                created_at=data["created_at"],
                player1=data["player1"],
                player2=data["player2"],
                winner=data["winner"],
                move_count=len(data["moves"]),
            ))

    return records


@router.get("/{record_id}", response_model=GameRecord)
async def get_record(record_id: str) -> GameRecord:
    """Get a specific game record."""
    record_path = RECORDS_DIR / f"{record_id}.json"
    if not record_path.exists():
        raise HTTPException(status_code=404, detail="Record not found")

    with open(record_path) as f:
        data = json.load(f)
        return GameRecord(**data)


@router.post("/", response_model=RecordSummary)
async def save_record(record: GameRecord) -> RecordSummary:
    """Save a new game record."""
    if not record.id:
        record.id = str(uuid.uuid4())[:8]

    record.created_at = datetime.now().isoformat()

    record_path = RECORDS_DIR / f"{record.id}.json"
    with open(record_path, "w") as f:
        json.dump(record.model_dump(), f, indent=2)

    return RecordSummary(
        id=record.id,
        created_at=record.created_at,
        player1=record.player1,
        player2=record.player2,
        winner=record.winner,
        move_count=len(record.moves),
    )


@router.delete("/{record_id}")
async def delete_record(record_id: str):
    """Delete a game record."""
    record_path = RECORDS_DIR / f"{record_id}.json"
    if not record_path.exists():
        raise HTTPException(status_code=404, detail="Record not found")

    record_path.unlink()
    return {"status": "deleted", "id": record_id}


@router.get("/{record_id}/share")
async def get_share_link(record_id: str):
    """Generate a share link for a game record."""
    record_path = RECORDS_DIR / f"{record_id}.json"
    if not record_path.exists():
        raise HTTPException(status_code=404, detail="Record not found")

    # In production, generate a short URL or embed code
    return {
        "record_id": record_id,
        "share_url": f"/replay/{record_id}",
        "embed_code": f'<iframe src="/embed/{record_id}" width="400" height="500"></iframe>',
    }
