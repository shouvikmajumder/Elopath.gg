import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Loader2, Sparkles } from 'lucide-react'
import type { Champion, ItemSlot, MatchParticipant, SummonerProfile } from '../types'
import { fetchChampions, fetchMatchDetail } from '../services/api'

const ROLES = ['TOP', 'JUNGLE', 'MIDDLE', 'BOTTOM', 'UTILITY'] as const
type Role = typeof ROLES[number]

interface Slot {
  role: Role
  champion: string
}

interface BuildAnalysis {
  sampleSize: number
  wins: number
  coreItems: ItemSlot[]
  notes: string[]
}

function emptyTeam(): Slot[] {
  return ROLES.map(role => ({ role, champion: '' }))
}

function normalizeChampion(value: string): string {
  return value.trim().toLocaleLowerCase()
}

function profileRole(role: string | undefined): Role {
  return ROLES.includes(role as Role) ? role as Role : 'MIDDLE'
}

function participantForProfile(
  participants: MatchParticipant[],
  puuid: string
): MatchParticipant | undefined {
  return participants.find(participant => participant.puuid === puuid)
}

function compositionNotes(ally: Slot[], enemy: Slot[], championByName: Map<string, Champion>): string[] {
  const tagsFor = (team: Slot[]) => team.flatMap(slot =>
    championByName.get(normalizeChampion(slot.champion))?.tags ?? []
  )
  const allyTags = tagsFor(ally)
  const enemyTags = tagsFor(enemy)
  const notes: string[] = []

  if (enemyTags.filter(tag => tag === 'Tank' || tag === 'Fighter').length >= 2) {
    notes.push('The opposing team has a durable frontline. Favor sustained damage and anti-tank options from this champion’s usual build path.')
  }
  if (enemyTags.filter(tag => tag === 'Mage' || tag === 'Assassin').length >= 2) {
    notes.push('The opposing team has concentrated burst threat. Consider an appropriate defensive or resistance option after your core items.')
  }
  if (!allyTags.includes('Tank') && !allyTags.includes('Support')) {
    notes.push('Your team is light on frontline and peel. A more self-sufficient build path may be valuable when choosing situational items.')
  }
  if (notes.length === 0) {
    notes.push('Both teams look balanced from their champion classes. Start with the player’s historical core, then adapt the final slots to the game state.')
  }
  return notes
}

interface ManualCompositionAnalysisProps {
  profile: SummonerProfile
  platform: string
}

