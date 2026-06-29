import { useState, useEffect } from 'react'
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, RefreshCw, AlertTriangle, Loader2, ChevronRight } from 'lucide-react'
import ChampionSearch from '../components/ChampionSearch'
import TeamCompositionBuilder from '../components/TeamCompositionBuilder'
import BuildDisplay from '../components/BuildDisplay'
import { useChampions } from '../hooks/useChampions'
import { useBuildRecommendation } from '../hooks/useBuildRecommendation'
import type { Champion, Role } from '../types'

const ROLE_DISPLAY: Record<string, string> = {
  TOP: 'Top Lane',
  JUNGLE: 'Jungle',
  MID: 'Mid Lane',
  ADC: 'Bot Lane',
  SUPPORT: 'Support',
}

function Nav({ breadcrumbs }: { breadcrumbs: string[] }) {
  return (
    <nav className="sticky top-0 z-50 border-b border-[#2A3147]/80 bg-surface/95 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/" className="font-playfair text-lg font-bold">
            <span className="text-ink">ELOPATH</span>
            <span className="text-gold">.GG</span>
          </Link>
          <div className="hidden sm:flex items-center gap-2 text-ink-3">
            {breadcrumbs.map((crumb, i) => (
              <span key={crumb} className="flex items-center gap-2">
                <ChevronRight size={12} />
                <span className={`font-rajdhani text-sm ${i === breadcrumbs.length - 1 ? 'text-gold' : 'text-ink-3'}`}>
                  {crumb}
                </span>
              </span>
            ))}
          </div>
        </div>
        <Link
          to="/champions"
          className="flex items-center gap-1.5 font-rajdhani text-xs text-ink-2 hover:text-gold transition-colors tracking-wider uppercase"
        >
          <ArrowLeft size={12} />
          Change Champion
        </Link>
      </div>
    </nav>
  )
}

