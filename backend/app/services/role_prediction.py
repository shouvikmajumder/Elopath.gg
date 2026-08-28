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
# carries Smite.  Equivalent to multiplying the raw playrate by e^20 ≈ 5e8,
# which guarantees JUNGLE even for a high-playrate BOT carry (e.g. Caitlyn,
# playrate ~8.955 → log-score 2.19).  The minimum required bonus is ~16 given
# current data; 20.0 provides headroom for future patches.
_SMITE_JUNGLE_BONUS: float = 20.0

# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def predict_team_roles(
    champion_ids: list[int],
    smite_flags: list[bool],
) -> list[str]:
    """Return a positional list of assigned roles for a single team.

    Parameters
    ----------
    champion_ids:
        The five champion IDs for this team, in participant order.
    smite_flags:
        Parallel list of booleans; True means this participant has Smite.
        Must be the same length as ``champion_ids``.

    Returns
    -------
    list[str]
        A list of the same length as ``champion_ids`` where each element is
        one of TOP / JUNGLE / MIDDLE / BOTTOM / UTILITY, in the same
        positional order as the input list.  Returns ``[]`` when
        ``champion_ids`` does not have exactly 5 entries.

    Raises
    ------
    ValueError
        If ``smite_flags`` is not the same length as ``champion_ids``.

    Notes
    -----
    - If ``champion_ids`` does not have exactly 5 entries the function
      returns ``[]`` (caller treats missing entries as position=None).
    - Using a positional list instead of a dict-by-champion-ID means
      duplicate champion IDs on the same team are each assigned their own
      role independently, preventing the second participant from clobbering
      the first.
    - Smite carriers get a large log-space bonus towards JUNGLE so that
      role is virtually guaranteed regardless of playrate.
    """
    if len(champion_ids) != 5:
        return []

    if len(smite_flags) != len(champion_ids):
        raise ValueError(
            f"smite_flags length ({len(smite_flags)}) must match "
            f"champion_ids length ({len(champion_ids)})"
        )

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

    # Return positionally (same order as champion_ids).  Using a list instead
    # of a dict-by-champion-ID correctly handles duplicate champ IDs on one
    # team — each participant index gets its own assigned role.
    return list(best_perm)