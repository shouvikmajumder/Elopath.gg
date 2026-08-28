"""
pull_championrates.py
---------------------
Fetches the latest champion play-rate data from Meraki Analytics and writes
`champion_roles.json` in this directory.  Run once per patch to keep the
vendored dataset current:

    python app/data/pull_championrates.py

Source URL: https://cdn.merakianalytics.com/riot/lol/resources/latest/en-US/championrates.json
"""

import json
import urllib.request
from pathlib import Path

MERAKI_URL = (
    "https://cdn.merakianalytics.com/riot/lol/resources/latest/en-US/championrates.json"
)
ROLES = ("TOP", "JUNGLE", "MIDDLE", "BOTTOM", "UTILITY")
OUT_PATH = Path(__file__).parent / "champion_roles.json"


def main() -> None:
    print(f"Fetching {MERAKI_URL} ...")
    with urllib.request.urlopen(MERAKI_URL, timeout=20) as resp:  # noqa: S310
        raw: dict = json.loads(resp.read())

    patch: str = raw.get("patch", "unknown")
    champ_data: dict = raw.get("data", {})

    transformed: dict[str, dict[str, float]] = {
        champ_id: {
            role: role_data.get(role, {}).get("playRate", 0.0) for role in ROLES
        }
        for champ_id, role_data in champ_data.items()
    }

    with OUT_PATH.open("w", encoding="utf-8") as fh:
        json.dump(transformed, fh, indent=2)

    print(
        f"Wrote {len(transformed)} champions for patch {patch} -> {OUT_PATH}"
    )


if __name__ == "__main__":
    main()
