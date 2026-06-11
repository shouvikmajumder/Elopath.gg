import type { RankedStats } from '../types'

interface RankedBadgeProps {
  ranked: RankedStats | null
}

const TIER_COLORS: Record<string, string> = {
  IRON: 'text-ink-3',
  BRONZE: 'text-[#A0683C]',
  SILVER: 'text-[#9FAEB8]',
  GOLD: 'text-gold',
  PLATINUM: 'text-[#4CC8B0]',
  EMERALD: 'text-[#34C77B]',
  DIAMOND: 'text-blue',
  MASTER: 'text-[#C065E0]',
  GRANDMASTER: 'text-loss',
  CHALLENGER: 'text-[#F0D590]',
}

function tierLabel(tier: string): string {
  return tier.charAt(0) + tier.slice(1).toLowerCase()
}

export default function RankedBadge({ ranked }: RankedBadgeProps) {
  if (!ranked) {
    return (
      <div className="border border-[#2A3147] bg-surface-2 px-4 py-2.5">
        <p className="font-cinzel font-semibold text-ink-2 text-sm">Unranked</p>
        <p className="font-rajdhani text-xs text-ink-3 mt-0.5">No ranked solo/duo data</p>
      </div>
    )
  }

  const { tier, rank, league_points, wins, losses, win_rate } = ranked
  const colorClass = TIER_COLORS[tier.toUpperCase()] ?? 'text-ink'

  return (
    <div className="border border-[#2A3147] bg-surface-2 px-4 py-2.5">
      <p className={`font-cinzel font-bold text-sm tracking-wide ${colorClass}`}>
        {tierLabel(tier)} {rank}
      </p>
      <p className="font-rajdhani text-xs text-ink-2 mt-0.5">
        {league_points} LP
      </p>
      <p className="font-rajdhani text-xs text-ink-3 mt-1">
        {wins}W {losses}L · <span className={win_rate >= 50 ? 'text-win' : 'text-loss'}>{win_rate.toFixed(1)}% WR</span>
      </p>
    </div>
  )
}
