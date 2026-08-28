import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import type { LiveGameData, LiveGameParticipant } from '../types'

type KnownPosition = 'TOP' | 'JUNGLE' | 'MIDDLE' | 'BOTTOM' | 'UTILITY'

const ROLE_LABEL: Record<KnownPosition, string> = {
  TOP: 'TOP',
  JUNGLE: 'JG',
  MIDDLE: 'MID',
  BOTTOM: 'BOT',
  UTILITY: 'SUP',
}

const ROLE_ORDER: Record<KnownPosition, number> = {
  TOP: 0,
  JUNGLE: 1,
  MIDDLE: 2,
  BOTTOM: 3,
  UTILITY: 4,
}

function getRoleLabel(position: string | null): string | null {
  if (position === null) return null
  return ROLE_LABEL[position as KnownPosition] ?? null
}

function getRoleOrder(position: string | null): number {
  if (position === null) return 99
  return ROLE_ORDER[position as KnownPosition] ?? 99
}

function sortByLane(participants: LiveGameParticipant[]): LiveGameParticipant[] {
  return [...participants].sort((a, b) => getRoleOrder(a.position) - getRoleOrder(b.position))
}

interface LiveGameBannerProps {
  liveGame: LiveGameData
  summonerPuuid: string
  platform: string
}

function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

interface ParticipantCardProps {
  participant: LiveGameParticipant
  isCurrentSummoner: boolean
  platform: string
}

function ParticipantCard({ participant, isCurrentSummoner, platform }: ParticipantCardProps) {
  const [gameName, tagLine] = participant.summoner_name.split('#')
  const profileHref = gameName && tagLine
    ? `/summoner/${platform}/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`
    : null

  return (
    <div
      className={`
        flex items-center gap-2 px-2 py-1.5 border
        ${isCurrentSummoner
          ? 'border-gold bg-gold/10'
          : 'border-[#2A3147] bg-surface-2'}
      `}
    >
      <img
        src={participant.champion_icon_url}
        alt={participant.champion_name}
        className={`w-8 h-8 object-cover flex-shrink-0 border ${isCurrentSummoner ? 'border-gold' : 'border-[#2A3147]'}`}
      />
      <div className="min-w-0 flex-1">
        {profileHref ? (
          <Link
            to={profileHref}
            className={`font-rajdhani text-xs font-semibold truncate block hover:underline ${isCurrentSummoner ? 'text-gold' : 'text-ink hover:text-gold'}`}
          >
            {participant.summoner_name}
          </Link>
        ) : (
          <p className={`font-rajdhani text-xs font-semibold truncate ${isCurrentSummoner ? 'text-gold' : 'text-ink'}`}>
            {participant.summoner_name}
          </p>
        )}
        <p className="font-rajdhani text-[10px] text-ink-3 truncate">
          {participant.champion_name}
          {getRoleLabel(participant.position) !== null && (
            <span className="inline-block ml-1 px-1 py-0.5 bg-[#2A3147] font-rajdhani text-[9px] text-ink-3 uppercase tracking-wider leading-none rounded-sm">
              {getRoleLabel(participant.position)}
            </span>
          )}
        </p>
      </div>
    </div>
  )
}

interface TeamColumnProps {
  label: string
  labelColorClass: string
  borderColorClass: string
  participants: LiveGameParticipant[]
  summonerPuuid: string
  platform: string
}

function TeamColumn({ label, labelColorClass, borderColorClass, participants, summonerPuuid, platform }: TeamColumnProps) {
  return (
    <div className="flex-1 min-w-0">
      <p className={`font-playfair font-bold text-xs tracking-[0.2em] uppercase mb-2 ${labelColorClass} border-b ${borderColorClass} pb-1`}>
        {label}
      </p>
      <div className="space-y-1">
        {participants.map(p => (
          <ParticipantCard
            key={p.puuid}
            participant={p}
            isCurrentSummoner={p.puuid === summonerPuuid}
            platform={platform}
          />
        ))}
      </div>
    </div>
  )
}

export default function LiveGameBanner({ liveGame, summonerPuuid, platform }: LiveGameBannerProps) {
  const gameStarted = liveGame.game_start_time > 0
  const [elapsed, setElapsed] = useState<number>(
    gameStarted ? Date.now() - liveGame.game_start_time : 0
  )

  useEffect(() => {
    if (!gameStarted) return
    setElapsed(Date.now() - liveGame.game_start_time)
    const id = setInterval(() => {
      setElapsed(Date.now() - liveGame.game_start_time)
    }, 1000)
    return () => clearInterval(id)
  }, [liveGame.game_start_time, gameStarted])

  const blueTeam = sortByLane(liveGame.participants.filter(p => p.team_id === 100))
  const redTeam = sortByLane(liveGame.participants.filter(p => p.team_id === 200))

  return (
    <div className="border border-[#2A3147] bg-surface-1 animate-fade-up">
      {/* Header bar */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-[#2A3147] bg-surface-2">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-loss animate-pulse flex-shrink-0" aria-hidden="true" />
          <span className="font-playfair font-bold text-xs tracking-[0.2em] uppercase text-loss">
            Live
          </span>
        </span>
        <span className="font-rajdhani text-xs text-ink-3 tracking-wider uppercase">
          {liveGame.game_mode}
        </span>
        <span className="ml-auto font-rajdhani font-semibold text-sm text-ink tabular-nums">
          {gameStarted ? formatElapsed(elapsed) : 'Starting...'}
        </span>
      </div>

      {/* Team columns */}
      <div className="flex gap-3 p-4">
        <TeamColumn
          label="Blue Side"
          labelColorClass="text-blue"
          borderColorClass="border-blue/30"
          participants={blueTeam}
          summonerPuuid={summonerPuuid}
          platform={platform}
        />
        <div className="w-px bg-[#2A3147] flex-shrink-0 self-stretch" aria-hidden="true" />
        <TeamColumn
          label="Red Side"
          labelColorClass="text-loss"
          borderColorClass="border-loss/30"
          participants={redTeam}
          summonerPuuid={summonerPuuid}
          platform={platform}
        />
      </div>
    </div>
  )
}
