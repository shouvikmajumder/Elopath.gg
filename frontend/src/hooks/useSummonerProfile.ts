import { useQuery } from '@tanstack/react-query'
import { fetchSummonerProfile } from '../services/api'

export function useSummonerProfile(platform?: string, gameName?: string, tagLine?: string) {
  const query = useQuery({
    queryKey: ['summoner', platform, gameName, tagLine],
    queryFn: () => fetchSummonerProfile(platform!, gameName!, tagLine!),
    enabled: !!(platform && gameName && tagLine),
    retry: false,
    staleTime: 1000 * 60,
  })

  return {
    profile: query.data,
    isLoading: query.isLoading,
    error: query.error,
  }
}
