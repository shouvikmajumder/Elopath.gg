import httpx
from typing import Any

BASE = "https://ddragon.leagueoflegends.com"

_version: str | None = None
_champions: dict[str, Any] | None = None
_items: dict[str, Any] | None = None


async def get_version() -> str:
    global _version
    if _version:
        return _version
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.get(f"{BASE}/api/versions.json")
        r.raise_for_status()
        _version = r.json()[0]
    return _version


async def get_champions() -> dict[str, Any]:
    global _champions
    if _champions:
        return _champions
    version = await get_version()
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.get(f"{BASE}/cdn/{version}/data/en_US/champion.json")
        r.raise_for_status()
        _champions = r.json()["data"]
    return _champions


async def get_items() -> dict[str, Any]:
    global _items
    if _items:
        return _items
    version = await get_version()
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.get(f"{BASE}/cdn/{version}/data/en_US/item.json")
        r.raise_for_status()
        _items = r.json()["data"]
    return _items


def champion_icon_url(champion_id: str, version: str) -> str:
    return f"{BASE}/cdn/{version}/img/champion/{champion_id}.png"


def champion_splash_url(champion_id: str, skin: int = 0) -> str:
    return f"{BASE}/cdn/img/champion/splash/{champion_id}_{skin}.jpg"


def item_icon_url(item_id: int, version: str) -> str:
    return f"{BASE}/cdn/{version}/img/item/{item_id}.png"
