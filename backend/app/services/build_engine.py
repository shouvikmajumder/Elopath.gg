"""
Build recommendation engine.

Priority: aggregated DB data → seeded matchup data → generic fallback
"""
from __future__ import annotations
import hashlib
import json
from typing import Any

# ---------------------------------------------------------------------------
# Static champion metadata (damage type / role classification)
# ---------------------------------------------------------------------------

_AP_CHAMPIONS = {
    "Ahri", "Akali", "Annie", "Aurelion Sol", "Brand", "Cassiopeia",
    "Cho'Gath", "Diana", "Ekko", "Elise", "Evelynn", "Fiddlesticks",
    "Heimerdinger", "Jayce", "Karma", "Kassadin", "Katarina", "Karthus",
    "Kennen", "LeBlanc", "Lissandra", "Lux", "Malzahar", "Mordekaiser",
    "Morgana", "Neeko", "Nidalee", "Orianna", "Rumble", "Ryze",
    "Seraphine", "Sion", "Sivir", "Soraka", "Sylas", "Syndra",
    "Taliyah", "Twisted Fate", "Veigar", "Vel'Koz", "Viktor",
    "Vladimir", "Xerath", "Yone", "Zoe", "Zyra",
    # AP supports
    "Janna", "Nami", "Sona", "Yuumi",
}

_TANK_CHAMPIONS = {
    "Alistar", "Amumu", "Blitzcrank", "Cho'Gath", "Dr. Mundo",
    "Garen", "Gragas", "Jarvan IV", "Leona", "Malphite", "Maokai",
    "Nautilus", "Nunu & Willump", "Ornn", "Poppy", "Rammus",
    "Rell", "Sejuani", "Shen", "Shyvana", "Sion", "Tahm Kench",
    "Thresh", "Volibear", "Warwick", "Zac",
}

_ASSASSIN_CHAMPIONS = {
    "Akali", "Diana", "Ekko", "Elise", "Evelynn", "Fizz",
    "Irelia", "Kha'Zix", "Nidalee", "Pantheon", "Qiyana",
    "Rengar", "Shaco", "Talon", "Wukong", "Zed",
}

# ---------------------------------------------------------------------------
# Seeded build data — drives the demo without live API calls
# Format: (champion, role, lane_opponent) -> build dict
# ---------------------------------------------------------------------------

_BuildEntry = dict[str, Any]

