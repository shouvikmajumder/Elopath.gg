from pydantic import BaseModel

from app.services import data_dragon as dd
from app.services.riot_api import RiotAPIClient
from app.services.role_prediction import predict_team_roles

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

    # --- Phase 1: build participants without positions ---
    participants: list[LiveGameParticipant] = []
    for p in raw.get("participants", []):
        champion_id: int = p.get("championId", 0)
        champion_key = id_to_key.get(champion_id, "")
        champion_name = champions_data[champion_key]["name"] if champion_key else str(champion_id)
        icon_url = dd.champion_icon_url(champion_key, version) if champion_key else ""

        spell1_id: int = p.get("spell1Id", 0)
        spell2_id: int = p.get("spell2Id", 0)

        summoner_name: str = p.get("riotId") or p.get("summonerName") or ""

        participants.append(
            LiveGameParticipant(
                puuid=p.get("puuid", ""),
                summoner_name=summoner_name,
                team_id=p.get("teamId", 0),
                champion_id=champion_id,
                champion_name=champion_name,
                champion_icon_url=icon_url,
                position=None,
                spell1_id=spell1_id,
                spell2_id=spell2_id,
            )
        )

    # --- Phase 2: predict roles per team and backfill positions ---
    # Group participant indices by team_id (typically 100 / 200).
    teams: dict[int, list[int]] = {}
    for idx, participant in enumerate(participants):
        teams.setdefault(participant.team_id, []).append(idx)

    for team_indices in teams.values():
        champ_ids = [participants[i].champion_id for i in team_indices]
        smite_flags = [
            participants[i].spell1_id == SMITE_SPELL_ID
            or participants[i].spell2_id == SMITE_SPELL_ID
            for i in team_indices
        ]
        role_list = predict_team_roles(champ_ids, smite_flags)
        for local_pos, global_idx in enumerate(team_indices):
            if role_list:
                # Full 5-man prediction: index positionally so duplicate
                # champion IDs on the same team each get their own role.
                position: str | None = role_list[local_pos]
            else:
                # Non-standard lobby (ARAM, custom, <5 participants): fall
                # back to Smite-only detection so junglers are still labelled.
                position = "JUNGLE" if smite_flags[local_pos] else None
            participants[global_idx] = participants[global_idx].model_copy(
                update={"position": position}
            )

    return LiveGameResponse(
        game_id=raw.get("gameId", 0),
        game_start_time=raw.get("gameStartTime", 0),
        game_mode=raw.get("gameMode", ""),
        participants=participants,
    )
