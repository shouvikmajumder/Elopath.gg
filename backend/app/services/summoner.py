from app.core.config import PLATFORM_TO_REGIONAL
from app.services.riot_api import RiotAPIClient
from app.services import data_dragon as dd
from app.db.database import get_cached_match, save_match_cache

RANKED_SOLO_QUEUE = "RANKED_SOLO_5x5"
MATCH_COUNT = 10


async def get_summoner_profile(platform: str, game_name: str, tag_line: str) -> dict:
    if platform not in PLATFORM_TO_REGIONAL:
        raise ValueError(
            f"Invalid platform '{platform}'. Must be one of: "
            f"{', '.join(sorted(PLATFORM_TO_REGIONAL.keys()))}"
        )

    client = RiotAPIClient()

    account = await client.get_account_by_riot_id(platform, game_name, tag_line)
    puuid = account["puuid"]

    summoner = await client.get_summoner_by_puuid(platform, puuid)

    league_entries = await client.get_league_entries_by_puuid(platform, puuid)
    ranked = None
    for entry in league_entries:
        if entry.get("queueType") == RANKED_SOLO_QUEUE:
            wins = entry.get("wins", 0)
            losses = entry.get("losses", 0)
            total = wins + losses
            ranked = {
                "tier": entry.get("tier"),
                "rank": entry.get("rank"),
                "league_points": entry.get("leaguePoints", 0),
                "wins": wins,
                "losses": losses,
                "win_rate": round(wins / total * 100, 1) if total > 0 else 0.0,
            }
            break

    version = await dd.get_version()

    match_ids = await client.get_match_ids(puuid, platform, queue=420, count=MATCH_COUNT)

    matches: list[dict] = []
    for match_id in match_ids:
        match_data = await get_cached_match(match_id)
        if match_data is None:
            match_data = await client.get_match(match_id, platform)
            await save_match_cache(match_id, platform, match_data)

        participant = next(
            (p for p in match_data["info"]["participants"] if p["puuid"] == puuid),
            None,
        )
        if participant is None:
            continue

        kills = participant.get("kills", 0)
        deaths = participant.get("deaths", 0)
        assists = participant.get("assists", 0)
        champion_name = participant.get("championName")

        matches.append(
            {
                "match_id": match_id,
                "champion": champion_name,
                "champion_icon": dd.champion_icon_url(champion_name, version),
                "win": participant.get("win", False),
                "kills": kills,
                "deaths": deaths,
                "assists": assists,
                "kda": round((kills + assists) / max(deaths, 1), 2),
                "cs": participant.get("totalMinionsKilled", 0)
                + participant.get("neutralMinionsKilled", 0),
                "game_duration": match_data["info"].get("gameDuration"),
                "game_creation": match_data["info"].get("gameCreation"),
                "queue_id": match_data["info"].get("queueId"),
                "role": participant.get("teamPosition"),
            }
        )

    champion_stats_map: dict[str, dict] = {}
    for m in matches:
        champ = m["champion"]
        stats = champion_stats_map.setdefault(
            champ,
            {
                "champion": champ,
                "champion_icon": m["champion_icon"],
                "games": 0,
                "wins": 0,
                "losses": 0,
            },
        )
        stats["games"] += 1
        if m["win"]:
            stats["wins"] += 1
        else:
            stats["losses"] += 1

    champion_stats = []
    for stats in champion_stats_map.values():
        games = stats["games"]
        stats["win_rate"] = round(stats["wins"] / games * 100, 1) if games > 0 else 0.0
        champion_stats.append(stats)
    champion_stats.sort(key=lambda s: s["games"], reverse=True)

    return {
        "summoner": {
            "puuid": puuid,
            "game_name": account.get("gameName", game_name),
            "tag_line": account.get("tagLine", tag_line),
            "profile_icon_url": dd.profile_icon_url(summoner["profileIconId"], version),
            "summoner_level": summoner.get("summonerLevel"),
        },
        "ranked": ranked,
        "matches": matches,
        "champion_stats": champion_stats,
        "version": version,
    }
