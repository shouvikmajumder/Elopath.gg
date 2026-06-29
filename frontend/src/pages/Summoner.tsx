import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { isAxiosError } from 'axios'
import { ChevronRight, Loader2, AlertTriangle, SearchX } from 'lucide-react'
import SummonerSearchBar from '../components/SummonerSearchBar'
import RankedBadge from '../components/RankedBadge'
import MatchRow from '../components/MatchRow'
import ChampionStatCard from '../components/ChampionStatCard'
import LiveGameBanner from '../components/LiveGameBanner'
import { useSummonerProfile } from '../hooks/useSummonerProfile'
import { useLiveGame } from '../hooks/useLiveGame'
import { regionLabel } from '../constants/regions'

type Tab = 'overview' | 'live'

function Nav({ breadcrumb }: { breadcrumb: string }) {
  return (
    <nav className="sticky top-0 z-50 border-b border-[#2A3147]/80 bg-surface/95 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/" className="font-playfair text-lg font-bold">
            <span className="text-ink">ELOPATH</span>
            <span className="text-gold">.GG</span>
          </Link>
          <div className="hidden sm:flex items-center gap-2 text-ink-3">
            <ChevronRight size={12} />
            <Link to="/" className="font-rajdhani text-sm text-ink-3 hover:text-gold transition-colors">
              Profile
            </Link>
            <ChevronRight size={12} />
            <span className="font-rajdhani text-sm text-gold truncate max-w-[200px]">
              {breadcrumb}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <Link to="/" className="font-rajdhani text-sm font-semibold tracking-wider text-gold transition-colors uppercase">
            Profile
          </Link>
          <Link to="/champions" className="font-rajdhani text-sm font-semibold tracking-wider text-ink-2 hover:text-gold transition-colors uppercase">
            Champions
          </Link>
        </div>
      </div>
    </nav>
  )
}