export default function Build() {
  const { champion: championId, role } = useParams<{ champion: string; role: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { champions, version } = useChampions()

  const [laneOpponent, setLaneOpponent] = useState<Champion | null>(null)
  const [allyTeam, setAllyTeam] = useState<Champion[]>([])
  const [enemyTeam, setEnemyTeam] = useState<Champion[]>([])
  const [panelOpen, setPanelOpen] = useState(true)

  const { recommend, build, isLoading, error } = useBuildRecommendation()

  const myChampion = champions.find(c => c.id === championId)

  // Auto-populate opponent from URL query params
  useEffect(() => {
    const opponentParam = searchParams.get('opponent')
    if (opponentParam && champions.length > 0 && !laneOpponent) {
      const found = champions.find(c => c.id === opponentParam || c.name === opponentParam)
      if (found) setLaneOpponent(found)
    }
  }, [champions, searchParams])

  function handleGetBuild() {
    if (!championId || !role || !laneOpponent) return
    recommend({
      champion: myChampion?.name ?? championId,
      role: role.toUpperCase() as Role,
      lane_opponent: laneOpponent.name,
      ally_team: allyTeam.map(c => c.name),
      enemy_team: enemyTeam.map(c => c.name),
    })
    setPanelOpen(false)
  }

  const roleLabel = ROLE_DISPLAY[role?.toUpperCase() ?? ''] ?? role ?? ''
  const breadcrumbs = [
    myChampion?.name ?? championId ?? '—',
    roleLabel,
    ...(laneOpponent ? [`vs ${laneOpponent.name}`] : []),
  ].filter(Boolean)

  return (
    <div className="min-h-screen bg-surface bg-hex">
      <Nav breadcrumbs={breadcrumbs} />

      <div className="max-w-5xl mx-auto px-4 md:px-6 py-8">

        {/* Champion Header */}
        <div className="relative overflow-hidden border border-[#2A3147] bg-surface-1 mb-6">
          {/* Splash art background */}
          {myChampion && (
            <div
              className="absolute inset-0 bg-cover bg-top opacity-8"
              style={{
                backgroundImage: `url(${myChampion.splash})`,
                filter: 'blur(4px) saturate(0.4)',
              }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-surface-1 via-surface-1/90 to-surface-1/60" />

          <div className="relative flex items-center gap-6 p-6">
            {/* Champion portrait */}
            {myChampion ? (
              <div className="relative flex-shrink-0">
                <div className="w-20 h-20 md:w-24 md:h-24 border-2 border-gold/40 overflow-hidden">
                  <img
                    src={myChampion.icon}
                    alt={myChampion.name}
                    className="w-full h-full object-cover scale-110"
                  />
                </div>
                <div className="absolute -bottom-1 -right-1 bg-gold px-1.5 py-0.5">
                  <span className="font-rajdhani font-bold text-[10px] text-surface tracking-wider">
                    {role?.toUpperCase()}
                  </span>
                </div>
              </div>
            ) : (
              <div className="w-20 h-20 md:w-24 md:h-24 bg-surface-3 border border-[#2A3147] animate-pulse" />
            )}

            {/* Names */}
            <div className="flex-1 min-w-0">
              <h1 className="font-playfair font-bold text-2xl md:text-4xl text-ink leading-none tracking-wide">
                {myChampion?.name ?? championId}
              </h1>
              <p className="font-rajdhani text-ink-3 text-sm mt-1">{roleLabel}</p>
              {laneOpponent && (
                <div className="flex items-center gap-2 mt-3">
                  <span className="font-rajdhani text-xs text-ink-3 tracking-wider uppercase">vs</span>
                  <img
                    src={laneOpponent.icon}
                    alt={laneOpponent.name}
                    className="w-7 h-7 border border-loss/30"
                  />
                  <span className="font-rajdhani font-semibold text-ink-2">
                    {laneOpponent.name}
                  </span>
                </div>
              )}
            </div>

            {/* Team comp preview */}
            {(enemyTeam.length > 0 || allyTeam.length > 0) && (
              <div className="hidden md:flex flex-col gap-2 text-right">
                {enemyTeam.length > 0 && (
                  <div className="flex items-center gap-1 justify-end">
                    <span className="font-rajdhani text-[10px] text-loss/60 uppercase tracking-wider mr-1">Enemy</span>
                    {laneOpponent && (
                      <img src={laneOpponent.icon} alt="" className="w-5 h-5 opacity-60" />
                    )}
                    {enemyTeam.map(c => (
                      <img key={c.id} src={c.icon} alt={c.name} className="w-5 h-5" />
                    ))}
                  </div>
                )}
                {allyTeam.length > 0 && (
                  <div className="flex items-center gap-1 justify-end">
                    <span className="font-rajdhani text-[10px] text-win/60 uppercase tracking-wider mr-1">Allies</span>
                    {allyTeam.map(c => (
                      <img key={c.id} src={c.icon} alt={c.name} className="w-5 h-5" />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">

          {/* ── Left: Build output ─────────────────────────────────────────── */}
          <div>
            {/* Config prompt */}
            {!build && !isLoading && (
              <div className="border border-[#2A3147] bg-surface-1 p-8 text-center">
                <div className="w-12 h-12 border border-gold-dark/30 mx-auto mb-4 flex items-center justify-center">
                  <span className="font-playfair text-gold text-xl">?</span>
                </div>
                <p className="font-playfair text-ink font-semibold text-lg mb-2">
                  Configure Your Matchup
                </p>
                <p className="font-rajdhani text-ink-2 text-sm mb-6">
                  Select your lane opponent on the right to generate a tailored build recommendation.
                </p>
                {!laneOpponent && (
                  <p className="font-rajdhani text-xs text-gold tracking-wider uppercase">
                    ← Set lane opponent to continue
                  </p>
                )}
              </div>
            )}

            {/* Loading */}
            {isLoading && (
              <div className="border border-[#2A3147] bg-surface-1 p-12 text-center">
                <Loader2 className="w-8 h-8 text-gold animate-spin mx-auto mb-4" />
                <p className="font-playfair text-ink-2 text-sm tracking-wider">
                  Analyzing matchup data...
                </p>
              </div>
            )}

            {/* Error */}
            {error && !isLoading && (
              <div className="border border-loss/30 bg-surface-1 p-6">
                <div className="flex items-center gap-3 mb-3">
                  <AlertTriangle className="text-loss flex-shrink-0" size={18} />
                  <p className="font-playfair font-semibold text-ink">Backend Unavailable</p>
                </div>
                <p className="font-rajdhani text-ink-2 text-sm mb-4">
                  Could not reach the Elopath API. Make sure the backend server is running on port 8000.
                </p>
                <code className="font-rajdhani text-xs text-gold bg-surface-2 px-3 py-1.5 block border border-[#2A3147]">
                  cd backend && uvicorn app.main:app --reload
                </code>
              </div>
            )}

            {/* Build result */}
            {build && !isLoading && (
              <div className="border border-[#2A3147] bg-surface-1 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-playfair font-bold text-gold text-lg tracking-wide">
                    Optimal Build
                  </h2>
                  <button
                    onClick={handleGetBuild}
                    className="flex items-center gap-1.5 font-rajdhani text-xs text-ink-2 hover:text-gold transition-colors tracking-wider uppercase border border-[#2A3147] hover:border-gold-dark/50 px-3 py-1.5"
                  >
                    <RefreshCw size={11} />
                    Recalculate
                  </button>
                </div>
                <BuildDisplay build={build} />
              </div>
            )}
          </div>

          {/* ── Right: Configuration panel ─────────────────────────────────── */}
          <div className="lg:block">
            <div className="border border-[#2A3147] bg-surface-1 sticky top-20">
              <button
                onClick={() => setPanelOpen(p => !p)}
                className="w-full flex items-center justify-between p-4 border-b border-[#2A3147] hover:bg-surface-2 transition-colors lg:cursor-default"
              >
                <span className="font-playfair font-semibold text-xs tracking-[0.25em] text-gold uppercase">
                  Matchup Setup
                </span>
                <ChevronRight
                  size={14}
                  className={`text-ink-3 transition-transform lg:hidden ${panelOpen ? 'rotate-90' : ''}`}
                />
              </button>

              {(panelOpen || window.innerWidth >= 1024) && (
                <div className="p-4">
                  <TeamCompositionBuilder
                    laneOpponent={laneOpponent}
                    allyTeam={allyTeam}
                    enemyTeam={enemyTeam}
                    onLaneOpponentChange={setLaneOpponent}
                    onAllyTeamChange={setAllyTeam}
                    onEnemyTeamChange={setEnemyTeam}
                    myChampion={myChampion?.name ?? ''}
                  />

                  <button
                    onClick={handleGetBuild}
                    disabled={!laneOpponent || isLoading}
                    className={`
                      w-full mt-6 py-3 font-playfair font-semibold text-sm tracking-[0.2em] uppercase
                      flex items-center justify-center gap-2 transition-all duration-200
                      ${laneOpponent && !isLoading
                        ? 'bg-gold text-surface hover:bg-gold-light cursor-pointer'
                        : 'bg-surface-2 text-ink-3 cursor-default'
                      }
                    `}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>Get Optimal Build</>
                    )}
                  </button>

                  {!laneOpponent && (
                    <p className="text-center font-rajdhani text-xs text-ink-3 mt-2">
                      Lane opponent required
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
