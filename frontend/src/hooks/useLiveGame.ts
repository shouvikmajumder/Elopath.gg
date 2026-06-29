import { useQuery } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { getLiveGame } from '../services/api'
import type { LiveGameData } from '../types'

export function useLiveGame(platform: string | null, puuid: string | null) {
  return useQuery<LiveGameData | null>({
    queryKey: ['live-game', platform, puuid],
    queryFn: async () => {
      try {
        return await getLiveGame(platform!, puuid!)
      } catch (err) {
        if (isAxiosError(err) && err.response?.status === 404) {
          return null
        }
        throw err
      }
    },
    enabled: !!platform && !!puuid,
    refetchInterval: 30_000,
    retry: false,
  })
}
