import httpx
from typing import Any
from app.core.config import settings, platform_host_for, regional_host_for


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

    async def get_account_by_riot_id(self, platform: str, game_name: str, tag_line: str) -> dict:
        url = f"{regional_host_for(platform)}/riot/account/v1/accounts/by-riot-id/{game_name}/{tag_line}"
        return await self._get(url)

    async def get_summoner_by_puuid(self, platform: str, puuid: str) -> dict:
        url = f"{platform_host_for(platform)}/lol/summoner/v4/summoners/by-puuid/{puuid}"
        return await self._get(url)

    async def get_match_ids(
        self,
        puuid: str,
        platform: str,
        queue: int | None = None,
        count: int = 20,
        champion: int | None = None,
    ) -> list[str]:
        url = f"{regional_host_for(platform)}/lol/match/v5/matches/by-puuid/{puuid}/ids"
        params: dict[str, Any] = {"count": count}
        if queue is not None:
            params["queue"] = queue
        if champion is not None:
            params["champion"] = champion
        return await self._get(url, params)

    async def get_match(self, match_id: str, platform: str) -> dict:
        url = f"{regional_host_for(platform)}/lol/match/v5/matches/{match_id}"
        return await self._get(url)

    async def get_league_entries_by_puuid(self, platform: str, puuid: str) -> list[dict]:
        url = f"{platform_host_for(platform)}/lol/league/v4/entries/by-puuid/{puuid}"
        return await self._get(url)

    async def get_active_game(self, platform: str, puuid: str) -> dict:
        url = f"{platform_host_for(platform)}/lol/spectator/v5/active-games/by-puuid/{puuid}"
        return await self._get(url)

