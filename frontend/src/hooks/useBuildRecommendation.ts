import { useMutation } from '@tanstack/react-query'
import { fetchBuildRecommendation } from '../services/api'
import type { BuildRequest, BuildRecommendation } from '../types'

export function useBuildRecommendation() {
  const mutation = useMutation<BuildRecommendation, Error, BuildRequest>({
    mutationFn: fetchBuildRecommendation,
  })

  return {
    recommend: mutation.mutate,
    recommendAsync: mutation.mutateAsync,
    build: mutation.data,
    isLoading: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  }
}
