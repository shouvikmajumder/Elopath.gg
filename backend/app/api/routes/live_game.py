import httpx
from fastapi import APIRouter, HTTPException
from app.services.live_game import get_live_game, LiveGameResponse
from app.services.riot_api import RiotAPIError
from app.core.config import PLATFORM_TO_REGIONAL

router = APIRouter()

_VALID_PLATFORMS = frozenset(PLATFORM_TO_REGIONAL.keys())


@router.get("/{platform}/{puuid}", response_model=LiveGameResponse)
async def get_live_game_route(platform: str, puuid: str):
    if platform not in _VALID_PLATFORMS:
        raise HTTPException(status_code=400, detail=f"Invalid platform '{platform}'")
    try:
        return await get_live_game(platform, puuid)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RiotAPIError as e:
        if e.status_code == 404:
            raise HTTPException(status_code=404, detail="Summoner is not in an active game")
        if e.status_code == 429:
            raise HTTPException(status_code=429, detail="Rate limit exceeded")
        if e.status_code == 403:
            # The key is valid for other endpoints but forbidden here — this
            # means it lacks Spectator-API scope, not that it is expired.
            raise HTTPException(
                status_code=403,
                detail="Spectator API not enabled for this Riot API key",
            )
        raise HTTPException(status_code=502, detail="Riot API error")
    except (httpx.HTTPStatusError, httpx.TransportError):
        raise HTTPException(status_code=502, detail="Data Dragon unavailable")
