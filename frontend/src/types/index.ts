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

export interface SummonerInfo {
  puuid: string
  game_name: string
  tag_line: string
  profile_icon_url: string
  summoner_level: number
}

export interface RankedStats {
  tier: string
  rank: string
  league_points: number
  wins: number
  losses: number
  win_rate: number
}

export interface MatchSummary {
  match_id: string
  champion: string
  champion_icon: string
  win: boolean
  kills: number
  deaths: number
  assists: number
  kda: number
  cs: number
  game_duration: number
  game_creation: number
  queue_id: number
  role: string
}

export interface ChampionStat {
  champion: string
  champion_icon: string
  games: number
  wins: number
  losses: number
  win_rate: number
}

export interface SummonerProfile {
  summoner: SummonerInfo
  ranked: RankedStats | null
  matches: MatchSummary[]
  champion_stats: ChampionStat[]
  version: string
}

export interface ItemSlot {
  id: number
  name: string
  icon: string
}

export interface MatchParticipant {
  puuid: string
  summoner_name: string
  champion: string
  champion_icon: string
  role: string
  kills: number
  deaths: number
  assists: number
  kda: number
  cs: number
  win: boolean
  items: (ItemSlot | null)[]
}

export interface MatchDetailResponse {
  match_id: string
  game_duration: number
  winning_team: 100 | 200 | null
  blue_team: MatchParticipant[]
  red_team: MatchParticipant[]
}

export interface AnalyzedItem {
  name: string
  reasoning: string
  icon: string
}

export interface BuildAnalysisResponse {
  champion: string
  role: string
  items: AnalyzedItem[]
  boots: AnalyzedItem
  comp_summary: string
}

export interface LiveGameParticipant {
  puuid: string
  summoner_name: string
  team_id: number
  champion_id: number
  champion_name: string
  champion_icon_url: string
  position: string | null
  spell1_id: number
  spell2_id: number
}

export interface LiveGameData {
  game_id: number
  game_start_time: number
  game_mode: string
  participants: LiveGameParticipant[]
}
