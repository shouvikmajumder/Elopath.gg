import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ChevronRight, Zap } from 'lucide-react'
import ChampionSearch from '../components/ChampionSearch'
import { useChampions } from '../hooks/useChampions'
import type { Champion, Role } from '../types'

const ROLES: Role[] = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT']

const FEATURED_CHAMPIONS = [
  'Jinx', 'Ahri', 'Zed', 'Darius', 'Thresh', 'Vi',
  'Caitlyn', 'Lux', 'Malphite', 'Garen',
]

const ROLE_DISPLAY: Record<Role, string> = {
  TOP: 'Top',
  JUNGLE: 'Jungle',
  MID: 'Mid',
  ADC: 'ADC',
  SUPPORT: 'Support',
}

function Nav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[#2A3147]/80 bg-surface/90 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link to="/" className="font-playfair text-xl font-bold">
          <span className="text-ink">ELOPATH</span>
          <span className="text-gold">.GG</span>
        </Link>
        <div className="flex items-center gap-6">
          <Link to="/" className="font-rajdhani text-sm font-semibold tracking-wider text-ink-2 hover:text-gold transition-colors uppercase">
            Profile
          </Link>
          <Link to="/champions" className="font-rajdhani text-sm font-semibold tracking-wider text-gold transition-colors uppercase">
            Champions
          </Link>
          <span className="font-rajdhani text-xs text-ink-3 border border-[#2A3147] px-2 py-1">
            PATCH 14.24
          </span>
        </div>
      </div>
    </nav>
  )
}

export default function Home() {
  const navigate = useNavigate()
  const { champions, isLoading } = useChampions()
  const [selectedChampion, setSelectedChampion] = useState<Champion | null>(null)
  const [selectedRole, setSelectedRole] = useState<Role>('ADC')

  function handleSearch() {
    if (!selectedChampion) return
    navigate(`/build/${selectedChampion.id}/${selectedRole}`)
  }

  function handleFeaturedChampion(name: string) {
    const champ = champions.find(c => c.name === name)
    if (champ) {
      setSelectedChampion(champ)
    }
  }

  return (
    <div className="min-h-screen bg-surface bg-hex">
      <Nav />

      {/* Hero */}
      <div className="flex flex-col items-center justify-center min-h-screen px-6 pt-14">
        <div className="w-full max-w-2xl">

          {/* Badge */}
          <div
            className="flex items-center gap-2 mx-auto w-fit mb-8 animate-fade-in"
            style={{ animationDelay: '0ms' }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-win animate-pulse" />
            <span className="font-rajdhani text-xs tracking-[0.25em] text-win/80 uppercase">
              Matchup-specific analysis
            </span>
          </div>

          {/* Headline */}
          <div
            className="text-center mb-4 animate-fade-up"
            style={{ animationDelay: '80ms' }}
          >
            <h1 className="font-playfair font-black text-5xl md:text-7xl text-ink leading-[0.9] tracking-tight">
              ONE
              <br />
              <span className="text-shadow-gold" style={{
                background: 'linear-gradient(135deg, #C89B3C, #F0D590, #C89B3C)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                PERFECT
              </span>
              <br />
              BUILD
            </h1>
          </div>

          <p
            className="text-center font-rajdhani text-ink-2 text-lg mb-12 animate-fade-up"
            style={{ animationDelay: '160ms' }}
          >
            Stop guessing. We analyze thousands of games to give you the{' '}
            <em className="text-gold not-italic font-semibold">single optimal build</em> for your exact matchup — not a tier list.
          </p>

          {/* Search box */}
          <div
            className="animate-fade-up"
            style={{ animationDelay: '240ms' }}
          >
            <div className="border border-[#2A3147] bg-surface-1 p-1">
              <ChampionSearch
                placeholder="Search a champion..."
                onSelect={setSelectedChampion}
              />

              {/* Role selector */}
              <div className="flex items-center gap-1 px-3 pt-2 pb-2">
                <span className="font-rajdhani text-xs text-ink-3 tracking-wider uppercase mr-2">
                  Role:
                </span>
                {ROLES.map(role => (
                  <button
                    key={role}
                    onClick={() => setSelectedRole(role)}
                    className={`
                      font-rajdhani font-semibold text-xs tracking-wider px-3 py-1 transition-all duration-150 uppercase
                      ${selectedRole === role
                        ? 'bg-gold text-surface text-shadow-none'
                        : 'text-ink-2 hover:text-gold border border-transparent hover:border-gold-dark/40'
                      }
                    `}
                  >
                    {ROLE_DISPLAY[role]}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleSearch}
              disabled={!selectedChampion}
              className={`
                w-full mt-2 py-3.5 font-playfair font-semibold text-sm tracking-[0.2em] uppercase
                flex items-center justify-center gap-2 transition-all duration-200
                ${selectedChampion
                  ? 'bg-gold text-surface hover:bg-gold-light cursor-pointer'
                  : 'bg-surface-2 text-ink-3 cursor-default'
                }
              `}
            >
              {selectedChampion ? (
                <>
                  <Zap size={14} />
                  Get Optimal Build for {selectedChampion.name}
                  <ChevronRight size={14} />
                </>
              ) : (
                'Select a Champion to Continue'
              )}
            </button>
          </div>

          {/* Quick picks */}
          {!isLoading && (
            <div
              className="mt-8 text-center animate-fade-up"
              style={{ animationDelay: '320ms' }}
            >
              <p className="font-rajdhani text-xs tracking-[0.2em] text-ink-3 uppercase mb-3">
                Popular this patch
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {FEATURED_CHAMPIONS.map(name => {
                  const champ = champions.find(c => c.name === name)
                  if (!champ) return null
                  return (
                    <button
                      key={name}
                      onClick={() => handleFeaturedChampion(name)}
                      className={`
                        flex items-center gap-1.5 px-2.5 py-1.5 border transition-all duration-150
                        font-rajdhani text-xs font-semibold
                        ${selectedChampion?.name === name
                          ? 'border-gold bg-gold-faint text-gold'
                          : 'border-[#2A3147] hover:border-gold-dark/60 text-ink-2 hover:text-ink'
                        }
                      `}
                    >
                      <img
                        src={champ.icon}
                        alt={name}
                        className="w-5 h-5 object-cover"
                        onError={e => (e.currentTarget.style.display = 'none')}
                      />
                      {name}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom label */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-[#2A3147]/40 py-3 text-center">
        <p className="font-rajdhani text-xs text-ink-3">
          Elopath.gg is not affiliated with Riot Games. League of Legends is a trademark of Riot Games.
        </p>
      </div>
    </div>
  )
}
