# backend/app/data

`champion_roles.json` is a vendored, per-patch flat map of `{ "<championId>": { "TOP": <playRate>, "JUNGLE": <playRate>, "MIDDLE": <playRate>, "BOTTOM": <playRate>, "UTILITY": <playRate> } }` for every champion.  The values are the per-champion play rates sourced from Meraki Analytics at `http://cdn.merakianalytics.com/riot/lol/resources/latest/en-US/championrates.json`.  This endpoint is updated by Meraki each patch; to refresh the vendored file after a patch, run:

```
python app/data/pull_championrates.py
```
