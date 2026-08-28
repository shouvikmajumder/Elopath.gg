import aiosqlite
import json
import time
from app.core.config import settings

DB_PATH = settings.DATABASE_PATH

_SCHEMA = """
CREATE TABLE IF NOT EXISTS dd_meta (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at INTEGER
);

CREATE TABLE IF NOT EXISTS match_cache (
    match_id TEXT PRIMARY KEY,
    region TEXT,
    data TEXT,
    cached_at INTEGER
);
"""


async def init_db() -> None:
    async with aiosqlite.connect(DB_PATH) as db:
        await db.executescript(_SCHEMA)
        await db.commit()


async def get_cached_match(match_id: str) -> dict | None:
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute(
            "SELECT data FROM match_cache WHERE match_id=?", (match_id,)
        )
        row = await cursor.fetchone()
        if not row:
            return None
        return json.loads(row[0])


async def save_match_cache(match_id: str, region: str, data: dict) -> None:
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            """INSERT OR REPLACE INTO match_cache (match_id, region, data, cached_at)
               VALUES (?,?,?,?)""",
            (match_id, region, json.dumps(data), int(time.time())),
        )
        await db.commit()


async def get_meta(key: str) -> str | None:
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute("SELECT value FROM dd_meta WHERE key=?", (key,))
        row = await cursor.fetchone()
        return row[0] if row else None


async def set_meta(key: str, value: str) -> None:
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "INSERT OR REPLACE INTO dd_meta (key, value, updated_at) VALUES (?,?,?)",
            (key, value, int(time.time())),
        )
        await db.commit()
