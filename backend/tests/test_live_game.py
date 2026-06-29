"""
Tests for the live-game polling feature.

Covers:
  1. RiotAPIClient.get_active_game builds the correct /by-puuid/ Spectator v5 URL
  2. RiotAPIError(404) from the service → 404 with canonical detail message
  3. RiotAPIError(429) from the service → 429
  4. Unknown platform → 400 before the service is ever called
  5. httpx.TransportError from DDragon → 502 with "Data Dragon unavailable"
  6. Happy path → 200, LiveGameResponse schema, Smite-carrier flagged as JUNGLE
  7. gameStartTime == 0 passes through unchanged (display logic is frontend-only)

All external I/O is mocked; no real network calls are made.
"""

import httpx
import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient

from app.main import app
from app.services.riot_api import RiotAPIError
from app.services.live_game import LiveGameResponse

# ---------------------------------------------------------------------------
# Shared test data
# ---------------------------------------------------------------------------

MOCK_DD_VERSION = "14.22.1"
MOCK_DD_CHAMPIONS = {
    "Ahri": {"key": "103", "name": "Ahri"},
    "LeeSin": {"key": "64", "name": "Lee Sin"},
}

_PARTICIPANT_AHRI = {
    "puuid": "puuid-blue-1",
    "summonerName": "Player1#NA1",
    "riotId": "Player1#NA1",
    "teamId": 100,
    "championId": 103,
    "spell1Id": 4,    # Flash
    "spell2Id": 12,   # Teleport
    "profileIconId": 1234,
    "bot": False,
    "perks": {"perkIds": [], "perkStyle": 0, "perkSubStyle": 0},
    "gameCustomizationObjects": [],
}

_PARTICIPANT_LEESIN = {
    "puuid": "puuid-blue-jg",
    "summonerName": "Jungler#NA1",
    "riotId": "Jungler#NA1",
    "teamId": 100,
    "championId": 64,
    "spell1Id": 11,   # Smite  ← marks this participant as JUNGLE
    "spell2Id": 4,    # Flash
    "profileIconId": 5678,
    "bot": False,
    "perks": {"perkIds": [], "perkStyle": 0, "perkSubStyle": 0},
    "gameCustomizationObjects": [],
}


def _make_spectator_payload(game_start_time: int = 1_719_600_000_000) -> dict:
    """Return a minimal but realistic Riot Spectator v5 payload."""
    return {
        "gameId": 7_123_456_789,
        "gameStartTime": game_start_time,
        "gameMode": "CLASSIC",
        "gameType": "MATCHED_GAME",
        "gameQueueConfigId": 420,
        "platformId": "NA1",
        "participants": [_PARTICIPANT_AHRI, _PARTICIPANT_LEESIN],
    }


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def client():
    """Synchronous TestClient that runs the app lifespan (idempotent init_db)."""
    with TestClient(app) as c:
        yield c


# ---------------------------------------------------------------------------
# Test 1 — URL shape: must use /by-puuid/, never /by-summoner/
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_active_game_url_uses_by_puuid():
    """get_active_game must call the Spectator v5 /by-puuid/{puuid} endpoint."""
    from app.services.riot_api import RiotAPIClient

    with patch.object(
        RiotAPIClient, "_get", new_callable=AsyncMock, return_value={"gameId": 999}
    ) as mock_inner:
        await RiotAPIClient().get_active_game("na1", "test-puuid-123")

    called_url: str = mock_inner.call_args[0][0]
    assert "/by-puuid/test-puuid-123" in called_url
    assert "by-summoner" not in called_url


# ---------------------------------------------------------------------------
# Test 2 — 404 from Riot API → 404 HTTP response
# ---------------------------------------------------------------------------

def test_live_game_not_in_game_returns_404(client):
    """RiotAPIError(404) → 404 with 'Summoner is not in an active game'."""
    with patch(
        "app.api.routes.live_game.get_live_game",
        new_callable=AsyncMock,
        side_effect=RiotAPIError(404, "not found"),
    ):
        resp = client.get("/api/v1/live-game/na1/some-puuid")

    assert resp.status_code == 404
    assert resp.json()["detail"] == "Summoner is not in an active game"


# ---------------------------------------------------------------------------
# Test 3 — 429 from Riot API → 429 HTTP response
# ---------------------------------------------------------------------------

