"""
Tests for app/services/build_analyst.py

Covers the three bug fixes:
  Fix 1 — Cache miss fetches from Riot API instead of hard-failing
  Fix 2 — enrich() no longer KeyErrors on malformed Claude item output
  Fix 3 — Empty ANTHROPIC_API_KEY raises ValueError early

All external I/O is mocked; no real network calls are made.
"""
import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch


# ---------------------------------------------------------------------------
# Fixtures / shared helpers
# ---------------------------------------------------------------------------

def _make_participant(puuid: str, champion: str, position: str, team_id: int, **kw) -> dict:
    base = {
        "puuid": puuid,
        "championName": champion,
        "teamPosition": position,
        "teamId": team_id,
        "kills": 0,
        "deaths": 0,
        "assists": 0,
    }
    base.update(kw)
    return base


# Ten participants: target is Jinx BOTTOM team 100, Caitlyn BOTTOM team 200,
# plus four minimal fillers per team.
_FILLER_100 = [
    _make_participant(f"fill-100-{i}", f"Champ{i}", pos, 100)
    for i, pos in enumerate(["TOP", "JUNGLE", "MIDDLE", "UTILITY"])
]
_FILLER_200 = [
    _make_participant(f"fill-200-{i}", f"EnemyChamp{i}", pos, 200)
    for i, pos in enumerate(["TOP", "JUNGLE", "MIDDLE", "UTILITY"])
]

MOCK_RAW_MATCH: dict = {
    "info": {
        "participants": [
            _make_participant("test-puuid-1", "Jinx", "BOTTOM", 100, kills=10, deaths=2, assists=5),
            _make_participant("test-puuid-2", "Caitlyn", "BOTTOM", 200, kills=5, deaths=4, assists=3),
            *_FILLER_100,
            *_FILLER_200,
        ]
    }
}

# Valid Claude response JSON
MOCK_CLAUDE_JSON = {
    "items": [
        {"name": "Kraken Slayer",           "reasoning": "Shreds tank targets effectively in this composition"},
        {"name": "Runaan's Hurricane",       "reasoning": "Multi-target passive clears waves faster"},
        {"name": "Infinity Edge",            "reasoning": "Critical strike amplification for burst damage"},
        {"name": "Phantom Dancer",           "reasoning": "Attack speed and survivability on low HP"},
        {"name": "Lord Dominik's Regards",   "reasoning": "Armor penetration counters Malphite effectively"},
        {"name": "Mortal Reminder",          "reasoning": "Grievous wounds against healing compositions"},
    ],
    "boots": {"name": "Berserker's Greaves", "reasoning": "Attack speed bonus for Jinx passive resets"},
    "comp_summary": "Focus on building armor penetration early to shred the enemy frontline.",
}

# Minimal Data Dragon item map (enough for icon resolution of Kraken Slayer)
MOCK_DD_ITEMS = {
    "6672": {"name": "Kraken Slayer"},
    "3085": {"name": "Runaan's Hurricane"},
}
MOCK_DD_VERSION = "14.22.1"


def _make_anthropic_response(payload: dict) -> MagicMock:
    """Return a MagicMock that looks like an Anthropic messages.create response."""
    content_block = MagicMock()
    content_block.text = json.dumps(payload)
    response = MagicMock()
    response.content = [content_block]
    return response


# ---------------------------------------------------------------------------
# Shared patch context — patches everything except the thing being tested
# ---------------------------------------------------------------------------

def _base_patches(
    *,
    cached_match=MOCK_RAW_MATCH,
    riot_match=MOCK_RAW_MATCH,
    anthropic_key: str = "sk-test-key",
    claude_payload: dict | None = None,
):
    """
    Return a dict of patch objects ready to be used as context managers.

    Each caller is responsible for starting/stopping them (or use the
    individual test helpers below).
    """
    if claude_payload is None:
        claude_payload = MOCK_CLAUDE_JSON

    patches: dict = {}

    patches["get_cached_match"] = patch(
        "app.services.build_analyst.get_cached_match",
        new_callable=AsyncMock,
        return_value=cached_match,
    )
    patches["save_match_cache"] = patch(
        "app.services.build_analyst.save_match_cache",
        new_callable=AsyncMock,
    )
    patches["riot_client_cls"] = patch(
        "app.services.build_analyst.RiotAPIClient",
    )
    patches["dd_get_version"] = patch(
        "app.services.build_analyst.dd.get_version",
        new_callable=AsyncMock,
        return_value=MOCK_DD_VERSION,
    )
    patches["dd_get_items"] = patch(
        "app.services.build_analyst.dd.get_items",
        new_callable=AsyncMock,
        return_value=MOCK_DD_ITEMS,
    )
    patches["settings"] = patch(
        "app.services.build_analyst.settings",
        **{"ANTHROPIC_API_KEY": anthropic_key},
    )
    patches["anthropic_cls"] = patch(
        "app.services.build_analyst.anthropic.AsyncAnthropic",
    )

    return patches


