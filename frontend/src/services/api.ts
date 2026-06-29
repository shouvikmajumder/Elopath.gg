import axios from 'axios'
import type { BuildRequest, BuildRecommendation, BuildAnalysisResponse, Champion, SummonerProfile, MatchDetailResponse, LiveGameData } from '../types'

const client = axios.create({
  baseURL: '/api/v1',
  timeout: 15000,
})

export async function fetchChampions(): Promise<{ version: string; champions: Champion[] }> {
  const { data } = await client.get('/champions/')
  return data
}

export async function fetchBuildRecommendation(
  req: BuildRequest
): Promise<BuildRecommendation> {
  const { data } = await client.post('/builds/recommend', req)
  return data
}

export async function fetchSummonerProfile(
  platform: string,
  gameName: string,
  tagLine: string
): Promise<SummonerProfile> {
  const { data } = await client.get(
    `/summoner/${platform}/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`
  )
  return data
}

export async function fetchMatchDetail(
  platform: string,
  matchId: string
): Promise<MatchDetailResponse> {
  const { data } = await client.get(`/match/${platform}/${matchId}`)
  return data
}

export async function fetchBuildAnalysis(
  platform: string,
  matchId: string,
  puuid: string
): Promise<BuildAnalysisResponse> {
  const { data } = await client.get(
    `/builds/analyze/${platform}/${matchId}`,
    { params: { puuid }, timeout: 30000 }
  )
  return data
}

export async function getLiveGame(
  platform: string,
  puuid: string
): Promise<LiveGameData> {
  const { data } = await client.get<LiveGameData>(`/live-game/${platform}/${puuid}`)
  return data
}

