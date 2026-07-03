import asyncio
import time
from contextlib import asynccontextmanager

from fastapi import BackgroundTasks, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.routes import champions, builds, summoner, match, live_game
from app.db.database import init_db, get_meta, set_meta


# ---------------------------------------------------------------------------
# Ingestion helpers
# ---------------------------------------------------------------------------

async def _bootstrap_ingestion() -> None:
    """Run ingestion + aggregation if they haven't run in the last 24 hours."""
    last_run = await get_meta("last_ingestion")
    if last_run and (time.time() - int(last_run)) < 86400:
        print("[startup] Skipping ingestion — ran within last 24 h")
        return
    await _run_pipeline()


async def _bootstrap_ingestion_force() -> None:
    """Always run ingestion + aggregation, ignoring the 24-hour guard."""
    await _run_pipeline()


async def _run_pipeline() -> None:
    print("[startup] Starting match ingestion...")
    try:
        from app.services.match_ingestion import run_ingestion
        from app.services.build_aggregator import compute_aggregates
        await run_ingestion(platform="na1", max_summoners=50, matches_per_summoner=5)
        await compute_aggregates(min_games=10)
        await set_meta("last_ingestion", str(int(time.time())))
        print("[startup] Ingestion and aggregation complete.")
    except Exception as e:
        # Never crash the server — log and continue.
        print(f"[startup] Ingestion pipeline error (non-fatal): {e}")


# ---------------------------------------------------------------------------
# Lifespan
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    asyncio.create_task(_bootstrap_ingestion())
    yield


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Elopath.gg API",
    description="Matchup-aware League of Legends build optimizer",
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
app.include_router(builds.router, prefix="/api/v1/builds", tags=["builds"])
app.include_router(summoner.router, prefix="/api/v1/summoner", tags=["summoner"])
app.include_router(match.router, prefix="/api/v1/match", tags=["match"])
app.include_router(live_game.router, prefix="/api/v1/live-game", tags=["live-game"])


# ---------------------------------------------------------------------------
# Health + admin
# ---------------------------------------------------------------------------

@app.get("/health")
async def health():
    return {"status": "ok", "service": "elopath-api"}


@app.post("/api/v1/admin/ingest")
async def trigger_ingestion(background_tasks: BackgroundTasks):
    """Manually trigger the ingestion + aggregation pipeline."""
    background_tasks.add_task(_bootstrap_ingestion_force)
    return {"status": "ingestion started"}
