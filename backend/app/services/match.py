from app.db.database import get_cached_match, save_match_cache
from app.services.riot_api import RiotAPIClient
from app.services.data_dragon import get_items, get_version, item_icon_url, champion_icon_url
from app.core.config import PLATFORM_TO_REGIONAL


def _resolve_items(
    participant: dict,
    items_data: dict,
    version: str,
) -> list[dict | None]:
    """Return a list of exactly 7 item slots (item0–item6), each resolved to
    {id, name, icon} or None for empty (0) slots."""
    result: list[dict | None] = []
    for i in range(7):
        item_id: int = participant.get(f"item{i}", 0)
        if item_id == 0:
            result.append(None)
        else:
            item_key = str(item_id)
            item_info = items_data.get(item_key)
            if item_info:
                result.append(
                    {
                        "id": item_id,
                        "name": item_info["name"],
                        "icon": item_icon_url(item_id, version),
                    }
                )
            else:
                # Unknown item ID — return minimal object so the frontend slot
                # is populated rather than silently dropped.
                result.append(
                    {
                        "id": item_id,
                        "name": "Unknown Item",
                        "icon": item_icon_url(item_id, version),
                    }
                )
    return result


def _reshape_participant(
    participant: dict,
    items_data: dict,
    version: str,
) -> dict:
    kills: int = participant.get("kills", 0)
    deaths: int = participant.get("deaths", 0)
    assists: int = participant.get("assists", 0)
    kda: float = round((kills + assists) / max(deaths, 1), 2)

    cs: int = participant.get("totalMinionsKilled", 0) + participant.get(
        "neutralMinionsKilled", 0
    )

    champion_name: str = participant.get("championName", "")

    # Riot API uses riotIdGameName on newer match-v5 data; fall back to
    # summonerName for older cached matches.
    summoner_name: str = participant.get("riotIdGameName") or participant.get(
        "summonerName", ""
    )

    return {
        "puuid": participant.get("puuid", ""),
        "summoner_name": summoner_name,
        "champion": champion_name,
        "champion_icon": champion_icon_url(champion_name, version),
        "role": participant.get("teamPosition", ""),
        "kills": kills,
        "deaths": deaths,
        "assists": assists,
        "kda": kda,
        "cs": cs,
        "win": participant.get("win", False),
        "items": _resolve_items(participant, items_data, version),
    }


async def get_match_detail(match_id: str, platform: str) -> dict:
    """Fetch (or cache-hit) a match and return the structured response dict.

    Raises:
        ValueError: invalid platform
        app.services.riot_api.RiotAPIError: propagated from the Riot client
    """
    platform_lower = platform.lower()
    if platform_lower not in PLATFORM_TO_REGIONAL:
        raise ValueError(
            f"Invalid platform '{platform}'. "
            f"Valid platforms: {', '.join(sorted(PLATFORM_TO_REGIONAL))}"
        )

    match_data: dict | None = await get_cached_match(match_id)

    if match_data is None:
        client = RiotAPIClient()
        match_data = await client.get_match(match_id, platform_lower)
        region = PLATFORM_TO_REGIONAL[platform_lower]
        await save_match_cache(match_id, region, match_data)

    # Resolve Data Dragon assets
    version = await get_version()
    items_data = await get_items()

    info: dict = match_data.get("info", {})
    participants: list[dict] = info.get("participants", [])

    # Determine the winning team ID
    teams: list[dict] = info.get("teams", [])
    winning_team: int | None = None
    for team in teams:
        if team.get("win"):
            winning_team = team.get("teamId")
            break

    blue_team: list[dict] = []
    red_team: list[dict] = []

    for p in participants:
        shaped = _reshape_participant(p, items_data, version)
        if p.get("teamId") == 100:
            blue_team.append(shaped)
        else:
            red_team.append(shaped)

    return {
        "match_id": match_id,
        "game_duration": info.get("gameDuration", 0),
        "winning_team": winning_team,
        "blue_team": blue_team,
        "red_team": red_team,
    }
