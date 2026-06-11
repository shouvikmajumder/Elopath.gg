import { useState, useRef, useEffect } from 'react'
import { Search } from 'lucide-react'
import { useChampions, useChampionSearch } from '../hooks/useChampions'
import type { Champion } from '../types'

interface ChampionSearchProps {
  placeholder?: string
  onSelect: (champion: Champion) => void
  size?: 'sm' | 'default'
}

export default function ChampionSearch({
  placeholder = 'Search champion...',
  onSelect,
  size = 'default',
}: ChampionSearchProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const { champions, isLoading } = useChampions()
  const results = useChampionSearch(query, champions)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleSelect(champion: Champion) {
    onSelect(champion)
    setQuery(champion.name)
    setOpen(false)
  }

  const inputClasses =
    size === 'sm'
      ? 'bg-surface-2 border border-[#2A3147] pl-8 pr-3 py-2 text-ink font-rajdhani text-sm placeholder-ink-3 focus:border-gold focus:outline-none w-full transition-colors'
      : 'bg-surface-2 border border-[#2A3147] pl-12 pr-4 py-4 text-ink font-rajdhani text-lg placeholder-ink-3 focus:border-gold focus:outline-none w-full transition-colors focus:shadow-[0_0_0_1px_#C89B3C40]'

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Search
          className={`absolute left-${size === 'sm' ? '2' : '4'} top-1/2 -translate-y-1/2 text-gold-dim pointer-events-none`}
          size={size === 'sm' ? 14 : 18}
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => {
            setQuery(e.target.value)
            setOpen(e.target.value.length > 0)
          }}
          onFocus={() => query.length > 0 && setOpen(true)}
          placeholder={isLoading ? 'Loading champions...' : placeholder}
          className={inputClasses}
          disabled={isLoading}
          autoComplete="off"
        />
      </div>

      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 bg-surface-1 border border-[#2A3147] border-t-0 shadow-2xl max-h-72 overflow-y-auto">
          {results.map(champion => (
            <button
              key={champion.id}
              onClick={() => handleSelect(champion)}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-surface-3 transition-colors text-left group"
            >
              <img
                src={champion.icon}
                alt={champion.name}
                className="w-8 h-8 border border-gold-dark/30 group-hover:border-gold/50 transition-colors flex-shrink-0"
                onError={e => (e.currentTarget.style.display = 'none')}
              />
              <div>
                <p className="font-rajdhani font-semibold text-ink text-sm leading-none">
                  {champion.name}
                </p>
                <p className="font-rajdhani text-ink-3 text-xs">{champion.title}</p>
              </div>
              <div className="ml-auto flex gap-1">
                {champion.tags.slice(0, 2).map(tag => (
                  <span
                    key={tag}
                    className="text-[10px] font-rajdhani font-semibold tracking-wider text-gold-dim border border-gold-dark/30 px-1.5 py-0.5"
                  >
                    {tag.toUpperCase()}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
