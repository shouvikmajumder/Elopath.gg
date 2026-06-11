from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from app.services.build_engine import recommend_build
from app.services import data_dragon as dd
from app.services.build_analyst import analyze_match_build
from app.db.database import get_cached_analysis, save_analysis

router = APIRouter()

VALID_ROLES = {"TOP", "JUNGLE", "MID", "ADC", "SUPPORT"}


class BuildRequest(BaseModel):
    champion: str = Field(..., min_length=1, max_length=50)
    role: str = Field(..., min_length=2, max_length=10)
    lane_opponent: str = Field(..., min_length=1, max_length=50)
    ally_team: list[str] = Field(default_factory=list, max_length=4)
    enemy_team: list[str] = Field(default_factory=list, max_length=4)


@router.post("/recommend")
async def get_build_recommendation(req: BuildRequest):
    role = req.role.upper()
    if role not in VALID_ROLES:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid role '{req.role}'. Must be one of: {', '.join(VALID_ROLES)}",
        )

    build = recommend_build(
        champion=req.champion,
        role=role,
        lane_opponent=req.lane_opponent,
        ally_team=req.ally_team,
        enemy_team=req.enemy_team,
    )

    # Enrich with item metadata from Data Dragon
    try:
        version = await dd.get_version()
        items_data = await dd.get_items()
        enriched_items = []
        for item_id in build["items"]:
            item_meta = items_data.get(str(item_id), {})
            enriched_items.append({
                "id": item_id,
                "name": item_meta.get("name", f"Item {item_id}"),
                "description": item_meta.get("plaintext", ""),
                "gold": item_meta.get("gold", {}).get("total", 0),
                "icon": dd.item_icon_url(item_id, version),
            })

        boots_meta = items_data.get(str(build["boots"]), {})
        enriched_boots = {
            "id": build["boots"],
            "name": boots_meta.get("name", f"Item {build['boots']}"),
            "description": boots_meta.get("plaintext", ""),
            "gold": boots_meta.get("gold", {}).get("total", 0),
            "icon": dd.item_icon_url(build["boots"], version),
        }

        return {
            **build,
            "items": enriched_items,
            "boots": enriched_boots,
            "version": version,
        }
    except Exception:
        # Return without enrichment if Data Dragon is unavailable
        return build


@router.get("/analyze/{platform}/{match_id}")
async def get_match_build_analysis(platform: str, match_id: str, puuid: str):
    cached = await get_cached_analysis(match_id, puuid)
    if cached:
        return cached

    try:
        result = await analyze_match_build(platform, match_id, puuid)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

    await save_analysis(match_id, puuid, result)
    return result


@router.get("/seeded-champions")
async def get_seeded_champions():
    """Returns which champions have seeded build data available."""
    from app.services.build_engine import SEEDED_BUILDS
    result = {}
    for (champion, role, opponent) in SEEDED_BUILDS:
        if champion not in result:
            result[champion] = {"roles": set(), "matchups": []}
        result[champion]["roles"].add(role)
        result[champion]["matchups"].append({"role": role, "opponent": opponent})

    return {
        k: {"roles": list(v["roles"]), "matchups": v["matchups"]}
        for k, v in result.items()
    }
