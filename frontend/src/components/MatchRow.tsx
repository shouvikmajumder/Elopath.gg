import type { MatchSummary } from '../types'
import { formatDuration, formatRelativeTime, queueName, roleDisplay } from '../utils/format'

interface MatchRowProps {
  match: MatchSummary
}

export default function MatchRow({ match }: MatchRowProps) {
  const {
    champion, champion_icon, win, kills, deaths, assists, kda,
    cs, game_duration, game_creation, queue_id, role,
  } = match

  return (
    <div
      className={`
        flex items-center gap-4 px-4 py-3 border-l-4 bg-surface-1 border-y border-r border-[#2A3147]
        ${win ? 'border-l-win bg-win/5' : 'border-l-loss bg-loss/5'}
      `}
    >
      {/* Queue + result + time */}
      <div className="hidden sm:flex flex-col items-start w-24 flex-shrink-0">
        <span className="font-rajdhani text-xs font-semibold text-ink-2 tracking-wider uppercase truncate w-full">
          {queueName(queue_id)}
        </span>
        <span className={`font-cinzel text-xs font-bold ${win ? 'text-win' : 'text-loss'}`}>
          {win ? 'Victory' : 'Defeat'}
        </span>
        <span className="font-rajdhani text-xs text-ink-3">
          {formatRelativeTime(game_creation)}
        </span>
      </div>

      {/* Champion icon */}
      <div className="flex-shrink-0 relative">
        <img
          src={champion_icon}
          alt={champion}
          className="w-12 h-12 border border-[#2A3147] object-cover"
        />
      </div>

      {/* Champion + role */}
      <div className="min-w-0 w-28 flex-shrink-0">
        <p className="font-rajdhani font-semibold text-ink text-sm truncate">{champion}</p>
        <p className="font-rajdhani text-xs text-ink-3 tracking-wider uppercase">
          {roleDisplay(role)}
        </p>
      </div>

      {/* KDA */}
      <div className="flex-shrink-0 w-32">
        <p className="font-rajdhani text-sm text-ink">
          <span className="font-semibold">{kills}</span>
          <span className="text-ink-3"> / </span>
          <span className="font-semibold text-loss">{deaths}</span>
          <span className="text-ink-3"> / </span>
          <span className="font-semibold">{assists}</span>
        </p>
        <p className="font-rajdhani text-xs text-gold">
          {kda.toFixed(2)} KDA
        </p>
      </div>

      {/* CS */}
      <div className="hidden md:block flex-shrink-0 w-16">
        <p className="font-rajdhani text-sm text-ink">{cs} CS</p>
        <p className="font-rajdhani text-xs text-ink-3">
          {(cs / (game_duration / 60)).toFixed(1)}/min
        </p>
      </div>

      {/* Duration */}
      <div className="ml-auto flex-shrink-0 text-right">
        <p className="font-rajdhani text-sm text-ink-2">{formatDuration(game_duration)}</p>
        <p className="sm:hidden font-rajdhani text-xs text-ink-3">
          {formatRelativeTime(game_creation)}
        </p>
      </div>
    </div>
  )
}
