import json
import re

import anthropic

from app.core.config import settings, PLATFORM_TO_REGIONAL
from app.db.database import get_cached_match, save_match_cache
from app.services import data_dragon as dd
from app.services.riot_api import RiotAPIClient

_SYSTEM_PROMPT = """You are an expert League of Legends build theorist with deep knowledge of the current meta.
Given a champion, their role, and the full match composition, recommend the optimal 6-item build plus boots.

Respond ONLY with valid JSON in this exact structure (no markdown, no extra text):
{
  "items": [
    {"name": "<exact current League item name>", "reasoning": "<15-20 word explanation>"},
    {"name": "<exact current League item name>", "reasoning": "<15-20 word explanation>"},
    {"name": "<exact current League item name>", "reasoning": "<15-20 word explanation>"},
    {"name": "<exact current League item name>", "reasoning": "<15-20 word explanation>"},
    {"name": "<exact current League item name>", "reasoning": "<15-20 word explanation>"},
    {"name": "<exact current League item name>", "reasoning": "<15-20 word explanation>"}
  ],
  "boots": {"name": "<boots item name>", "reasoning": "<15-20 word explanation>"},
  "comp_summary": "<1-2 sentence overall build strategy for this specific composition>"
}

Use current patch item names. Tailor reasoning to the specific enemy threats present."""


async def analyze_match_build(platform: str, match_id: str, puuid: str) -> dict:
    raw = await get_cached_match(match_id)
    if raw is None:
        platform_lower = platform.lower()
        if platform_lower not in PLATFORM_TO_REGIONAL:
            raise ValueError(
                f"Invalid platform '{platform}'. "
                f"Valid platforms: {', '.join(sorted(PLATFORM_TO_REGIONAL))}"
            )
        client = RiotAPIClient()
        raw = await client.get_match(match_id, platform_lower)
        region = PLATFORM_TO_REGIONAL[platform_lower]
        await save_match_cache(match_id, region, raw)

    participants = raw.get("info", {}).get("participants", [])
    target = next((p for p in participants if p.get("puuid") == puuid), None)
    if not target:
        raise ValueError(f"Participant {puuid} not found in match {match_id}")

    champion = target.get("championName", "Unknown")
    role = _normalize_role(target.get("teamPosition", target.get("individualPosition", "")))
    target_team_id = target.get("teamId")

    allies = [p for p in participants if p.get("teamId") == target_team_id and p.get("puuid") != puuid]
    enemies = [p for p in participants if p.get("teamId") != target_team_id]

    lane_opponent = _find_lane_opponent(target, enemies)

    user_msg = _build_user_message(champion, role, lane_opponent, allies, enemies)

    if not settings.ANTHROPIC_API_KEY:
        raise ValueError("ANTHROPIC_API_KEY is not configured. Set it in backend/.env")

    client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
    response = await client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        system=_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_msg}],
    )

    raw_text = response.content[0].text
    # Strip markdown fences if Claude wraps the response in ```json ... ```
    clean = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw_text.strip(), flags=re.MULTILINE)
    parsed = json.loads(clean)

    # Enrich with Data Dragon icons
    version = await dd.get_version()
    items_data = await dd.get_items()
    name_to_id = {v["name"].lower(): k for k, v in items_data.items()}

    def enrich(item_dict: dict) -> dict:
        if not item_dict or "name" not in item_dict:
            return {"name": "", "reasoning": "", "icon": ""}
        item_id_str = name_to_id.get(item_dict["name"].lower())
        item_dict["icon"] = dd.item_icon_url(int(item_id_str), version) if item_id_str else ""
        return item_dict

    parsed["items"] = [enrich(i) for i in parsed.get("items", [])]
    parsed["boots"] = enrich(parsed.get("boots", {}))
    parsed["champion"] = champion
    parsed["role"] = role

    return parsed


def _normalize_role(position: str) -> str:
    mapping = {
        "TOP": "TOP",
        "JUNGLE": "JUNGLE",
        "MIDDLE": "MID",
        "MID": "MID",
        "BOTTOM": "ADC",
        "UTILITY": "SUPPORT",
        "SUPPORT": "SUPPORT",
        "ADC": "ADC",
    }
    return mapping.get(position.upper(), position.upper() or "UNKNOWN")


def _find_lane_opponent(target: dict, enemies: list[dict]) -> dict:
    target_pos = target.get("teamPosition", "")
    for e in enemies:
        if e.get("teamPosition") == target_pos:
            return e
    return enemies[0] if enemies else {}


def _build_user_message(
    champion: str,
    role: str,
    lane_opponent: dict,
    allies: list[dict],
    enemies: list[dict],
) -> str:
    opp_name = lane_opponent.get("championName", "Unknown")
    opp_role = _normalize_role(lane_opponent.get("teamPosition", ""))
    ally_list = ", ".join(
        f"{p.get('championName', '?')} ({_normalize_role(p.get('teamPosition', ''))})"
        for p in allies
    )
    enemy_list = ", ".join(
        f"{p.get('championName', '?')} ({_normalize_role(p.get('teamPosition', ''))})"
        for p in enemies
    )
    return (
        f"Champion: {champion} ({role})\n"
        f"Lane opponent: {opp_name} ({opp_role})\n"
        f"Allied team: {ally_list}\n"
        f"Enemy team: {enemy_list}\n\n"
        "What is the optimal 6-item build for this match composition?"
    )
