import type { ChampionStat } from '../types'

interface ChampionStatCardProps {
  stat: ChampionStat
}

export default function ChampionStatCard({ stat }: ChampionStatCardProps) {
  const { champion, champion_icon, games, wins, losses, win_rate } = stat

  return (
    <div className="flex items-center gap-3 px-4 py-3 border border-[#2A3147] bg-surface-1">
      <img
        src={champion_icon}
        alt={champion}
        className="w-10 h-10 border border-[#2A3147] object-cover flex-shrink-0"
      />
      <div className="min-w-0 flex-1">
        <p className="font-rajdhani font-semibold text-ink text-sm truncate">{champion}</p>
        <p className="font-rajdhani text-xs text-ink-3">
          {games} game{games === 1 ? '' : 's'} · {wins}W {losses}L
        </p>
      </div>
      <div className="flex-shrink-0 text-right">
        <p className={`font-cinzel font-bold text-sm ${win_rate >= 50 ? 'text-win' : 'text-loss'}`}>
          {win_rate.toFixed(1)}%
        </p>
        <p className="font-rajdhani text-[10px] text-ink-3 tracking-wider uppercase">Win Rate</p>
      </div>
    </div>
  )
}
