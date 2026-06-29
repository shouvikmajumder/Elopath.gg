import { useState } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'
import type { MatchDetailResponse, MatchParticipant, ItemSlot, BuildAnalysisResponse } from '../types'
import { roleDisplay } from '../utils/format'
import { fetchBuildAnalysis } from '../services/api'
import BuildAnalysisPanel from './BuildAnalysisPanel'

interface MatchDetailProps {
  data: MatchDetailResponse
  currentPuuid: string
  platform: string
}

interface TeamColumnProps {
  participants: MatchParticipant[]
  side: 'blue' | 'red'
  currentPuuid: string
}

function ItemSlotCell({ slot }: { slot: ItemSlot | null }) {
  if (!slot) {
    return (
      <div
        className="w-8 h-8 flex-shrink-0 border border-[#2A3147] bg-surface-2"
        aria-hidden="true"
      />
    )
  }
  return (
    <img
      src={slot.icon}
      alt={slot.name}
      title={slot.name}
      className="w-8 h-8 flex-shrink-0 border border-[#2A3147] object-cover"
    />
  )
}

function ParticipantRow({
  participant,
  isCurrentUser,
}: {
  participant: MatchParticipant
  isCurrentUser: boolean
}) {
  return (
    <div
      className={`
        flex flex-col gap-1.5 px-3 py-2
        ${isCurrentUser ? 'border-l-2 border-gold bg-gold/5' : 'border-l-2 border-transparent'}
      `}
    >
      {/* Top line: icon, name, role, KDA, CS */}
      <div className="flex items-center gap-2 min-w-0">
        <img
          src={participant.champion_icon}
          alt={participant.champion}
          title={participant.champion}
          className="w-8 h-8 flex-shrink-0 border border-[#2A3147] object-cover"
        />
        <div className="min-w-0 flex-1">
          <p
            className={`
              font-rajdhani text-xs font-semibold truncate
              ${isCurrentUser ? 'text-gold' : 'text-ink'}
            `}
          >
            {participant.summoner_name}
          </p>
          {roleDisplay(participant.role) && (
            <span className="font-rajdhani text-[10px] text-ink-3 tracking-wider uppercase">
              {roleDisplay(participant.role)}
            </span>
          )}
        </div>
        <div className="flex-shrink-0 text-right">
          <p className="font-rajdhani text-xs text-ink leading-none">
            <span className="font-semibold">{participant.kills}</span>
            <span className="text-ink-3">/</span>
            <span className="font-semibold text-loss">{participant.deaths}</span>
            <span className="text-ink-3">/</span>
            <span className="font-semibold">{participant.assists}</span>
          </p>
          <p className="font-rajdhani text-[10px] text-ink-3 leading-none mt-0.5">
            {participant.cs} CS
          </p>
        </div>
      </div>

      {/* Items row */}
      <div className="flex items-center gap-0.5" role="list" aria-label="Items">
        {participant.items.map((slot, idx) => (
          <div key={idx} role="listitem">
            <ItemSlotCell slot={slot} />
          </div>
        ))}
      </div>
    </div>
  )
}

function TeamColumn({ participants, side, currentPuuid }: TeamColumnProps) {
  const isBlue = side === 'blue'
  return (
    <div className="flex-1 min-w-0">
      <div
        className={`
          px-3 py-1.5 border-b border-[#2A3147]
          ${isBlue ? 'bg-blue-950/40' : 'bg-red-950/40'}
        `}
      >
        <span
          className={`
            font-playfair text-xs font-bold tracking-[0.2em] uppercase
            ${isBlue ? 'text-blue-400' : 'text-loss'}
          `}
        >
          {isBlue ? 'Blue Team' : 'Red Team'}
        </span>
      </div>
      <div className="divide-y divide-[#2A3147]/50">
        {participants.map(p => (
          <ParticipantRow
            key={p.puuid}
            participant={p}
            isCurrentUser={p.puuid === currentPuuid}
          />
        ))}
      </div>
    </div>
  )
}

export default function MatchDetail({ data, currentPuuid, platform }: MatchDetailProps) {
  const [showAnalysis, setShowAnalysis] = useState(false)
  const [analysis, setAnalysis] = useState<BuildAnalysisResponse | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisError, setAnalysisError] = useState<string | null>(null)

  async function handleAnalyze() {
    if (analysis) {
      setShowAnalysis(prev => !prev)
      return
    }
    setShowAnalysis(true)
    setIsAnalyzing(true)
    setAnalysisError(null)
    try {
      const result = await fetchBuildAnalysis(platform, data.match_id, currentPuuid)
      setAnalysis(result)
    } catch {
      setAnalysisError('Build analysis failed. Please try again.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <div className="border-b border-x border-[#2A3147] bg-surface">
      {/* Two-column layout: side by side on sm+, stacked on mobile */}
      <div className="flex flex-col sm:flex-row sm:divide-x divide-[#2A3147]">
        <TeamColumn
          participants={data.blue_team}
          side="blue"
          currentPuuid={currentPuuid}
        />
        <TeamColumn
          participants={data.red_team}
          side="red"
          currentPuuid={currentPuuid}
        />
      </div>

      {/* Analyze build footer */}
      <div className="border-t border-[#2A3147] px-4 py-2 flex items-center justify-between">
        <button
          onClick={handleAnalyze}
          disabled={isAnalyzing}
          className="flex items-center gap-1.5 font-rajdhani text-xs font-semibold text-gold border border-gold/40 px-3 py-1 hover:bg-gold/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Sparkles size={12} />
          {isAnalyzing ? 'Analyzing...' : showAnalysis && analysis ? 'Hide Analysis' : 'Analyze My Build'}
        </button>
      </div>

      {showAnalysis && (
        <div>
          {isAnalyzing && (
            <div className="border-t border-[#2A3147] bg-surface flex items-center justify-center py-6 gap-2">
              <Loader2 className="w-4 h-4 text-gold animate-spin" />
              <span className="font-rajdhani text-xs text-ink-3">Claude is analyzing your build...</span>
            </div>
          )}
          {analysisError && !isAnalyzing && (
            <div className="border-t border-[#2A3147] px-4 py-3">
              <p className="font-rajdhani text-xs text-loss">{analysisError}</p>
            </div>
          )}
          {analysis && !isAnalyzing && <BuildAnalysisPanel data={analysis} />}
        </div>
      )}
    </div>
  )
}
