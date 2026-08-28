import axios from 'axios'
import type { SummonerProfile, MatchDetailResponse, LiveGameData } from '../types'

const client = axios.create({
  baseURL: '/api/v1',
  timeout: 15000,
})

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

export async function getLiveGame(
  platform: string,
  puuid: string
): Promise<LiveGameData> {
  const { data } = await client.get<LiveGameData>(`/live-game/${platform}/${puuid}`)
  return data
}

