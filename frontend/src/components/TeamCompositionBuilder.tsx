import { useState } from 'react'
import { X, Plus } from 'lucide-react'
import ChampionSearch from './ChampionSearch'
import type { Champion, Role } from '../types'

interface TeamCompositionBuilderProps {
  laneOpponent: Champion | null
  allyTeam: Champion[]
  enemyTeam: Champion[]
  onLaneOpponentChange: (c: Champion | null) => void
  onAllyTeamChange: (team: Champion[]) => void
  onEnemyTeamChange: (team: Champion[]) => void
  myChampion: string
}

function ChampionSlot({
  champion,
  onRemove,
  onAdd,
  label,
  disabled,
}: {
  champion: Champion | null
  onRemove?: () => void
  onAdd?: (c: Champion) => void
  label?: string
  disabled?: boolean
}) {
  const [showSearch, setShowSearch] = useState(false)

  if (champion) {
    return (
      <div className="relative group">
        <div className="w-12 h-12 border border-gold-dark/40 overflow-hidden relative">
          <img
            src={champion.icon}
            alt={champion.name}
            className="w-full h-full object-cover"
            onError={e => (e.currentTarget.style.display = 'none')}
          />
          <button
            onClick={onRemove}
            className="absolute inset-0 bg-black/0 group-hover:bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-150"
          >
            <X size={16} className="text-loss" />
          </button>
        </div>
        <p className="text-[9px] font-rajdhani text-ink-3 text-center mt-0.5 truncate w-12">
          {champion.name}
        </p>
      </div>
    )
  }

  return (
    <div className="relative">
      {showSearch ? (
        <div className="absolute top-0 left-0 z-40 w-56">
          <ChampionSearch
            size="sm"
            placeholder="Search..."
            onSelect={c => {
              onAdd?.(c)
              setShowSearch(false)
            }}
          />
          <button
            onClick={() => setShowSearch(false)}
            className="absolute -top-1 -right-1 w-5 h-5 bg-surface-3 flex items-center justify-center"
          >
            <X size={10} className="text-ink-3" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => !disabled && setShowSearch(true)}
          disabled={disabled}
          className={`
            w-12 h-12 border-2 border-dashed flex flex-col items-center justify-center
            transition-colors duration-150
            ${disabled
              ? 'border-surface-3 cursor-default'
              : 'border-[#2A3147] hover:border-gold-dark cursor-pointer'
            }
          `}
        >
          {!disabled && <Plus size={14} className="text-ink-3" />}
        </button>
      )}
      {label && (
        <p className="text-[9px] font-rajdhani text-ink-3 text-center mt-0.5 w-12 truncate">
          {label}
        </p>
      )}
    </div>
  )
}

export default function TeamCompositionBuilder({
  laneOpponent,
  allyTeam,
  enemyTeam,
  onLaneOpponentChange,
  onAllyTeamChange,
  onEnemyTeamChange,
}: TeamCompositionBuilderProps) {
  function removeAlly(index: number) {
    onAllyTeamChange(allyTeam.filter((_, i) => i !== index))
  }

  function addAlly(c: Champion) {
    if (allyTeam.length < 4 && !allyTeam.find(a => a.id === c.id)) {
      onAllyTeamChange([...allyTeam, c])
    }
  }

  function removeEnemy(index: number) {
    onEnemyTeamChange(enemyTeam.filter((_, i) => i !== index))
  }

  function addEnemy(c: Champion) {
    if (enemyTeam.length < 4 && !enemyTeam.find(e => e.id === c.id)) {
      onEnemyTeamChange([...enemyTeam, c])
    }
  }

  return (
    <div className="space-y-6">
      {/* Lane matchup */}
      <div>
        <label className="font-rajdhani font-semibold text-xs tracking-[0.15em] text-gold uppercase mb-3 block">
          Lane Opponent <span className="text-loss">*</span>
        </label>
        {laneOpponent ? (
          <div className="flex items-center gap-3 bg-surface-2 border border-[#2A3147] p-3">
            <img
              src={laneOpponent.icon}
              alt={laneOpponent.name}
              className="w-10 h-10 border border-gold-dark/40"
            />
            <div>
              <p className="font-rajdhani font-semibold text-ink">{laneOpponent.name}</p>
              <p className="font-rajdhani text-ink-3 text-xs">{laneOpponent.title}</p>
            </div>
            <button
              onClick={() => onLaneOpponentChange(null)}
              className="ml-auto text-ink-3 hover:text-loss transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <ChampionSearch
            placeholder="Who are you laning against?"
            onSelect={onLaneOpponentChange}
          />
        )}
      </div>

      {/* Enemy team */}
      <div>
        <label className="font-rajdhani font-semibold text-xs tracking-[0.15em] text-loss/80 uppercase mb-3 block">
          Enemy Team <span className="text-ink-3">(optional — improves accuracy)</span>
        </label>
        <div className="flex items-start gap-2 flex-wrap">
          {laneOpponent && (
            <div className="relative opacity-60">
              <div className="w-12 h-12 border border-loss/30 overflow-hidden">
                <img
                  src={laneOpponent.icon}
                  alt={laneOpponent.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <p className="text-[9px] font-rajdhani text-loss/50 text-center mt-0.5 w-12 truncate">
                {laneOpponent.name}
              </p>
            </div>
          )}
          {Array.from({ length: 4 }).map((_, i) => (
            <ChampionSlot
              key={i}
              champion={enemyTeam[i] ?? null}
              onRemove={() => removeEnemy(i)}
              onAdd={addEnemy}
              disabled={i >= 4}
            />
          ))}
        </div>
      </div>

      {/* Ally team */}
      <div>
        <label className="font-rajdhani font-semibold text-xs tracking-[0.15em] text-win/80 uppercase mb-3 block">
          Your Team <span className="text-ink-3">(optional)</span>
        </label>
        <div className="flex items-start gap-2 flex-wrap">
          {Array.from({ length: 4 }).map((_, i) => (
            <ChampionSlot
              key={i}
              champion={allyTeam[i] ?? null}
              onRemove={() => removeAlly(i)}
              onAdd={addAlly}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
