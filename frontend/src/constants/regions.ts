export interface RegionOption {
  value: string
  label: string
}

export const REGIONS: RegionOption[] = [
  { value: 'na1', label: 'North America' },
  { value: 'euw1', label: 'EU West' },
  { value: 'eun1', label: 'EU Nordic & East' },
  { value: 'kr', label: 'Korea' },
  { value: 'br1', label: 'Brazil' },
  { value: 'jp1', label: 'Japan' },
  { value: 'lan1', label: 'LAT North' },
  { value: 'las1', label: 'LAT South' },
  { value: 'oc1', label: 'Oceania' },
  { value: 'tr1', label: 'Turkey' },
  { value: 'ru', label: 'Russia' },
]

export const DEFAULT_REGION = 'na1'

export function regionLabel(platform: string): string {
  return REGIONS.find(r => r.value === platform)?.label ?? platform.toUpperCase()
}
