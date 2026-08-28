from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.routes import champions, summoner, match, live_game
from app.db.database import init_db


# ---------------------------------------------------------------------------
# Lifespan
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Elopath.gg API",
    description="League of Legends summoner lookup",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(champions.router, prefix="/api/v1/champions", tags=["champions"])
app.include_router(summoner.router, prefix="/api/v1/summoner", tags=["summoner"])
app.include_router(match.router, prefix="/api/v1/match", tags=["match"])
app.include_router(live_game.router, prefix="/api/v1/live-game", tags=["live-game"])


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

@app.get("/health")
async def health():
    return {"status": "ok", "service": "elopath-api"}