SEEDED_BUILDS: dict[tuple[str, str, str], _BuildEntry] = {
    # ── ADC ─────────────────────────────────────────────────────────────────
    ("Jinx", "ADC", "Caitlyn"): {
        "items": [3031, 3085, 3094, 3046, 3036, 3072],
        "boots": 3006,
        "win_rate": 0.538,
        "sample_size": 8432,
        "build_order": [
            {"phase": "Start", "items": [1055, 2003],
             "description": "Doran's Blade + pots — sustain into Caitlyn's early poke"},
            {"phase": "First Back", "items": [1038],
             "description": "Rush B.F. Sword to threaten all-ins before she outscales"},
            {"phase": "Core", "items": [3031, 3006],
             "description": "Infinity Edge + Greaves unlock your crit power spike"},
            {"phase": "Full Build", "items": [3085, 3094, 3046, 3036, 3072],
             "description": "Hurricane for teamfight; RFC extends your already superior range"},
        ],
        "comp_notes": [
            "Rushing IE hard-counters Caitlyn's lane dominance window (levels 1–6).",
            "RFC gives you longer range than Caitlyn pre-6 if she plays passive.",
        ],
    },
    ("Jinx", "ADC", "Jhin"): {
        "items": [3031, 3085, 3094, 3046, 3036, 3072],
        "boots": 3006,
        "win_rate": 0.544,
        "sample_size": 6218,
        "build_order": [
            {"phase": "Start", "items": [1055, 2003], "description": "Standard aggro start"},
            {"phase": "First Back", "items": [1038],
             "description": "B.F. Sword to contest Jhin's early power spike"},
            {"phase": "Core", "items": [3031, 3006], "description": "Match Jhin's burst with raw crit damage"},
            {"phase": "Full Build", "items": [3085, 3094, 3046, 3036, 3072],
             "description": "Hurricane syncs with your Super Mega Death Rocket passive"},
        ],
        "comp_notes": [
            "Jhin wants to one-shot; your kit lets you sustain damage — outlast him.",
        ],
    },
    ("Caitlyn", "ADC", "Jinx"): {
        "items": [3031, 3094, 3085, 3046, 3036, 3033],
        "boots": 3006,
        "win_rate": 0.561,
        "sample_size": 9104,
        "build_order": [
            {"phase": "Start", "items": [1055, 2003], "description": "Doran's Blade for early aggression"},
            {"phase": "First Back", "items": [1038, 1051], "description": "B.F. + Cloak for crit build"},
            {"phase": "Core", "items": [3031, 3006],
             "description": "IE + Greaves — use your range advantage to zone Jinx off farm"},
            {"phase": "Full Build", "items": [3094, 3085, 3046, 3036, 3033],
             "description": "Mortal Reminder counters Bloodthirster lifesteal"},
        ],
        "comp_notes": [
            "Your range advantage over Jinx is decisive — use Headshot passive to bully early.",
            "Swap Lord Dominik's for Mortal Reminder if they rush Bloodthirster.",
        ],
    },
    # ── MID ─────────────────────────────────────────────────────────────────
    ("Ahri", "MID", "Syndra"): {
        "items": [4645, 3089, 3135, 3157, 3100, 3165],
        "boots": 3020,
        "win_rate": 0.521,
        "sample_size": 5672,
        "build_order": [
            {"phase": "Start", "items": [1056, 2003], "description": "Doran's Ring for mana sustain"},
            {"phase": "First Back", "items": [3802], "description": "Lost Chapter — mana buys you safety"},
            {"phase": "Core", "items": [4645, 3020],
             "description": "Shadowflame punishes Syndra's Dark Sphere shielding"},
            {"phase": "Full Build", "items": [3089, 3135, 3157, 3100, 3165],
             "description": "Zhonya's negates her ultimate; Morello cuts regeneration"},
        ],
        "comp_notes": [
            "Shadowflame specifically counters the shield stacking meta.",
            "Zhonya's active can dodge Syndra's R — save it.",
        ],
    },
    ("Zed", "MID", "Ahri"): {
        "items": [3142, 3134, 3814, 3071, 3036, 3072],
        "boots": 3047,
        "win_rate": 0.506,
        "sample_size": 4891,
        "build_order": [
            {"phase": "Start", "items": [1036, 2003], "description": "Long Sword for early kill pressure"},
            {"phase": "First Back", "items": [3133],
             "description": "Caulfield's Warhammer into lethality path"},
            {"phase": "Core", "items": [3142, 3047],
             "description": "Youmuu's + Steelcaps (Ahri has AD basic attacks too)"},
            {"phase": "Full Build", "items": [3134, 3814, 3071, 3036, 3072],
             "description": "Edge of Night blocks Ahri's E charm; Black Cleaver for teamfight"},
        ],
        "comp_notes": [
            "Edge of Night's spell shield blocks Ahri's Charm (E) — time your all-in around it.",
            "Steelcaps reduces her basic attack damage during burst combos.",
        ],
    },
    ("Lux", "MID", "Zed"): {
        "items": [4645, 3089, 3157, 3135, 3165, 3040],
        "boots": 3020,
        "win_rate": 0.513,
        "sample_size": 3847,
        "build_order": [
            {"phase": "Start", "items": [1056, 2003], "description": "Doran's Ring — sustain to outpoke"},
            {"phase": "First Back", "items": [3802], "description": "Lost Chapter for chunk damage"},
            {"phase": "Core", "items": [4645, 3020, 3157],
             "description": "Shadowflame + Zhonya's — Zhonya's blocks Death Mark"},
            {"phase": "Full Build", "items": [3089, 3135, 3165, 3040],
             "description": "Max burst — Zed can't sustain 1v1 if you land your full combo"},
        ],
        "comp_notes": [
            "Zhonya's active COMPLETELY blocks Zed's R death mark — keep it up.",
            "Play safe early; you outscale him hard at level 9 with point-and-click snare.",
        ],
    },
    # ── TOP ─────────────────────────────────────────────────────────────────
    ("Darius", "TOP", "Garen"): {
        "items": [3071, 3053, 3065, 3143, 3068, 3075],
        "boots": 3047,
        "win_rate": 0.553,
        "sample_size": 7234,
        "build_order": [
            {"phase": "Start", "items": [1054, 2003], "description": "Doran's Shield — neutral start"},
            {"phase": "First Back", "items": [3067, 1028],
             "description": "Kindlegem + Ruby Crystal for Black Cleaver rush"},
            {"phase": "Core", "items": [3071, 3047],
             "description": "Black Cleaver stacks faster than Garen can spin — shreds his MR/armor"},
            {"phase": "Full Build", "items": [3053, 3065, 3143, 3068, 3075],
             "description": "Thornmail punishes Garen's sustain rune choices"},
        ],
        "comp_notes": [
            "Garen's Q silence is short — play around it with your E pull.",
            "Black Cleaver armor shred means you win extended trades.",
        ],
    },
    ("Malphite", "TOP", "Darius"): {
        "items": [3068, 3110, 3065, 3143, 3075, 3001],
        "boots": 3047,
        "win_rate": 0.541,
        "sample_size": 6127,
        "build_order": [
            {"phase": "Start", "items": [1054, 2003], "description": "Doran's Shield into aggressive lane"},
            {"phase": "First Back", "items": [1028, 3010], "description": "Ruby Crystal → build toward Sunfire"},
            {"phase": "Core", "items": [3068, 3047],
             "description": "Sunfire + Steelcaps massively reduces Darius bleed damage"},
            {"phase": "Full Build", "items": [3110, 3065, 3143, 3075, 3001],
             "description": "Frozen Heart reduces his auto-attack damage, comboing with passive armor stacks"},
        ],
        "comp_notes": [
            "Frozen Heart is core — it directly reduces Darius's attack speed, weakening his bleed application.",
            "Your goal isn't to kill Darius — it's to survive lane and carry teamfights with your R.",
        ],
    },
    ("Garen", "TOP", "Malphite"): {
        "items": [3068, 3071, 3053, 3065, 3143, 6632],
        "boots": 3047,
        "win_rate": 0.529,
        "sample_size": 4562,
        "build_order": [
            {"phase": "Start", "items": [1054, 2003], "description": "Doran's Shield — mirror start"},
            {"phase": "First Back", "items": [1028, 3067], "description": "Build toward Sunfire and BC"},
            {"phase": "Core", "items": [3068, 3071, 3047],
             "description": "Sunfire DoT + Black Cleaver armor shred counters Malphite's passive"},
            {"phase": "Full Build", "items": [3053, 3065, 3143, 6632],
             "description": "Divine Sunderer bonus HP damage is crucial vs his stacked HP pool"},
        ],
        "comp_notes": [
            "Malphite's passive shield regens at 10% max HP — poke it down before trading.",
            "Divine Sunderer deals % max HP damage on every Q reset — essential here.",
        ],
    },
    # ── SUPPORT ─────────────────────────────────────────────────────────────
    ("Thresh", "SUPPORT", "Nautilus"): {
        "items": [3190, 3109, 3065, 3143, 3075, 3107],
        "boots": 3111,
        "win_rate": 0.524,
        "sample_size": 5890,
        "build_order": [
            {"phase": "Start", "items": [3858, 2003], "description": "Relic Shield for shared gold"},
            {"phase": "First Back", "items": [3869], "description": "World Atlas for vision control"},
            {"phase": "Core", "items": [3190, 3111],
             "description": "Locket + Mercs — Nautilus has heavy CC chains, tenacity is vital"},
            {"phase": "Full Build", "items": [3109, 3065, 3143, 3075, 3107],
             "description": "Redemption provides healing burst in engages"},
        ],
        "comp_notes": [
            "Both you and Nautilus have point-and-click CC — hook first to force his flash.",
            "Mercury's Treads are mandatory — his R + E + Q chain has 4+ seconds of CC.",
        ],
    },
    # ── JUNGLE ──────────────────────────────────────────────────────────────
    ("Vi", "JUNGLE", "Lee Sin"): {
        "items": [6632, 3071, 3053, 3065, 3143, 3068],
        "boots": 3047,
        "win_rate": 0.518,
        "sample_size": 4562,
        "build_order": [
            {"phase": "Start", "items": [1039, 2031], "description": "Hailblade + Refillable Potion"},
            {"phase": "First Back", "items": [3715], "description": "Stalker's Blade into Divine Rush"},
            {"phase": "Core", "items": [6632, 3047],
             "description": "Divine Sunderer + Steelcaps — Lee Sin players go full AD; armor is your shield"},
            {"phase": "Full Build", "items": [3071, 3053, 3065, 3143, 3068],
             "description": "Full tank lets you absorb Lee Sin's burst and still one-shot carries"},
        ],
        "comp_notes": [
            "Lee Sin falls off after 2 items — outlast him in the mid game.",
            "Armor items specifically counter his Q + insec combo damage.",
        ],
    },
}

