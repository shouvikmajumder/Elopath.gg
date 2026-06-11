import axios from 'axios'
import type { BuildRequest, BuildRecommendation, Champion } from '../types'

const client = axios.create({
  baseURL: '/api/v1',
  timeout: 15000,
})

export async function fetchChampions(): Promise<{ version: string; champions: Champion[] }> {
  const { data } = await client.get('/champions/')
  return data
}

export async function fetchVersion(): Promise<string> {
  const { data } = await client.get('/champions/version')
  return data.version
}

export async function fetchBuildRecommendation(
  req: BuildRequest
): Promise<BuildRecommendation> {
  const { data } = await client.post('/builds/recommend', req)
  return data
}

export const DD_BASE = 'https://ddragon.leagueoflegends.com'

export function championIconUrl(championId: string, version: string): string {
  return `${DD_BASE}/cdn/${version}/img/champion/${championId}.png`
}

export function championSplashUrl(championId: string, skin = 0): string {
  return `${DD_BASE}/cdn/img/champion/splash/${championId}_${skin}.jpg`
}

export function itemIconUrl(itemId: number, version: string): string {
  return `${DD_BASE}/cdn/${version}/img/item/${itemId}.png`
}
