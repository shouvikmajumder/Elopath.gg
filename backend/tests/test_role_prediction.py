"""
Tests for predict_team_roles in app.services.role_prediction.

Champion IDs used below are sourced from the vendored
backend/app/data/champion_roles.json and chosen because each has an
overwhelmingly dominant role:

  122 (Darius)      → TOP    (playrate ~3.335)
   64 (Lee Sin)     → JUNGLE (playrate ~4.96)
  157 (Yasuo)       → MIDDLE (playrate ~4.93)
   51 (Caitlyn)     → BOTTOM (playrate ~8.955)
  412 (Thresh)      → UTILITY(playrate ~6.756)

Tests are independent, deterministic, and make no network calls.
"""

import pytest

from app.services.role_prediction import predict_team_roles

# ---------------------------------------------------------------------------
# Champion IDs for each dominant role (from champion_roles.json)
# ---------------------------------------------------------------------------

CHAMP_TOP = 122     # Darius  → TOP    3.335
CHAMP_JG = 64       # Lee Sin → JUNGLE 4.96
CHAMP_MID = 157     # Yasuo   → MIDDLE 4.93
CHAMP_BOT = 51      # Caitlyn → BOTTOM 8.955
CHAMP_UTIL = 412    # Thresh  → UTILITY 6.756

# A standard 5-man team in participant order
STD_CHAMPS = [CHAMP_TOP, CHAMP_JG, CHAMP_MID, CHAMP_BOT, CHAMP_UTIL]
STD_SMITES = [False, False, False, False, False]
STD_SMITES_JG = [False, True, False, False, False]   # Lee Sin has smite


# ---------------------------------------------------------------------------
# 1. Standard 5-man comp — all five roles assigned exactly once
# ---------------------------------------------------------------------------

def test_standard_5man_returns_all_five_roles():
    """5 dominant-role champs → length-5 list containing each role exactly once."""
    result = predict_team_roles(STD_CHAMPS, STD_SMITES_JG)

    assert isinstance(result, list)
    assert len(result) == 5
    assert set(result) == {"TOP", "JUNGLE", "MIDDLE", "BOTTOM", "UTILITY"}


def test_standard_5man_correct_per_champion_role():
    """Each champion is assigned its dominant role."""
    result = predict_team_roles(STD_CHAMPS, STD_SMITES_JG)

    # champion order matches STD_CHAMPS
    assert result[0] == "TOP"      # Darius
    assert result[1] == "JUNGLE"   # Lee Sin (has smite, but would win anyway)
    assert result[2] == "MIDDLE"   # Yasuo
    assert result[3] == "BOTTOM"   # Caitlyn
    assert result[4] == "UTILITY"  # Thresh


# ---------------------------------------------------------------------------
# 2. Smite forces JUNGLE even on a non-jungle champion (bug 1 regression)
# ---------------------------------------------------------------------------

def test_smite_forces_jungle_on_bot_carry():
    """Caitlyn (high BOT playrate) with Smite must be assigned JUNGLE.

    Before the fix (_SMITE_JUNGLE_BONUS = 10.0), log(epsilon)+10 ≈ -3.8 was
    less than log(8.955) ≈ 2.19, so the optimizer could still assign BOT.
    With _SMITE_JUNGLE_BONUS = 20.0 the JUNGLE score (≈ 6.18) dominates.
    """
    # Team: TOP=Darius, MID=Yasuo, BOT=Caitlyn(smite), UTIL=Thresh + Ahri(103) fill
    champs = [CHAMP_TOP, 103, CHAMP_MID, CHAMP_BOT, CHAMP_UTIL]
    smites = [False, False, False, True, False]   # Caitlyn has smite

    result = predict_team_roles(champs, smites)

    assert isinstance(result, list)
    assert len(result) == 5
    assert result[3] == "JUNGLE", (
        f"Caitlyn with Smite should be JUNGLE, got {result[3]!r}. "
        f"Full result: {result}"
    )


# ---------------------------------------------------------------------------
# 3. Fewer than 5 participants → returns falsy []
# ---------------------------------------------------------------------------

def test_fewer_than_5_returns_empty():
    """len(champion_ids) < 5 → returns [] (falsy)."""
    result = predict_team_roles([CHAMP_TOP, CHAMP_JG, CHAMP_MID], [False, True, False])

    assert result == []
    assert not result  # confirm truthiness check matches caller convention


