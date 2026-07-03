import { useState } from 'react'

const STORAGE_KEY = 'recentSearches'
const MAX_ENTRIES = 5

interface RecentSearch {
  riotId: string
  platform: string
}

function load(): RecentSearch[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as RecentSearch[]) : []
  } catch {
    return []
  }
}

function save(entries: RecentSearch[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
}

export function useRecentSearches() {
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>(load)

  function addSearch(riotId: string, platform: string) {
    const entry = { riotId, platform }
    const filtered = recentSearches.filter(
      s => !(s.riotId === riotId && s.platform === platform)
    )
    const next = [entry, ...filtered].slice(0, MAX_ENTRIES)
    save(next)
    setRecentSearches(next)
  }

  function removeSearch(index: number) {
    const next = recentSearches.filter((_, i) => i !== index)
    save(next)
    setRecentSearches(next)
  }

  return { recentSearches, addSearch, removeSearch }
}