# ---------------------------------------------------------------------------
# Comp analysis helpers
# ---------------------------------------------------------------------------


def _comp_hash(team: list[str]) -> str:
    return hashlib.md5(json.dumps(sorted(team)).encode()).hexdigest()[:8]


def _analyze_comp(team: list[str]) -> dict[str, Any]:
    ap = sum(1 for c in team if c in _AP_CHAMPIONS)
    tanks = sum(1 for c in team if c in _TANK_CHAMPIONS)
    assassins = sum(1 for c in team if c in _ASSASSIN_CHAMPIONS)
    ad = len(team) - ap

    return {
        "ap_count": ap,
        "ad_count": ad,
        "tank_count": tanks,
        "assassin_count": assassins,
        "heavy_ap": ap >= 3,
        "heavy_ad": ad >= 3,
        "heavy_tanks": tanks >= 2,
        "assassin_heavy": assassins >= 2,
    }


def _adjust_for_comp(items: list[int], boots: int, comp: dict) -> tuple[list[int], int]:
    adjusted_items = items.copy()
    adjusted_boots = boots

    # If enemy is heavy AP, prefer Mercs over Steelcaps
    if comp["heavy_ap"] and adjusted_boots == 3047:
        adjusted_boots = 3111

    # If enemy is heavy AD, prefer Steelcaps over Mercs
    if comp["heavy_ad"] and adjusted_boots == 3111:
        adjusted_boots = 3047

    return adjusted_items, adjusted_boots


