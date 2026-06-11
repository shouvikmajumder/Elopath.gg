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

CREATE TABLE IF NOT EXISTS build_recommendations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    champion TEXT NOT NULL,
    role TEXT NOT NULL,
    lane_opponent TEXT,
    comp_hash TEXT,
    items TEXT NOT NULL,
    boots INTEGER,
    win_rate REAL,
    sample_size INTEGER,
    confidence REAL,
    build_order TEXT,
    comp_notes TEXT,
    created_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_builds_lookup
    ON build_recommendations(champion, role, lane_opponent);

CREATE TABLE IF NOT EXISTS build_analyses (
    match_id TEXT NOT NULL,
    puuid TEXT NOT NULL,
    analysis_json TEXT NOT NULL,
    created_at INTEGER,
    PRIMARY KEY (match_id, puuid)
);
"""


async def init_db() -> None:
    async with aiosqlite.connect(DB_PATH) as db:
        await db.executescript(_SCHEMA)
        await db.commit()


async def get_cached_build(
    champion: str, role: str, lane_opponent: str | None
) -> dict | None:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        if lane_opponent:
            cursor = await db.execute(
                """SELECT * FROM build_recommendations
                   WHERE champion=? AND role=? AND lane_opponent=?
                   ORDER BY created_at DESC LIMIT 1""",
                (champion, role, lane_opponent),
            )
        else:
            cursor = await db.execute(
                """SELECT * FROM build_recommendations
                   WHERE champion=? AND role=? AND lane_opponent IS NULL
                   ORDER BY created_at DESC LIMIT 1""",
                (champion, role),
            )
        row = await cursor.fetchone()
        if not row:
            return None
        result = dict(row)
        result["items"] = json.loads(result["items"])
        if result.get("build_order"):
            result["build_order"] = json.loads(result["build_order"])
        if result.get("comp_notes"):
            result["comp_notes"] = json.loads(result["comp_notes"])
        return result


async def save_build_recommendation(data: dict) -> None:
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            """INSERT INTO build_recommendations
               (champion, role, lane_opponent, comp_hash, items, boots,
                win_rate, sample_size, confidence, build_order, comp_notes, created_at)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
            (
                data.get("champion"),
                data.get("role"),
                data.get("lane_opponent"),
                data.get("comp_hash"),
                json.dumps(data.get("items", [])),
                data.get("boots"),
                data.get("win_rate"),
                data.get("sample_size"),
                data.get("confidence"),
                json.dumps(data.get("build_order", [])),
                json.dumps(data.get("comp_notes", [])),
                int(time.time()),
            ),
        )
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


async def get_cached_analysis(match_id: str, puuid: str) -> dict | None:
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute(
            "SELECT analysis_json FROM build_analyses WHERE match_id=? AND puuid=?",
            (match_id, puuid),
        )
        row = await cursor.fetchone()
        if not row:
            return None
        return json.loads(row[0])


async def save_analysis(match_id: str, puuid: str, data: dict) -> None:
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            """INSERT OR REPLACE INTO build_analyses (match_id, puuid, analysis_json, created_at)
               VALUES (?,?,?,?)""",
            (match_id, puuid, json.dumps(data), int(time.time())),
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