# ---------------------------------------------------------------------------
# Test 1 — Cache hit: skips Riot API fetch
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_cache_hit_skips_riot_api():
    """When get_cached_match returns data, RiotAPIClient.get_match must NOT be called."""
    from app.services.build_analyst import analyze_match_build

    with (
        patch("app.services.build_analyst.get_cached_match", new_callable=AsyncMock, return_value=MOCK_RAW_MATCH) as mock_cache,
        patch("app.services.build_analyst.save_match_cache", new_callable=AsyncMock) as mock_save,
        patch("app.services.build_analyst.RiotAPIClient") as mock_riot_cls,
        patch("app.services.build_analyst.dd.get_version", new_callable=AsyncMock, return_value=MOCK_DD_VERSION),
        patch("app.services.build_analyst.dd.get_items", new_callable=AsyncMock, return_value=MOCK_DD_ITEMS),
        patch("app.services.build_analyst.settings") as mock_settings,
        patch("app.services.build_analyst.anthropic.AsyncAnthropic") as mock_anthropic_cls,
    ):
        mock_settings.ANTHROPIC_API_KEY = "sk-test-key"

        # Wire up Anthropic mock
        mock_anthropic_inst = AsyncMock()
        mock_anthropic_cls.return_value = mock_anthropic_inst
        mock_anthropic_inst.messages.create = AsyncMock(
            return_value=_make_anthropic_response(MOCK_CLAUDE_JSON)
        )

        result = await analyze_match_build("na1", "NA1_123456", "test-puuid-1")

    # Cache was consulted
    mock_cache.assert_called_once_with("NA1_123456")

    # Riot API client was never instantiated / called
    mock_riot_cls.assert_not_called()

    # save_match_cache was never called (no new data to persist)
    mock_save.assert_not_called()

    # The result should carry champion info
    assert result["champion"] == "Jinx"
    assert result["role"] == "ADC"


# ---------------------------------------------------------------------------
# Test 2 — Cache miss: fetches from Riot API and saves to cache
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_cache_miss_fetches_riot_api_and_saves():
    """When get_cached_match returns None, Riot API must be called and result cached."""
    from app.services.build_analyst import analyze_match_build

    with (
        patch("app.services.build_analyst.get_cached_match", new_callable=AsyncMock, return_value=None),
        patch("app.services.build_analyst.save_match_cache", new_callable=AsyncMock) as mock_save,
        patch("app.services.build_analyst.RiotAPIClient") as mock_riot_cls,
        patch("app.services.build_analyst.dd.get_version", new_callable=AsyncMock, return_value=MOCK_DD_VERSION),
        patch("app.services.build_analyst.dd.get_items", new_callable=AsyncMock, return_value=MOCK_DD_ITEMS),
        patch("app.services.build_analyst.settings") as mock_settings,
        patch("app.services.build_analyst.anthropic.AsyncAnthropic") as mock_anthropic_cls,
    ):
        mock_settings.ANTHROPIC_API_KEY = "sk-test-key"

        # Riot client mock
        mock_riot_inst = AsyncMock()
        mock_riot_cls.return_value = mock_riot_inst
        mock_riot_inst.get_match = AsyncMock(return_value=MOCK_RAW_MATCH)

        # Anthropic mock
        mock_anthropic_inst = AsyncMock()
        mock_anthropic_cls.return_value = mock_anthropic_inst
        mock_anthropic_inst.messages.create = AsyncMock(
            return_value=_make_anthropic_response(MOCK_CLAUDE_JSON)
        )

        await analyze_match_build("na1", "NA1_123456", "test-puuid-1")

    # Riot API was called with the right match_id and platform
    mock_riot_inst.get_match.assert_called_once_with("NA1_123456", "na1")

    # The fetched data was saved to cache
    mock_save.assert_called_once()
    save_args = mock_save.call_args
    assert save_args.args[0] == "NA1_123456"       # match_id
    assert save_args.args[2] == MOCK_RAW_MATCH      # data dict


# ---------------------------------------------------------------------------
# Test 3 — Invalid platform on cache miss raises ValueError
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_cache_miss_invalid_platform_raises():
    """An unrecognised platform string on a cache miss must raise ValueError('Invalid platform')."""
    from app.services.build_analyst import analyze_match_build

    with (
        patch("app.services.build_analyst.get_cached_match", new_callable=AsyncMock, return_value=None),
        patch("app.services.build_analyst.save_match_cache", new_callable=AsyncMock),
        patch("app.services.build_analyst.RiotAPIClient"),
        patch("app.services.build_analyst.settings") as mock_settings,
    ):
        mock_settings.ANTHROPIC_API_KEY = "sk-test-key"

        with pytest.raises(ValueError, match="Invalid platform"):
            await analyze_match_build("invalid_region", "NA1_123456", "test-puuid-1")


