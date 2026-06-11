import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, ChevronRight } from 'lucide-react'
import RegionSelect from './RegionSelect'
import { DEFAULT_REGION } from '../constants/regions'

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

  function handleSearch() {
    const hashIndex = riotId.indexOf('#')

    if (hashIndex === -1) {
      setError('Enter a Riot ID in the format GameName#TagLine')
      return
    }

    const gameName = riotId.slice(0, hashIndex).trim()
    const tagLine = riotId.slice(hashIndex + 1).trim()

    if (!gameName || !tagLine) {
      setError('Both summoner name and tagline are required')
      return
    }

    setError(null)
    navigate(`/profile/${platform}/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleSearch()
  }

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
            placeholder="Shomo #90210"
            className={inputClasses}
            autoComplete="off"
          />
        </div>
        {size === 'default' && (
          <button
            onClick={handleSearch}
            className="flex items-center justify-center gap-2 px-6 py-3.5 font-cinzel font-semibold text-sm tracking-[0.2em] uppercase bg-gold text-surface hover:bg-gold-light transition-all duration-200"
          >
            Search
            <ChevronRight size={14} />
          </button>
        )}
        {size === 'sm' && (
          <button
            onClick={handleSearch}
            aria-label="Search"
            className="flex items-center justify-center px-4 py-2 font-cinzel font-semibold text-xs tracking-wider uppercase bg-gold text-surface hover:bg-gold-light transition-all duration-200"
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
