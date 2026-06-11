from fastapi import APIRouter, HTTPException
from app.services.summoner import get_summoner_profile
from app.services.riot_api import RiotAPIError

router = APIRouter()


@router.get("/{platform}/{game_name}/{tag_line}")
async def get_summoner(platform: str, game_name: str, tag_line: str):
    try:
        return await get_summoner_profile(platform, game_name, tag_line)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RiotAPIError as e:
        if e.status_code == 404:
            raise HTTPException(status_code=404, detail="Summoner not found")
        if e.status_code == 429:
            raise HTTPException(status_code=429, detail="Rate limit exceeded")
        if e.status_code == 403:
            raise HTTPException(status_code=502, detail="Riot API key invalid or expired")
        raise HTTPException(status_code=502, detail="Riot API error")
