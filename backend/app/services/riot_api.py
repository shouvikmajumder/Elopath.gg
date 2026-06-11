import httpx
from typing import Any
from app.core.config import settings


class RiotAPIError(Exception):
    def __init__(self, status_code: int, message: str):
        self.status_code = status_code
        super().__init__(message)


class RiotAPIClient:
    def __init__(self):
        self._headers = {"X-Riot-Token": settings.RIOT_API_KEY}

    async def _get(self, url: str, params: dict | None = None) -> Any:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get(url, headers=self._headers, params=params)
            if r.status_code == 429:
                raise RiotAPIError(429, "Rate limit exceeded")
            if r.status_code == 403:
                raise RiotAPIError(403, "Invalid or expired API key")
            if r.status_code == 404:
                raise RiotAPIError(404, "Resource not found")
            r.raise_for_status()
            return r.json()

    async def get_account_by_riot_id(self, game_name: str, tag_line: str) -> dict:
        url = f"{settings.regional_host}/riot/account/v1/accounts/by-riot-id/{game_name}/{tag_line}"
        return await self._get(url)

    async def get_summoner_by_puuid(self, puuid: str) -> dict:
        url = f"{settings.platform_host}/lol/summoner/v4/summoners/by-puuid/{puuid}"
        return await self._get(url)

    async def get_match_ids(
        self,
        puuid: str,
        queue: int = 420,
        count: int = 20,
        champion: int | None = None,
    ) -> list[str]:
        url = f"{settings.regional_host}/lol/match/v5/matches/by-puuid/{puuid}/ids"
        params: dict[str, Any] = {"queue": queue, "count": count}
        if champion is not None:
            params["champion"] = champion
        return await self._get(url, params)

    async def get_match(self, match_id: str) -> dict:
        url = f"{settings.regional_host}/lol/match/v5/matches/{match_id}"
        return await self._get(url)

    async def get_challenger_entries(self, queue: str = "RANKED_SOLO_5x5") -> dict:
        url = f"{settings.platform_host}/lol/league/v4/challengerleagues/by-queue/{queue}"
        return await self._get(url)

    async def get_grandmaster_entries(self, queue: str = "RANKED_SOLO_5x5") -> dict:
        url = f"{settings.platform_host}/lol/league/v4/grandmasterleagues/by-queue/{queue}"
        return await self._get(url)
