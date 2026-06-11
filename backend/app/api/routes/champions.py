from fastapi import APIRouter, HTTPException
from app.services import data_dragon as dd

router = APIRouter()


@router.get("/")
async def list_champions():
    try:
        champions = await dd.get_champions()
        version = await dd.get_version()
        result = []
        for key, data in champions.items():
            result.append({
                "id": data["id"],
                "key": data["key"],
                "name": data["name"],
                "title": data["title"],
                "tags": data.get("tags", []),
                "icon": dd.champion_icon_url(data["id"], version),
                "splash": dd.champion_splash_url(data["id"]),
            })
        return {"version": version, "champions": sorted(result, key=lambda c: c["name"])}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Data Dragon unavailable: {e}")


@router.get("/version")
async def get_version():
    try:
        version = await dd.get_version()
        return {"version": version}
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.get("/{champion_id}")
async def get_champion(champion_id: str):
    try:
        champions = await dd.get_champions()
        version = await dd.get_version()
        data = champions.get(champion_id)
        if not data:
            raise HTTPException(status_code=404, detail="Champion not found")
        return {
            **data,
            "icon": dd.champion_icon_url(data["id"], version),
            "splash": dd.champion_splash_url(data["id"]),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))
