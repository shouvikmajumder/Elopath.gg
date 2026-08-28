"""
role_prediction.py
------------------
Predicts the lane role (TOP/JUNGLE/MIDDLE/BOTTOM/UTILITY) for each champion
on a single team using a maximum-likelihood assignment over all 5! = 120
permutations of roles.

The playrate table is vendored in app/data/champion_roles.json and loaded
once at import time — no network calls at request time.
"""

import itertools
import json
import math
from pathlib import Path

# ---------------------------------------------------------------------------
# Load vendored dataset at import time
# ---------------------------------------------------------------------------

_DATA_PATH = Path(__file__).parent.parent / "data" / "champion_roles.json"

with _DATA_PATH.open(encoding="utf-8") as _fh:
    # Keys in the JSON are string champion IDs; convert to int for convenience.
    _RAW: dict[str, dict[str, float]] = json.load(_fh)

CHAMPION_ROLES: dict[int, dict[str, float]] = {
    int(k): v for k, v in _RAW.items()
}

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

ROLES = ("TOP", "JUNGLE", "MIDDLE", "BOTTOM", "UTILITY")

# Epsilon floor avoids log(0) for zero/unknown playrates.
_EPSILON: float = 1e-6

# Log-space bonus added to a champion's JUNGLE pairing when that champion
# carries Smite.  Equivalent to multiplying the raw playrate by e^10 ≈ 22026,
# which is large enough to dominate any other role assignment.
_SMITE_JUNGLE_BONUS: float = 10.0

# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def predict_team_roles(
    champion_ids: list[int],
    smite_flags: list[bool],
) -> dict[int, str]:
    """Return a mapping of champion_id -> assigned role for a single team.

    Parameters
    ----------
    champion_ids:
        The five champion IDs for this team, in participant order.
    smite_flags:
        Parallel list of booleans; True means this participant has Smite.

    Returns
    -------
    dict[int, str]
        Keys are the input champion IDs; values are one of
        TOP / JUNGLE / MIDDLE / BOTTOM / UTILITY.

    Notes
    -----
    - If ``champion_ids`` does not have exactly 5 entries the function
      returns ``{}`` (caller treats missing entries as position=None).
    - When two participants share the same champion ID the assignment is
      done positionally (indices), then keyed back to champion IDs.  The
      last index wins if there are true duplicates, which is fine for
      display purposes.
    - Smite carriers get a large log-space bonus towards JUNGLE so that
      role is virtually guaranteed regardless of playrate.
    """
    if len(champion_ids) != 5:
        return {}

    n = len(champion_ids)

    # Build a score matrix: score[position_index][role] in log-space.
    def _log_score(champ_id: int, role: str, has_smite: bool) -> float:
        playrate = CHAMPION_ROLES.get(champ_id, {}).get(role, 0.0)
        score = math.log(max(playrate, _EPSILON))
        if has_smite and role == "JUNGLE":
            score += _SMITE_JUNGLE_BONUS
        return score

    best_score: float = float("-inf")
    best_perm: tuple[str, ...] = ROLES  # default fallback

    for role_perm in itertools.permutations(ROLES):
        total = sum(
            _log_score(champion_ids[i], role_perm[i], smite_flags[i])
            for i in range(n)
        )
        if total > best_score:
            best_score = total
            best_perm = role_perm

    # Map positionally first (handles duplicate champ IDs on one team).
    return {champion_ids[i]: best_perm[i] for i in range(n)}