# ---------------------------------------------------------------------------
# Test 4 — Empty ANTHROPIC_API_KEY raises ValueError early
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_empty_anthropic_key_raises_before_api_call():
    """An empty ANTHROPIC_API_KEY must raise ValueError before calling Anthropic."""
    from app.services.build_analyst import analyze_match_build

    with (
        patch("app.services.build_analyst.get_cached_match", new_callable=AsyncMock, return_value=MOCK_RAW_MATCH),
        patch("app.services.build_analyst.save_match_cache", new_callable=AsyncMock),
        patch("app.services.build_analyst.RiotAPIClient"),
        patch("app.services.build_analyst.dd.get_version", new_callable=AsyncMock, return_value=MOCK_DD_VERSION),
        patch("app.services.build_analyst.dd.get_items", new_callable=AsyncMock, return_value=MOCK_DD_ITEMS),
        patch("app.services.build_analyst.settings") as mock_settings,
        patch("app.services.build_analyst.anthropic.AsyncAnthropic") as mock_anthropic_cls,
    ):
        mock_settings.ANTHROPIC_API_KEY = ""   # <-- empty key

        with pytest.raises(ValueError, match="ANTHROPIC_API_KEY"):
            await analyze_match_build("na1", "NA1_123456", "test-puuid-1")

        # Anthropic client must NOT have been instantiated
        mock_anthropic_cls.assert_not_called()


# ---------------------------------------------------------------------------
# Test 5 — enrich() handles item dict missing "name" key gracefully
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_enrich_missing_name_key_returns_empty_icon():
    """
    If Claude returns an item dict without a 'name' key, enrich() must return
    {"name": "", "reasoning": "", "icon": ""} without raising KeyError.
    """
    from app.services.build_analyst import analyze_match_build

    # Claude payload where one item is missing its "name" key
    malformed_payload = {
        **MOCK_CLAUDE_JSON,
        "items": [
            {},                                                          # completely empty — triggers the guard
            {"reasoning": "no name here"},                              # has reasoning but no name
            {"name": "Kraken Slayer", "reasoning": "valid item"},
            {"name": "Infinity Edge", "reasoning": "valid item"},
            {"name": "Phantom Dancer", "reasoning": "valid item"},
            {"name": "Mortal Reminder", "reasoning": "valid item"},
        ],
    }

    with (
        patch("app.services.build_analyst.get_cached_match", new_callable=AsyncMock, return_value=MOCK_RAW_MATCH),
        patch("app.services.build_analyst.save_match_cache", new_callable=AsyncMock),
        patch("app.services.build_analyst.RiotAPIClient"),
        patch("app.services.build_analyst.dd.get_version", new_callable=AsyncMock, return_value=MOCK_DD_VERSION),
        patch("app.services.build_analyst.dd.get_items", new_callable=AsyncMock, return_value=MOCK_DD_ITEMS),
        patch("app.services.build_analyst.settings") as mock_settings,
        patch("app.services.build_analyst.anthropic.AsyncAnthropic") as mock_anthropic_cls,
    ):
        mock_settings.ANTHROPIC_API_KEY = "sk-test-key"

        mock_anthropic_inst = AsyncMock()
        mock_anthropic_cls.return_value = mock_anthropic_inst
        mock_anthropic_inst.messages.create = AsyncMock(
            return_value=_make_anthropic_response(malformed_payload)
        )

        # Must not raise
        result = await analyze_match_build("na1", "NA1_123456", "test-puuid-1")

    items = result["items"]
    # First two items were malformed — both should have icon == ""
    assert items[0]["icon"] == "", f"Expected empty icon for empty dict, got: {items[0]}"
    assert items[0]["name"] == ""
    assert items[1]["icon"] == "", f"Expected empty icon for nameless dict, got: {items[1]}"
    assert items[1]["name"] == ""

    # Third item is a known item — icon should be populated (Kraken Slayer is id 6672)
    assert items[2]["name"] == "Kraken Slayer"
    assert "6672" in items[2]["icon"]


# ---------------------------------------------------------------------------
# Test 6 — puuid not found in match raises ValueError
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_puuid_not_in_match_raises():
    """A puuid that doesn't match any participant must raise ValueError('not found in match')."""
    from app.services.build_analyst import analyze_match_build

    with (
        patch("app.services.build_analyst.get_cached_match", new_callable=AsyncMock, return_value=MOCK_RAW_MATCH),
        patch("app.services.build_analyst.save_match_cache", new_callable=AsyncMock),
        patch("app.services.build_analyst.RiotAPIClient"),
        patch("app.services.build_analyst.settings") as mock_settings,
    ):
        mock_settings.ANTHROPIC_API_KEY = "sk-test-key"

        with pytest.raises(ValueError, match="not found in match"):
            await analyze_match_build("na1", "NA1_123456", "nonexistent-puuid")