def test_live_game_rate_limited_returns_429(client):
    """RiotAPIError(429) → 429."""
    with patch(
        "app.api.routes.live_game.get_live_game",
        new_callable=AsyncMock,
        side_effect=RiotAPIError(429, "rate limit exceeded"),
    ):
        resp = client.get("/api/v1/live-game/na1/some-puuid")

    assert resp.status_code == 429


# ---------------------------------------------------------------------------
# Test 4 — Invalid platform → 400 without touching the service
# ---------------------------------------------------------------------------

def test_live_game_invalid_platform_returns_400(client):
    """An unrecognised platform string is rejected with 400 before the service runs."""
    resp = client.get("/api/v1/live-game/notaplatform/some-puuid")

    assert resp.status_code == 400
    assert "notaplatform" in resp.json()["detail"]


# ---------------------------------------------------------------------------
# Test 5 — DDragon transport failure → 502
# ---------------------------------------------------------------------------

def test_live_game_data_dragon_failure_returns_502(client):
    """httpx.ConnectError (a TransportError) from DDragon → 502 with canonical detail."""
    with (
        patch("app.services.live_game.RiotAPIClient") as MockRiot,
        patch(
            "app.services.data_dragon.get_version",
            new_callable=AsyncMock,
            side_effect=httpx.ConnectError("connection refused"),
        ),
    ):
        mock_inst = MockRiot.return_value
        mock_inst.get_active_game = AsyncMock(return_value=_make_spectator_payload())

        resp = client.get("/api/v1/live-game/na1/test-puuid")

    assert resp.status_code == 502
    assert resp.json()["detail"] == "Data Dragon unavailable"


# ---------------------------------------------------------------------------
# Test 6 — Happy path: 200, schema validation, jungler detection
# ---------------------------------------------------------------------------

def test_live_game_happy_path(client):
    """200 response validates against LiveGameResponse; Smite-carrier gets JUNGLE."""
    with (
        patch("app.services.live_game.RiotAPIClient") as MockRiot,
        patch(
            "app.services.data_dragon.get_version",
            new_callable=AsyncMock,
            return_value=MOCK_DD_VERSION,
        ),
        patch(
            "app.services.data_dragon.get_champions",
            new_callable=AsyncMock,
            return_value=MOCK_DD_CHAMPIONS,
        ),
    ):
        mock_inst = MockRiot.return_value
        mock_inst.get_active_game = AsyncMock(return_value=_make_spectator_payload())

        resp = client.get("/api/v1/live-game/na1/puuid-blue-1")

    assert resp.status_code == 200, resp.json()
    data = resp.json()

    # Validate the full response against the Pydantic schema
    game = LiveGameResponse(**data)
    assert game.game_id == 7_123_456_789
    assert game.game_mode == "CLASSIC"
    assert game.game_start_time == 1_719_600_000_000
    assert len(game.participants) == 2

    # Lee Sin (championId 64) had Smite as spell1 → must be JUNGLE
    jungler = next(p for p in game.participants if p.champion_id == 64)
    assert jungler.position == "JUNGLE"
    assert jungler.champion_name == "Lee Sin"
    assert "LeeSin.png" in jungler.champion_icon_url
    assert MOCK_DD_VERSION in jungler.champion_icon_url

    # Ahri (championId 103) has no Smite → position is None
    ahri = next(p for p in game.participants if p.champion_id == 103)
    assert ahri.position is None
    assert ahri.champion_name == "Ahri"
    assert "Ahri.png" in ahri.champion_icon_url
    assert MOCK_DD_VERSION in ahri.champion_icon_url


# ---------------------------------------------------------------------------
# Test 7 — gameStartTime == 0 passes through as-is
# ---------------------------------------------------------------------------

def test_live_game_game_start_time_zero_passes_through(client):
    """A gameStartTime of 0 in the Riot payload must be returned unchanged."""
    with (
        patch("app.services.live_game.RiotAPIClient") as MockRiot,
        patch(
            "app.services.data_dragon.get_version",
            new_callable=AsyncMock,
            return_value=MOCK_DD_VERSION,
        ),
        patch(
            "app.services.data_dragon.get_champions",
            new_callable=AsyncMock,
            return_value=MOCK_DD_CHAMPIONS,
        ),
    ):
        mock_inst = MockRiot.return_value
        mock_inst.get_active_game = AsyncMock(
            return_value=_make_spectator_payload(game_start_time=0)
        )

        resp = client.get("/api/v1/live-game/na1/puuid-blue-1")

    assert resp.status_code == 200, resp.json()
    assert resp.json()["game_start_time"] == 0
