import { useState } from 'react'
import type { ItemMeta } from '../types'

interface ItemIconProps {
  item: ItemMeta
  size?: 'sm' | 'md' | 'lg'
  showTooltip?: boolean
  animationDelay?: number
}

const sizes = {
  sm: 'w-10 h-10',
  md: 'w-14 h-14',
  lg: 'w-16 h-16 md:w-20 md:h-20',
}

export default function ItemIcon({
  item,
  size = 'md',
  showTooltip = true,
  animationDelay = 0,
}: ItemIconProps) {
  const [imgError, setImgError] = useState(false)
  const [tooltipVisible, setTooltipVisible] = useState(false)

  return (
    <div
      className="relative group"
      style={{ animationDelay: `${animationDelay}ms` }}
      onMouseEnter={() => setTooltipVisible(true)}
      onMouseLeave={() => setTooltipVisible(false)}
    >
      <div
        className={`
          ${sizes[size]} relative overflow-hidden
          border border-gold-dark/40
          hover:border-gold/80 hover:shadow-[0_0_12px_#C89B3C40]
          transition-all duration-200 cursor-pointer
          animate-fade-in
        `}
      >
        {!imgError ? (
          <img
            src={item.icon}
            alt={item.name}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full bg-surface-3 flex items-center justify-center">
            <span className="text-ink-3 text-xs font-rajdhani">{item.id}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gold/0 group-hover:bg-gold/5 transition-colors duration-150" />
      </div>

      {showTooltip && tooltipVisible && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none w-48">
          <div className="bg-surface-1 border border-gold-dark/60 p-2 shadow-xl">
            <p className="font-rajdhani font-semibold text-gold text-sm leading-tight">
              {item.name}
            </p>
            {item.description && (
              <p className="font-rajdhani text-ink-2 text-xs mt-1 leading-snug">
                {item.description}
              </p>
            )}
            {item.gold > 0 && (
              <p className="font-rajdhani text-gold-light text-xs mt-1">
                {item.gold.toLocaleString()}g
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
