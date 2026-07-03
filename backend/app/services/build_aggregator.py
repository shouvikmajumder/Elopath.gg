"""
Build aggregation service.

Reads match_participants rows, computes item frequency stats grouped by
champion + role, and writes results to build_aggregates.
"""
from __future__ import annotations

import time
from collections import Counter, defaultdict

import aiosqlite

from app.db.database import DB_PATH, get_aggregate_build, save_aggregate_build
from app.services import data_dragon as dd

# Item IDs that should always be excluded from build aggregation.
# Includes trinkets, consumables, and empty slots (0).
_EXCLUDED_ITEMS: set[int] = {
    3340, 3364, 3363,       # Trinkets (Stealth Ward, Oracle Lens, Farsight)
    4401, 4642, 4643, 4644, # Jungle-specific items / quest variants
    7050,                   # Gangplank barrel
    2055, 2056,             # Control Ward / Elixir
    2003, 2010,             # Potions
    0,                      # Empty slot
}

# Map Riot's teamPosition values to our canonical role names.
_NORMALIZE_POSITION: dict[str, str] = {
    "MIDDLE": "MID",
    "BOTTOM": "ADC",
    "UTILITY": "SUPPORT",
    "TOP": "TOP",
    "JUNGLE": "JUNGLE",
}


async def _fetch_all_participants() -> list[dict]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT * FROM match_participants")
        rows = await cursor.fetchall()
        return [dict(r) for r in rows]


async def compute_aggregates(min_games: int = 20) -> None:
    """
    Compute win-rate-weighted item frequencies for every champion/role pair
    that has at least min_games rows and persist to build_aggregates.
    """
    print("[aggregator] Starting aggregate computation...")

    # ---- Data Dragon item catalogue ---------------------------------------
    try:
        items_data = await dd.get_items()
    except Exception as e:
        print(f"[aggregator] Could not fetch Data Dragon items: {e} — using empty sets")
        items_data = {}

    final_item_ids: set[int] = set()
    boot_item_ids: set[int] = set()

    for item_id_str, item_info in items_data.items():
        try:
            item_id = int(item_id_str)
        except ValueError:
            continue

        into_list = item_info.get("into", [])
        tags = item_info.get("tags", [])

        if not into_list:
            final_item_ids.add(item_id)

        if "Boots" in tags:
            boot_item_ids.add(item_id)

    print(
        f"[aggregator] Item catalogue: {len(final_item_ids)} final items, "
        f"{len(boot_item_ids)} boot items"
    )

    # ---- Load participant data -------------------------------------------
    participants = await _fetch_all_participants()
    print(f"[aggregator] Processing {len(participants)} participant rows")

    if not participants:
        print("[aggregator] No participant data found — run ingestion first")
        return

    # ---- Group by (champion, role) --------------------------------------
    groups: dict[tuple[str, str], list[dict]] = defaultdict(list)
    for p in participants:
        role = _NORMALIZE_POSITION.get(p["team_position"], p["team_position"])
        groups[(p["champion_name"], role)].append(p)

    # ---- Compute per-group aggregates ------------------------------------
    computed = 0
    for (champion, role), rows in groups.items():
        if len(rows) < min_games:
            continue

        winning_rows = [r for r in rows if r["win"] == 1]

        item_counter: Counter[int] = Counter()
        boot_counter: Counter[int] = Counter()

        for r in winning_rows:
            for slot in ("item0", "item1", "item2", "item3", "item4", "item5"):
                item_id: int = r.get(slot) or 0
                if item_id in _EXCLUDED_ITEMS:
                    continue
                if item_id in boot_item_ids:
                    boot_counter[item_id] += 1
                elif item_id in final_item_ids:
                    item_counter[item_id] += 1
                # Items that appear in data but are not final (intermediate
                # components) are intentionally skipped.

        top_items = [iid for iid, _ in item_counter.most_common(6)]
        top_boot: int | None = (
            boot_counter.most_common(1)[0][0] if boot_counter else None
        )

        total_wins = sum(1 for r in rows if r["win"] == 1)
        win_rate = total_wins / len(rows)

        patch_counter: Counter[str] = Counter(
            r["patch"] for r in rows if r.get("patch")
        )
        patch: str | None = (
            patch_counter.most_common(1)[0][0] if patch_counter else None
        )

        await save_aggregate_build(
            {
                "champion_name": champion,
                "role": role,
                "items": top_items,
                "boots": top_boot,
                "win_rate": win_rate,
                "sample_size": len(rows),
                "patch": patch,
            }
        )
        computed += 1

    print(f"[aggregator] Computed aggregates for {computed} champion/role combinations")


async def get_build_for_champion_role(champion: str, role: str) -> dict | None:
    """Return the aggregated build for a champion/role pair, or None."""
    return await get_aggregate_build(champion, role)
