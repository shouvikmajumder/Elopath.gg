import { ChevronDown } from 'lucide-react'
import { REGIONS } from '../constants/regions'

interface RegionSelectProps {
  value: string
  onChange: (value: string) => void
  size?: 'sm' | 'default'
}

export default function RegionSelect({ value, onChange, size = 'default' }: RegionSelectProps) {
  const sizeClasses =
    size === 'sm'
      ? 'pl-3 pr-8 py-2 text-sm'
      : 'pl-4 pr-10 py-4 text-lg'

  return (
    <div className="relative flex-shrink-0">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        aria-label="Region"
        className={`
          appearance-none bg-surface-2 border border-[#2A3147] text-ink font-rajdhani font-semibold
          focus:border-gold focus:outline-none transition-colors cursor-pointer w-full
          ${sizeClasses}
        `}
      >
        {REGIONS.map(region => (
          <option key={region.value} value={region.value}>
            {region.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={size === 'sm' ? 14 : 18}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gold-dim pointer-events-none"
      />
    </div>
  )
}
