export type Role = 'TOP' | 'JUNGLE' | 'MID' | 'ADC' | 'SUPPORT'

export interface Champion {
  id: string
  key: string
  name: string
  title: string
  tags: string[]
  icon: string
  splash: string
}

export interface ItemMeta {
  id: number
  name: string
  description: string
  gold: number
  icon: string
}

export interface BuildPhase {
  phase: string
  items: number[]
  description: string
}

export interface BuildRecommendation {
  champion: string
  role: Role
  lane_opponent: string
  items: ItemMeta[]
  boots: ItemMeta
  win_rate: number
  sample_size: number
  confidence: number
  build_order: BuildPhase[]
  comp_notes: string[]
  comp_hash: string
  data_source: 'seeded' | 'live' | 'fallback'
  version: string
}

export interface BuildRequest {
  champion: string
  role: Role
  lane_opponent: string
  ally_team: string[]
  enemy_team: string[]
}
