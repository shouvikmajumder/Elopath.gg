import { useState, useEffect } from 'react'
import { ChevronDown, Loader2 } from 'lucide-react'
import type { MatchSummary, MatchDetailResponse } from '../types'
import { fetchMatchDetail } from '../services/api'
import { formatDuration, formatRelativeTime, queueName, roleDisplay } from '../utils/format'
import MatchDetail from './MatchDetail'

interface MatchRowProps {
  match: MatchSummary
  platform: string
  currentPuuid: string
}

export default function MatchRow({ match, platform, currentPuuid }: MatchRowProps) {
  const {
    champion, champion_icon, win, kills, deaths, assists, kda,
    cs, game_duration, game_creation, queue_id, role, match_id,
  } = match

  const [isExpanded, setIsExpanded] = useState(false)
  const [detail, setDetail] = useState<MatchDetailResponse | null>(null)
  const [isFetching, setIsFetching] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    if (!isExpanded || detail !== null) return

    let cancelled = false
    setIsFetching(true)
    setFetchError(null)

    fetchMatchDetail(platform, match_id)
      .then(data => {
        if (!cancelled) setDetail(data)
      })
      .catch(() => {
        if (!cancelled) setFetchError('Failed to load match details.')
      })
      .finally(() => {
        if (!cancelled) setIsFetching(false)
      })

    return () => {
      cancelled = true
    }
  }, [isExpanded, detail, platform, match_id])

  return (
    <div>
      {/* Clickable row */}
      <div
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        onClick={() => setIsExpanded(prev => !prev)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setIsExpanded(prev => !prev)
          }
        }}
        className={`
          flex items-center gap-4 px-4 py-3 border-l-4 bg-surface-1
          border-y border-r border-[#2A3147]
          cursor-pointer select-none
          transition-opacity hover:opacity-90
          focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-[-2px]
          ${win ? 'border-l-win bg-win/5' : 'border-l-loss bg-loss/5'}
        `}
      >
        {/* Queue + result + time */}
        <div className="hidden sm:flex flex-col items-start w-24 flex-shrink-0">
          <span className="font-rajdhani text-xs font-semibold text-ink-2 tracking-wider uppercase truncate w-full">
            {queueName(queue_id)}
          </span>
          <span className={`font-playfair text-xs font-bold ${win ? 'text-win' : 'text-loss'}`}>
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

        {/* Duration + chevron */}
        <div className="ml-auto flex items-center gap-2 flex-shrink-0">
          <div className="text-right">
            <p className="font-rajdhani text-sm text-ink-2">{formatDuration(game_duration)}</p>
            <p className="sm:hidden font-rajdhani text-xs text-ink-3">
              {formatRelativeTime(game_creation)}
            </p>
          </div>
          <ChevronDown
            size={16}
            className={`
              text-ink-3 transition-transform duration-200 flex-shrink-0
              ${isExpanded ? 'rotate-180' : 'rotate-0'}
            `}
            aria-hidden="true"
          />
        </div>
      </div>

      {/* Expanded panel */}
      {isExpanded && (
        <div>
          {isFetching && (
            <div className="border-b border-x border-[#2A3147] bg-surface flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-gold animate-spin" />
            </div>
          )}
          {fetchError && !isFetching && (
            <div className="border-b border-x border-[#2A3147] bg-surface px-4 py-4">
              <p className="font-rajdhani text-sm text-loss">{fetchError}</p>
            </div>
          )}
          {detail && !isFetching && (
            <MatchDetail
              data={detail}
              currentPuuid={currentPuuid}
              platform={platform}
            />
          )}
        </div>
      )}
    </div>
  )
}
