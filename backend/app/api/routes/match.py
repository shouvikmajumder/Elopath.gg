from fastapi import APIRouter, HTTPException
from app.services.match import get_match_detail
from app.services.riot_api import RiotAPIError

router = APIRouter()


@router.get("/{platform}/{match_id}")
async def get_match(platform: str, match_id: str):
    try:
        return await get_match_detail(match_id, platform)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RiotAPIError as e:
        if e.status_code == 404:
            raise HTTPException(status_code=404, detail="Match not found")
        if e.status_code == 429:
            raise HTTPException(status_code=429, detail="Rate limit exceeded")
        if e.status_code == 403:
            raise HTTPException(status_code=502, detail="Riot API key invalid or expired")
        raise HTTPException(status_code=502, detail="Riot API error")
