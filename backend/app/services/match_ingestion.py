"""
Match ingestion pipeline.

Pulls recent Challenger matches from Riot API, stores participants in
match_participants table for downstream aggregation.
"""
from __future__ import annotations

import asyncio
import random
import time

import aiosqlite

from app.core.config import settings
from app.db.database import DB_PATH, get_cached_match, save_match_cache
from app.services.riot_api import RiotAPIClient, RiotAPIError


async def _is_match_ingested(match_id: str) -> bool:
    """Return True if this match_id already has rows in match_participants."""
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute(
            "SELECT 1 FROM match_participants WHERE match_id=? LIMIT 1",
            (match_id,),
        )
        row = await cursor.fetchone()
        return row is not None


async def _insert_participants(participants: list[dict]) -> int:
    """Bulk-insert participant rows; silently skip duplicates via UNIQUE index."""
    async with aiosqlite.connect(DB_PATH) as db:
        inserted = 0
        for p in participants:
            cursor = await db.execute(
                """INSERT OR IGNORE INTO match_participants
                   (match_id, platform, champion_name, team_position,
                    item0, item1, item2, item3, item4, item5,
                    win, patch, ingested_at)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (
                    p["match_id"],
                    p["platform"],
                    p["champion_name"],
                    p["team_position"],
                    p["item0"],
                    p["item1"],
                    p["item2"],
                    p["item3"],
                    p["item4"],
                    p["item5"],
                    p["win"],
                    p["patch"],
                    int(time.time()),
                ),
            )
            inserted += cursor.rowcount
        await db.commit()
        return inserted


async def _fetch_match_with_retry(
    client: RiotAPIClient, match_id: str, platform: str
) -> dict | None:
    """Fetch a match, retrying once after 120 s on 429; returns None to skip."""
    for attempt in range(2):
        try:
            return await client.get_match(match_id, platform)
        except RiotAPIError as e:
            if e.status_code == 429:
                print(
                    f"[ingestion] Rate limited on {match_id} "
                    f"(attempt {attempt + 1}/2), sleeping 120 s..."
                )
                await asyncio.sleep(120)
                if attempt == 1:
                    print(f"[ingestion] Still rate limited, skipping {match_id}")
                    return None
            elif e.status_code in (403, 404):
                print(
                    f"[ingestion] API error {e.status_code} for {match_id}, skipping"
                )
                return None
            else:
                raise
    return None


async def run_ingestion(
    platform: str = "na1",
    max_summoners: int = 50,
    matches_per_summoner: int = 5,
) -> None:
    """
    Main ingestion entry point.

    1. Fetch Challenger league entries.
    2. Sample up to max_summoners, resolve to PUUIDs.
    3. Collect recent ranked match IDs per PUUID.
    4. For each unique match, fetch (or hit cache) and store participants.
    """
    client = RiotAPIClient()
    print(f"[ingestion] Starting ingestion — platform={platform}")

    # ---- Step 1: Challenger league ----------------------------------------
    try:
        challenger = await client.get_challenger_league(platform)
    except RiotAPIError as e:
        print(
            f"[ingestion] Failed to fetch Challenger league: {e} "
            f"(status={e.status_code})"
        )
        if e.status_code in (403, 404):
            print("[ingestion] Invalid API key — aborting ingestion")
            return
        raise

    entries = challenger.get("entries", [])
    print(f"[ingestion] Challenger league has {len(entries)} entries")

    # ---- Step 2: Sample ----------------------------------------------------
    random.shuffle(entries)
    sampled = entries[:max_summoners]

    # ---- Step 3: Resolve PUUIDs -------------------------------------------
    puuids: list[str] = []
    for i, entry in enumerate(sampled):
        summoner_id = entry.get("summonerId", "")
        if not summoner_id:
            continue
        try:
            summoner = await client.get_summoner_by_id(platform, summoner_id)
            puuid = summoner.get("puuid", "")
            if puuid:
                puuids.append(puuid)
                print(
                    f"[ingestion] Summoner {i + 1}/{len(sampled)} "
                    f"puuid={puuid[:16]}..."
                )
        except RiotAPIError as e:
            print(f"[ingestion] Error fetching summoner {summoner_id}: {e}")
            continue
        await asyncio.sleep(1.2)

    print(f"[ingestion] Resolved {len(puuids)} PUUIDs")

    # ---- Step 4: Collect match IDs ----------------------------------------
    all_match_ids: set[str] = set()
    for i, puuid in enumerate(puuids):
        try:
            match_ids = await client.get_match_ids(
                puuid, platform, queue=420, count=matches_per_summoner
            )
            all_match_ids.update(match_ids)
            print(
                f"[ingestion] PUUID {i + 1}/{len(puuids)} "
                f"-> {len(match_ids)} matches "
                f"(total unique: {len(all_match_ids)})"
            )
        except RiotAPIError as e:
            print(f"[ingestion] Error fetching match IDs for {puuid[:16]}...: {e}")
            continue
        await asyncio.sleep(1.2)

    print(f"[ingestion] Total unique match IDs to process: {len(all_match_ids)}")

    # ---- Steps 5-10: Ingest each match ------------------------------------
    match_list = list(all_match_ids)
    total_inserted = 0

    for i, match_id in enumerate(match_list):
        print(f"[ingestion] Match {i + 1}/{len(match_list)}: {match_id}")

        if await _is_match_ingested(match_id):
            print(f"[ingestion]   Already ingested, skipping")
            continue

        # Hit cache before making an API call
        match_data = await get_cached_match(match_id)
        if match_data is None:
            match_data = await _fetch_match_with_retry(client, match_id, platform)
            if match_data is None:
                continue
            await save_match_cache(match_id, platform, match_data)
            await asyncio.sleep(1.2)

        info = match_data.get("info", {})
        raw_participants = info.get("participants", [])
        patch = info.get("gameVersion", "")

        rows: list[dict] = []
        for p in raw_participants:
            position = p.get("teamPosition", "")
            if not position:
                # teamPosition is empty on remakes — skip
                continue
            rows.append(
                {
                    "match_id": match_id,
                    "platform": platform,
                    "champion_name": p.get("championName", ""),
                    "team_position": position,
                    "item0": p.get("item0", 0),
                    "item1": p.get("item1", 0),
                    "item2": p.get("item2", 0),
                    "item3": p.get("item3", 0),
                    "item4": p.get("item4", 0),
                    "item5": p.get("item5", 0),
                    "win": 1 if p.get("win", False) else 0,
                    "patch": patch,
                }
            )

        n = await _insert_participants(rows)
        total_inserted += n
        print(f"[ingestion]   Inserted {n} participants (running total: {total_inserted})")

    print(f"[ingestion] Done. Total participants inserted: {total_inserted}")