def test_zero_participants_returns_empty():
    """Empty champion list → returns []."""
    result = predict_team_roles([], [])

    assert result == []


# ---------------------------------------------------------------------------
# 4. More than 5 participants → returns falsy []
# ---------------------------------------------------------------------------

def test_more_than_5_returns_empty():
    """len(champion_ids) > 5 → returns []."""
    champs = STD_CHAMPS + [103]
    smites = STD_SMITES + [False]

    result = predict_team_roles(champs, smites)

    assert result == []


# ---------------------------------------------------------------------------
# 5. Unknown champion ID — no exception, still returns a length-5 list
# ---------------------------------------------------------------------------

def test_unknown_champion_id_no_exception():
    """An unknown champion ID falls back to epsilon and should not raise."""
    champs = [9999999, CHAMP_JG, CHAMP_MID, CHAMP_BOT, CHAMP_UTIL]
    smites = [False, True, False, False, False]

    result = predict_team_roles(champs, smites)

    assert isinstance(result, list)
    assert len(result) == 5
    assert set(result) == {"TOP", "JUNGLE", "MIDDLE", "BOTTOM", "UTILITY"}


def test_all_unknown_champion_ids_no_exception():
    """Five unknown champion IDs → still returns a 5-element list of roles."""
    champs = [9999991, 9999992, 9999993, 9999994, 9999995]
    smites = [False, False, False, False, False]

    result = predict_team_roles(champs, smites)

    assert isinstance(result, list)
    assert len(result) == 5
    # All unknowns → epsilon; any valid permutation is fine but set must be exact
    assert set(result) == {"TOP", "JUNGLE", "MIDDLE", "BOTTOM", "UTILITY"}


# ---------------------------------------------------------------------------
# 6. Duplicate champion IDs → length-5 list, no IndexError (bug 2 regression)
# ---------------------------------------------------------------------------

def test_duplicate_champion_ids_no_index_error():
    """Two participants with the same champion ID must not collapse (bug 2).

    Before the fix, the return type was dict[int, str], so the second entry
    silently overwrote the first, meaning only one role mapping survived.
    The list-based return ensures both positions get independent assignments.
    """
    # Two Caitlyns on the same team
    champs = [CHAMP_TOP, CHAMP_BOT, CHAMP_MID, CHAMP_BOT, CHAMP_UTIL]
    smites = [False, False, False, False, False]

    result = predict_team_roles(champs, smites)

    assert isinstance(result, list)
    assert len(result) == 5, (
        f"Duplicate champion IDs must still produce a length-5 list, got {result}"
    )
    # Both players should have some role (not None/missing)
    assert all(r in {"TOP", "JUNGLE", "MIDDLE", "BOTTOM", "UTILITY"} for r in result)


def test_all_same_champion_id_no_exception():
    """Extreme duplicate case: all 5 participants share one champion ID."""
    champs = [CHAMP_BOT] * 5
    smites = [False] * 5

    result = predict_team_roles(champs, smites)

    assert isinstance(result, list)
    assert len(result) == 5
    assert set(result) == {"TOP", "JUNGLE", "MIDDLE", "BOTTOM", "UTILITY"}


# ---------------------------------------------------------------------------
# 7. smite_flags length mismatch → raises ValueError (bug 3 regression)
# ---------------------------------------------------------------------------

def test_smite_flags_too_short_raises_value_error():
    """smite_flags shorter than champion_ids must raise ValueError."""
    with pytest.raises(ValueError, match="smite_flags length"):
        predict_team_roles(STD_CHAMPS, [False, False])  # 5 champs, 2 flags


def test_smite_flags_too_long_raises_value_error():
    """smite_flags longer than champion_ids must raise ValueError."""
    with pytest.raises(ValueError, match="smite_flags length"):
        predict_team_roles(STD_CHAMPS, [False] * 8)  # 5 champs, 8 flags


def test_smite_flags_empty_with_5_champs_raises_value_error():
    """Empty smite_flags with 5 champion_ids must raise ValueError."""
    with pytest.raises(ValueError, match="smite_flags length"):
        predict_team_roles(STD_CHAMPS, [])
