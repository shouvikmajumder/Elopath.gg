from pydantic import BaseModel

from app.services import data_dragon as dd
from app.services.riot_api import RiotAPIClient

SMITE_SPELL_ID = 11


class LiveGameParticipant(BaseModel):
    puuid: str
    summoner_name: str
    team_id: int
    champion_id: int
    champion_name: str
    champion_icon_url: str
    position: str | None
    spell1_id: int
    spell2_id: int


class LiveGameResponse(BaseModel):
    game_id: int
    game_start_time: int
    game_mode: str
    participants: list[LiveGameParticipant]


async def get_live_game(platform: str, puuid: str) -> LiveGameResponse:
    client = RiotAPIClient()
    raw = await client.get_active_game(platform, puuid)

    version = await dd.get_version()
    champions_data = await dd.get_champions()
    # Build a map from numeric champion ID → DDragon string key (e.g. 103 → "Ahri")
    id_to_key: dict[int, str] = {
        int(v["key"]): k for k, v in champions_data.items()
    }

    participants: list[LiveGameParticipant] = []
    for p in raw.get("participants", []):
        champion_id: int = p.get("championId", 0)
        champion_key = id_to_key.get(champion_id, "")
        champion_name = champions_data[champion_key]["name"] if champion_key else str(champion_id)
        icon_url = dd.champion_icon_url(champion_key, version) if champion_key else ""

        spell1_id: int = p.get("spell1Id", 0)
        spell2_id: int = p.get("spell2Id", 0)
        position = "JUNGLE" if spell1_id == SMITE_SPELL_ID or spell2_id == SMITE_SPELL_ID else None

        summoner_name: str = p.get("riotId") or p.get("summonerName") or ""

        participants.append(
            LiveGameParticipant(
                puuid=p.get("puuid", ""),
                summoner_name=summoner_name,
                team_id=p.get("teamId", 0),
                champion_id=champion_id,
                champion_name=champion_name,
                champion_icon_url=icon_url,
                position=position,
                spell1_id=spell1_id,
                spell2_id=spell2_id,
            )
        )

    return LiveGameResponse(
        game_id=raw.get("gameId", 0),
        game_start_time=raw.get("gameStartTime", 0),
        game_mode=raw.get("gameMode", ""),
        participants=participants,
    )