# ---------------------------------------------------------------------------
# Build notes generation
# ---------------------------------------------------------------------------

def _generate_comp_notes(
    comp: dict, existing_notes: list[str]
) -> list[str]:
    notes = list(existing_notes)

    if comp["heavy_ap"] and not any("AP" in n for n in notes):
        notes.append(
            f"Enemy has {comp['ap_count']} AP damage sources — Mercury's Treads prioritized."
        )
    if comp["heavy_tanks"] and not any("tank" in n.lower() for n in notes):
        notes.append(
            f"Enemy has {comp['tank_count']} tanks — armor penetration items are essential."
        )
    if comp["assassin_heavy"] and not any("assassin" in n.lower() for n in notes):
        notes.append(
            f"Enemy has {comp['assassin_count']} assassins — shields/health items recommended."
        )

    return notes[:4]


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


async def recommend_build(
    champion: str,
    role: str,
    lane_opponent: str,
    ally_team: list[str],
    enemy_team: list[str],
) -> dict[str, Any]:
    """
    Return the single optimal build for the given matchup context.
    Priority: aggregated DB data → seeded matchup data → generic fallback.
    """
    # Lazy import to avoid circular dependency at module load time
    from app.services.build_aggregator import get_build_for_champion_role

    # Normalize
    champion = champion.strip().title()
    role = role.strip().upper()
    lane_opponent = lane_opponent.strip().title()

    comp = _analyze_comp(enemy_team)
    hash_val = _comp_hash(enemy_team + ally_team)

    # ---- 1. Aggregated real-game data (highest priority) ------------------
    agg = await get_build_for_champion_role(champion, role)
    if agg:
        items, boots = _adjust_for_comp(
            agg["items"],
            agg["boots"] or 3006,
            comp,
        )
        has_teams = bool(ally_team or enemy_team)
        final_notes = _generate_comp_notes(comp, []) if has_teams else []

        return {
            "champion": champion,
            "role": role,
            "lane_opponent": lane_opponent,
            "items": items,
            "boots": boots,
            "win_rate": agg["win_rate"],
            "sample_size": agg["sample_size"],
            "confidence": min(0.9, agg["sample_size"] / 500),
            "build_order": [],
            "comp_notes": final_notes,
            "comp_hash": hash_val if has_teams else "",
            "data_source": "aggregated",
        }

    # ---- 2. Seeded matchup data -------------------------------------------
    seed = SEEDED_BUILDS.get((champion, role, lane_opponent))

    if not seed:
        for (c, r, _), v in SEEDED_BUILDS.items():
            if c == champion and r == role:
                seed = v
                break

    if seed:
        items, boots = _adjust_for_comp(seed["items"], seed["boots"], comp)
        base_notes = seed.get("comp_notes", [])
        final_notes = _generate_comp_notes(comp, base_notes)

        return {
            "champion": champion,
            "role": role,
            "lane_opponent": lane_opponent,
            "items": items,
            "boots": boots,
            "win_rate": seed["win_rate"],
            "sample_size": seed["sample_size"],
            "confidence": min(1.0, seed["sample_size"] / 500),
            "build_order": seed["build_order"],
            "comp_notes": final_notes,
            "comp_hash": hash_val,
            "data_source": "seeded",
        }

    # ---- 3. Generic fallback ---------------------------------------------
    fallback_notes = _generate_comp_notes(comp, [])
    return {
        "champion": champion,
        "role": role,
        "lane_opponent": lane_opponent,
        "items": [3031, 3085, 3094, 3046, 3036, 3072],
        "boots": 3006,
        "win_rate": 0.505,
        "sample_size": 0,
        "confidence": 0.1,
        "build_order": [
            {"phase": "Start", "items": [1055, 2003],
             "description": "Standard Doran's Blade start"},
            {"phase": "Core", "items": [3031, 3006],
             "description": "Infinity Edge power spike"},
            {"phase": "Full Build", "items": [3085, 3094, 3046, 3036, 3072],
             "description": "Optimal full build for teamfighting"},
        ],
        "comp_notes": fallback_notes or [
            "No matchup-specific data available — showing highest overall win-rate build."
        ],
        "comp_hash": hash_val,
        "data_source": "fallback",
    }
