from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.routes import champions, builds, summoner
from app.db.database import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


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


@app.get("/health")
async def health():
    return {"status": "ok", "service": "elopath-api"}