export default function Summoner() {
  const { platform, gameName, tagLine } = useParams<{
    platform: string
    gameName: string
    tagLine: string
  }>()

  const decodedGameName = gameName ? decodeURIComponent(gameName) : ''
  const decodedTagLine = tagLine ? decodeURIComponent(tagLine) : ''

  const { profile, isLoading, error } = useSummonerProfile(platform, gameName, tagLine)
  const { data: liveGame, isError: liveGameError } = useLiveGame(platform ?? null, profile?.summoner.puuid ?? null)

  const [activeTab, setActiveTab] = useState<Tab>('overview')

  useEffect(() => {
    if (liveGame) setActiveTab('live')
  }, [liveGame])

  const breadcrumb = `${decodedGameName}#${decodedTagLine}`

  let errorStatus: number | undefined
  let errorDetail: string | undefined
  if (isAxiosError(error)) {
    errorStatus = error.response?.status
    errorDetail = error.response?.data?.detail
  }

  return (
    <div className="min-h-screen bg-surface bg-hex">
      <Nav breadcrumb={breadcrumb} />

      <div className="max-w-5xl mx-auto px-4 md:px-6 py-8">

        {/* Search bar */}
        <div className="mb-6 animate-fade-up" style={{ animationDelay: '0ms' }}>
          <SummonerSearchBar
            size="sm"
            initialPlatform={platform}
            initialRiotId={breadcrumb}
          />
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="border border-[#2A3147] bg-surface-1 p-12 text-center animate-fade-up">
            <Loader2 className="w-8 h-8 text-gold animate-spin mx-auto mb-4" />
            <p className="font-playfair text-ink-2 text-sm tracking-wider">
              Loading summoner profile...
            </p>
          </div>
        )}

        {/* Error: not found */}
        {error && !isLoading && errorStatus === 404 && (
          <div className="border border-loss/30 bg-surface-1 p-8 text-center animate-fade-up">
            <SearchX className="w-10 h-10 text-loss mx-auto mb-4" />
            <p className="font-playfair font-semibold text-ink text-lg mb-2">
              Summoner Not Found
            </p>
            <p className="font-rajdhani text-ink-2 text-sm">
              We couldn't find <span className="text-gold">{breadcrumb}</span> on{' '}
              <span className="text-gold">{platform ? regionLabel(platform) : ''}</span>.
              Double-check the name, tagline, and region.
            </p>
          </div>
        )}

        {/* Error: other */}
        {error && !isLoading && errorStatus !== 404 && (
          <div className="border border-loss/30 bg-surface-1 p-6 animate-fade-up">
            <div className="flex items-center gap-3 mb-3">
              <AlertTriangle className="text-loss flex-shrink-0" size={18} />
              <p className="font-playfair font-semibold text-ink">
                {errorStatus === 429 ? 'Rate Limited' : 'Something Went Wrong'}
              </p>
            </div>
            <p className="font-rajdhani text-ink-2 text-sm">
              {errorDetail ?? 'Could not reach the Elopath API. Make sure the backend server is running.'}
            </p>
          </div>
        )}

        {/* Success */}
        {profile && !isLoading && (
          <div className="space-y-6">

            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 border border-[#2A3147] bg-surface-1 p-6 animate-fade-up" style={{ animationDelay: '80ms' }}>
              <img
                src={profile.summoner.profile_icon_url}
                alt={profile.summoner.game_name}
                className="w-20 h-20 border-2 border-gold/40 flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <h1 className="font-playfair font-bold text-2xl md:text-3xl text-ink leading-none tracking-wide truncate">
                  {profile.summoner.game_name}
                  <span className="text-ink-3">#{profile.summoner.tag_line}</span>
                </h1>
                <p className="font-rajdhani text-ink-3 text-sm mt-2">
                  Level {profile.summoner.summoner_level}
                  {platform && <> · {regionLabel(platform)}</>}
                </p>
              </div>
              <RankedBadge ranked={profile.ranked} />
            </div>

            {/* Tab bar */}
            <div className="flex items-center gap-1 border-b border-[#2A3147] animate-fade-up" style={{ animationDelay: '100ms' }}>
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-4 py-2.5 font-rajdhani text-sm font-semibold tracking-wider uppercase transition-colors ${
                  activeTab === 'overview'
                    ? 'text-gold border-b-2 border-gold -mb-px'
                    : 'text-ink-3 hover:text-ink'
                }`}
              >
                Overview
              </button>
              {liveGame && (
                <button
                  onClick={() => setActiveTab('live')}
                  className={`flex items-center gap-2 px-4 py-2.5 font-rajdhani text-sm font-semibold tracking-wider uppercase transition-colors ${
                    activeTab === 'live'
                      ? 'text-gold border-b-2 border-gold -mb-px'
                      : 'text-ink-3 hover:text-ink'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-loss animate-pulse flex-shrink-0" aria-hidden="true" />
                  Live
                </button>
              )}
            </div>

            {/* Overview tab */}
            {activeTab === 'overview' && (
              <>
                {/* Champion stats */}
                {profile.champion_stats.length > 0 && (
                  <div className="animate-fade-up" style={{ animationDelay: '160ms' }}>
                    <h2 className="font-playfair font-bold text-gold text-sm tracking-[0.25em] uppercase mb-3">
                      Champion Stats
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {profile.champion_stats.map(stat => (
                        <ChampionStatCard key={stat.champion} stat={stat} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent matches */}
                <div className="animate-fade-up" style={{ animationDelay: '240ms' }}>
                  <h2 className="font-playfair font-bold text-gold text-sm tracking-[0.25em] uppercase mb-3">
                    Recent Matches
                  </h2>
                  {profile.matches.length > 0 ? (
                    <div className="space-y-2">
                      {profile.matches.map(match => (
                        <MatchRow
                          key={match.match_id}
                          match={match}
                          platform={platform ?? ''}
                          currentPuuid={profile.summoner.puuid}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="border border-[#2A3147] bg-surface-1 p-8 text-center">
                      <p className="font-rajdhani text-ink-2 text-sm">
                        No recent matches found.
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Live tab */}
            {activeTab === 'live' && liveGameError && !liveGame && (
              <div className="border border-loss/30 bg-surface-1 p-4 animate-fade-up">
                <p className="font-rajdhani text-ink-2 text-sm">Unable to load live game data. The game may have ended.</p>
              </div>
            )}
            {activeTab === 'live' && liveGame && (
              <div className="animate-fade-up">
                <LiveGameBanner
                  liveGame={liveGame}
                  summonerPuuid={profile.summoner.puuid}
                  platform={platform ?? ''}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
