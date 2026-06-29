import { useQuery } from '@tanstack/react-query'
import { fetchChampions } from '../services/api'
import type { Champion } from '../types'

export function useChampions() {
  const query = useQuery({
    queryKey: ['champions'],
    queryFn: fetchChampions,
    staleTime: 1000 * 60 * 30, // 30 minutes
    gcTime: 1000 * 60 * 60,
  })

  return {
    champions: query.data?.champions ?? [],
    version: query.data?.version ?? '',
    isLoading: query.isLoading,
    error: query.error,
  }
}

export function useChampionSearch(query: string, champions: Champion[]): Champion[] {
  if (query.length < 1) return []
  const q = query.toLowerCase()
  return champions
    .filter(c => c.name.toLowerCase().includes(q))
    .slice(0, 8)
}
