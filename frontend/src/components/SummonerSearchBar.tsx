import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, ChevronRight, X } from 'lucide-react'
import RegionSelect from './RegionSelect'
import { DEFAULT_REGION } from '../constants/regions'
import { useRecentSearches } from '../hooks/useRecentSearches'

interface SummonerSearchBarProps {
  size?: 'sm' | 'default'
  initialPlatform?: string
  initialRiotId?: string
}

export default function SummonerSearchBar({
  size = 'default',
  initialPlatform = DEFAULT_REGION,
  initialRiotId = '',
}: SummonerSearchBarProps) {
  const navigate = useNavigate()
  const [platform, setPlatform] = useState(initialPlatform)
  const [riotId, setRiotId] = useState(initialRiotId)
  const [error, setError] = useState<string | null>(null)
  const [isFocused, setIsFocused] = useState(false)
  const { recentSearches, addSearch, removeSearch } = useRecentSearches()

  function handleSearch(overrideRiotId?: string, overridePlatform?: string) {
    const id = overrideRiotId ?? riotId
    const plat = overridePlatform ?? platform
    const hashIndex = id.indexOf('#')

    if (hashIndex === -1) {
      setError('Enter a Riot ID in the format GameName#TagLine')
      return
    }

    const gameName = id.slice(0, hashIndex).trim()
    const tagLine = id.slice(hashIndex + 1).trim()

    if (!gameName || !tagLine) {
      setError('Both summoner name and tagline are required')
      return
    }

    setError(null)
    addSearch(id, plat)
    navigate(`/profile/${plat}/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleSearch()
  }

  function handleBlur() {
    // Delay so a click on a dropdown item fires before the dropdown disappears
    setTimeout(() => setIsFocused(false), 150)
  }

  function selectRecent(recentRiotId: string, recentPlatform: string) {
    setRiotId(recentRiotId)
    setPlatform(recentPlatform)
    setIsFocused(false)
    handleSearch(recentRiotId, recentPlatform)
  }

  const showDropdown = isFocused && recentSearches.length > 0

  const inputClasses =
    size === 'sm'
      ? 'bg-surface-2 border border-[#2A3147] pl-9 pr-3 py-2 text-ink font-rajdhani text-sm placeholder-ink-3 focus:border-gold focus:outline-none w-full transition-colors'
      : 'bg-surface-2 border border-[#2A3147] pl-12 pr-4 py-4 text-ink font-rajdhani text-lg placeholder-ink-3 focus:border-gold focus:outline-none w-full transition-colors focus:shadow-[0_0_0_1px_#C89B3C40]'

  return (
    <div className="w-full">
      <div className={`flex flex-col sm:flex-row gap-1 ${size === 'default' ? 'border border-[#2A3147] bg-surface-1 p-1' : ''}`}>
        <RegionSelect value={platform} onChange={setPlatform} size={size} />
        <div className="relative flex-1">
          <Search
            className={`absolute ${size === 'sm' ? 'left-3' : 'left-4'} top-1/2 -translate-y-1/2 text-gold-dim pointer-events-none`}
            size={size === 'sm' ? 14 : 18}
          />
          <input
            type="text"
            value={riotId}
            onChange={e => {
              setRiotId(e.target.value)
              if (error) setError(null)
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={handleBlur}
            placeholder="Shomo #90210"
            className={inputClasses}
            autoComplete="off"
          />
          {showDropdown && (
            <ul className="absolute left-0 right-0 top-full mt-0.5 z-50 border border-[#2A3147] bg-surface-1 shadow-lg">
              {recentSearches.map((s, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between px-3 py-2 hover:bg-surface-2 cursor-pointer group"
                  onMouseDown={e => {
                    e.preventDefault()
                    selectRecent(s.riotId, s.platform)
                  }}
                >
                  <span className="flex items-center gap-2 font-rajdhani text-sm text-ink truncate">
                    <span className="text-ink-3 text-xs uppercase tracking-widest shrink-0">{s.platform}</span>
                    <span className="truncate">{s.riotId}</span>
                  </span>
                  <button
                    onMouseDown={e => {
                      e.stopPropagation()
                      e.preventDefault()
                      removeSearch(i)
                    }}
                    className="ml-2 text-ink-3 hover:text-ink opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    aria-label="Remove"
                  >
                    <X size={12} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {size === 'default' && (
          <button
            onClick={() => handleSearch()}
            className="flex items-center justify-center gap-2 px-6 py-3.5 font-playfair font-semibold text-sm tracking-[0.2em] uppercase bg-gold text-surface hover:bg-gold-light transition-all duration-200"
          >
            Search
            <ChevronRight size={14} />
          </button>
        )}
        {size === 'sm' && (
          <button
            onClick={() => handleSearch()}
            aria-label="Search"
            className="flex items-center justify-center px-4 py-2 font-playfair font-semibold text-xs tracking-wider uppercase bg-gold text-surface hover:bg-gold-light transition-all duration-200"
          >
            <Search size={14} />
          </button>
        )}
      </div>
      {error && (
        <p className="mt-2 font-rajdhani text-xs text-loss tracking-wide">{error}</p>
      )}
    </div>
  )
}
