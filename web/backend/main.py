"""FastAPI backend for MiniShogi web interface."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import game, records, train


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    # Startup
    print("🎮 MiniShogi API starting...")
    yield
    # Shutdown
    print("MiniShogi API shutting down...")


app = FastAPI(
    title="MiniShogi API",
    description="API for MiniShogi game, training, and records",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],  # Vite dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(game.router, prefix="/api/game", tags=["Game"])
app.include_router(train.router, prefix="/api/train", tags=["Training"])
app.include_router(records.router, prefix="/api/records", tags=["Records"])


@app.get("/")
async def root():
    """Health check endpoint."""
    return {"status": "ok", "message": "MiniShogi API is running"}