export default function ManualCompositionAnalysis({ profile, platform }: ManualCompositionAnalysisProps) {
  const initialMatch = profile.matches[0]
  const initialRole = profileRole(initialMatch?.role)
  const [targetRole, setTargetRole] = useState<Role>(initialRole)
  const [allyTeam, setAllyTeam] = useState<Slot[]>(() => {
    const team = emptyTeam()
    team[ROLES.indexOf(initialRole)].champion = initialMatch?.champion ?? ''
    return team
  })
  const [enemyTeam, setEnemyTeam] = useState<Slot[]>(emptyTeam)
  const [analysis, setAnalysis] = useState<BuildAnalysis | null>(null)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const { data: champions = [], isLoading: championsLoading, isError: championsError } = useQuery({
    queryKey: ['champions'],
    queryFn: fetchChampions,
    staleTime: 1000 * 60 * 60,
  })

  const championByName = useMemo(
    () => new Map(champions.map(champion => [normalizeChampion(champion.name), champion])),
    [champions]
  )

  const selectedTarget = allyTeam.find(slot => slot.role === targetRole)

  useEffect(() => {
    const team = emptyTeam()
    const role = profileRole(initialMatch?.role)
    team[ROLES.indexOf(role)].champion = initialMatch?.champion ?? ''
    setAllyTeam(team)
    setEnemyTeam(emptyTeam())
    setTargetRole(role)
    setAnalysis(null)
    setAnalysisError(null)
  }, [profile.summoner.puuid]) // Reset manual data when navigating to another profile.

  function updateChampion(setTeam: Dispatch<SetStateAction<Slot[]>>, role: Role, champion: string) {
    setTeam(team => team.map(slot => slot.role === role ? { ...slot, champion } : slot))
    setAnalysis(null)
  }

  async function analyze(): Promise<void> {
    setAnalysisError(null)
    setAnalysis(null)

    const allSlots = [...allyTeam, ...enemyTeam]
    if (allSlots.some(slot => !championByName.has(normalizeChampion(slot.champion)))) {
      setAnalysisError('Choose a champion from the list for every role before analyzing the composition.')
      return
    }

    const target = selectedTarget
    if (!target) {
      setAnalysisError('Choose the searched player’s champion on the left team.')
      return
    }

    setIsAnalyzing(true)
    try {
      const details = await Promise.all(
        profile.matches.map(match => fetchMatchDetail(platform, match.match_id))
      )
      const targetChampion = normalizeChampion(target.champion)
      const matchingParticipants = details
        .map(detail => participantForProfile([...detail.blue_team, ...detail.red_team], profile.summoner.puuid))
        .filter((participant): participant is MatchParticipant =>
          participant !== undefined && normalizeChampion(participant.champion) === targetChampion
        )
      const roleMatches = matchingParticipants.filter(participant => participant.role === target.role)
      const sample = roleMatches.length > 0 ? roleMatches : matchingParticipants
      const winningSample = sample.filter(participant => participant.win)
      const source = winningSample.length > 0 ? winningSample : sample
      const counts = new Map<number, { item: ItemSlot; count: number }>()

      for (const participant of source) {
        for (const item of participant.items.slice(0, 6)) {
          if (!item) continue
          const entry = counts.get(item.id)
          counts.set(item.id, { item, count: (entry?.count ?? 0) + 1 })
        }
      }

      setAnalysis({
        sampleSize: sample.length,
        wins: winningSample.length,
        coreItems: [...counts.values()]
          .sort((a, b) => b.count - a.count || a.item.name.localeCompare(b.item.name))
          .slice(0, 3)
          .map(entry => entry.item),
        notes: compositionNotes(allyTeam, enemyTeam, championByName),
      })
    } catch {
      setAnalysisError('Could not load the player’s recent item histories. Try again shortly.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <div className="space-y-4 animate-fade-up">
      <div className="border border-[#2A3147] bg-surface-1 p-4">
        <div className="flex items-start gap-3 mb-4">
          <Sparkles className="text-gold flex-shrink-0 mt-0.5" size={18} />
          <div>
            <h2 className="font-playfair font-bold text-ink text-base">Manual matchup analysis</h2>
            <p className="font-rajdhani text-sm text-ink-2 mt-1">
              Enter both team compositions. The left side is {profile.summoner.game_name}’s team; their selected champion is used to find recent successful build cores.
            </p>
          </div>
        </div>

        {championsLoading && (
          <div className="flex items-center gap-2 py-8 justify-center text-ink-3">
            <Loader2 className="w-5 h-5 animate-spin text-gold" />
            <span className="font-rajdhani text-sm">Loading champion roster…</span>
          </div>
        )}

        {championsError && (
          <p className="font-rajdhani text-sm text-loss">Champion data is unavailable. Refresh the page and try again.</p>
        )}

        {!championsLoading && !championsError && (
          <>
            <datalist id="champion-options">
              {champions.map(champion => <option key={champion.id} value={champion.name} />)}
            </datalist>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TeamEntry
                label={`${profile.summoner.game_name}'s team`}
                labelClass="text-blue border-blue/30"
                team={allyTeam}
                onChange={(role, champion) => updateChampion(setAllyTeam, role, champion)}
                targetRole={targetRole}
                onTargetRoleChange={setTargetRole}
              />
              <TeamEntry
                label="Opposing team"
                labelClass="text-loss border-loss/30"
                team={enemyTeam}
                onChange={(role, champion) => updateChampion(setEnemyTeam, role, champion)}
              />
            </div>

            <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <button
                type="button"
                onClick={() => void analyze()}
                disabled={isAnalyzing}
                className="inline-flex justify-center items-center gap-2 font-rajdhani text-sm font-semibold tracking-wider uppercase text-surface bg-gold hover:bg-gold-light disabled:opacity-60 px-5 py-2.5 transition-colors"
              >
                {isAnalyzing && <Loader2 className="w-4 h-4 animate-spin" />}
                Analyze build
              </button>
              <p className="font-rajdhani text-xs text-ink-3">
                Uses recent match history only—no live-game access required.
              </p>
            </div>
          </>
        )}
      </div>

      {analysisError && (
        <div className="border border-loss/30 bg-surface-1 p-4 flex items-start gap-3">
          <AlertTriangle className="text-loss flex-shrink-0" size={17} />
          <p className="font-rajdhani text-sm text-ink-2">{analysisError}</p>
        </div>
      )}

      {analysis && (
        <div className="border border-[#2A3147] bg-surface-1 p-4 space-y-4">
          <div>
            <p className="font-playfair font-bold text-gold text-xs tracking-[0.2em] uppercase">Historical build signal</p>
            <p className="font-rajdhani text-sm text-ink-2 mt-1">
              {analysis.sampleSize > 0
                ? `${profile.summoner.game_name} played ${selectedTarget?.champion} ${analysis.sampleSize} time${analysis.sampleSize === 1 ? '' : 's'} in recent matches${analysis.wins > 0 ? `, with ${analysis.wins} win${analysis.wins === 1 ? '' : 's'}` : ''}.`
                : `${profile.summoner.game_name} has no recent recorded games on ${selectedTarget?.champion}.`}
            </p>
          </div>

          {analysis.coreItems.length > 0 ? (
            <div className="flex flex-wrap gap-3">
              {analysis.coreItems.map(item => (
                <div key={item.id} className="flex items-center gap-2 border border-[#2A3147] bg-surface-2 px-2 py-2">
                  <img src={item.icon} alt={item.name} className="w-9 h-9 border border-[#2A3147]" />
                  <span className="font-rajdhani text-sm font-semibold text-ink">{item.name}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="font-rajdhani text-sm text-ink-3">No completed item data was found for this champion in the recent match sample.</p>
          )}

          <div className="border-t border-[#2A3147] pt-4">
            <p className="font-playfair font-bold text-gold text-xs tracking-[0.2em] uppercase mb-2">Composition read</p>
            <ul className="space-y-2">
              {analysis.notes.map(note => (
                <li key={note} className="font-rajdhani text-sm text-ink-2 flex gap-2">
                  <span className="text-gold">•</span>{note}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}

interface TeamEntryProps {
  label: string
  labelClass: string
  team: Slot[]
  onChange: (role: Role, champion: string) => void
  targetRole?: Role
  onTargetRoleChange?: (role: Role) => void
}

function TeamEntry({ label, labelClass, team, onChange, targetRole, onTargetRoleChange }: TeamEntryProps) {
  return (
    <div>
      <p className={`font-playfair font-bold text-xs tracking-[0.18em] uppercase border-b pb-2 mb-2 ${labelClass}`}>{label}</p>
      <div className="space-y-2">
        {team.map(slot => (
          <label key={slot.role} className={`flex items-center gap-3 border px-2 py-2 ${targetRole === slot.role ? 'border-gold bg-gold/5' : 'border-[#2A3147] bg-surface-2'}`}>
            <span className="w-14 flex-shrink-0 font-rajdhani text-xs font-semibold text-ink-3 tracking-wider">{slot.role === 'JUNGLE' ? 'JUNGLE' : slot.role === 'MIDDLE' ? 'MID' : slot.role === 'BOTTOM' ? 'BOT' : slot.role === 'UTILITY' ? 'SUPPORT' : 'TOP'}</span>
            <input
              value={slot.champion}
              onChange={event => onChange(slot.role, event.target.value)}
              list="champion-options"
              placeholder="Choose champion"
              className="min-w-0 flex-1 bg-transparent font-rajdhani text-sm text-ink outline-none placeholder:text-ink-3"
              aria-label={`${label} ${slot.role} champion`}
            />
            {targetRole === slot.role && <span className="font-rajdhani text-[10px] uppercase tracking-wider text-gold">Target</span>}
            {onTargetRoleChange && targetRole !== slot.role && (
              <button
                type="button"
                onClick={() => onTargetRoleChange(slot.role)}
                className="font-rajdhani text-[10px] uppercase tracking-wider text-ink-3 hover:text-gold"
              >
                Set target
              </button>
            )}
          </label>
        ))}
      </div>
    </div>
  )
}
