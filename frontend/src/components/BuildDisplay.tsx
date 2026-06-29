import { Shield, TrendingUp, Database, ChevronRight } from 'lucide-react'
import ItemIcon from './ItemIcon'
import type { BuildRecommendation } from '../types'

interface BuildDisplayProps {
  build: BuildRecommendation
}

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100)
  const color = pct >= 70 ? 'bg-win' : pct >= 40 ? 'bg-gold' : 'bg-loss'
  return (
    <div className="flex items-center gap-2">
      <div className="w-24 h-1.5 bg-surface-3 overflow-hidden">
        <div
          className={`h-full ${color} transition-all duration-1000`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="font-rajdhani text-xs text-ink-2">{pct}%</span>
    </div>
  )
}

function WinRateDisplay({ rate }: { rate: number }) {
  const pct = (rate * 100).toFixed(1)
  const isGood = rate > 0.52
  const isGreat = rate > 0.55
  const color = isGreat ? 'text-win' : isGood ? 'text-gold-light' : 'text-ink'

  return (
    <div className="text-center">
      <div className={`font-rajdhani text-4xl font-bold tracking-tight ${color} animate-counter`}>
        {pct}%
      </div>
      <div className="font-rajdhani text-xs tracking-[0.15em] text-ink-3 mt-0.5 uppercase">
        Win Rate
      </div>
    </div>
  )
}

export default function BuildDisplay({ build }: BuildDisplayProps) {
  return (
    <div className="space-y-8">

      {/* ── Stats bar ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-px bg-[#2A3147]">
        <div className="bg-surface-2 p-4 text-center">
          <WinRateDisplay rate={build.win_rate} />
        </div>
        <div className="bg-surface-2 p-4 text-center flex flex-col items-center justify-center gap-1">
          <div className="font-rajdhani text-2xl font-bold text-ink animate-counter">
            {build.sample_size > 0 ? build.sample_size.toLocaleString() : '—'}
          </div>
          <div className="font-rajdhani text-xs tracking-[0.15em] text-ink-3 uppercase">
            Games Analyzed
          </div>
          <div className="flex items-center gap-1 mt-1">
            <Database size={10} className="text-ink-3" />
            <span className="font-rajdhani text-[10px] text-ink-3 capitalize">
              {build.data_source}
            </span>
          </div>
        </div>
        <div className="bg-surface-2 p-4 flex flex-col items-center justify-center gap-2">
          <div className="font-rajdhani text-xs tracking-[0.15em] text-ink-3 uppercase mb-1">
            Confidence
          </div>
          <ConfidenceBar value={build.confidence} />
          <div className="font-rajdhani text-xs text-ink-2">
            {build.confidence >= 0.7 ? 'High data volume' :
             build.confidence >= 0.4 ? 'Moderate data volume' :
             'Limited matchup data'}
          </div>
        </div>
      </div>

      {/* ── Core Build ────────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gold-dark/40 to-transparent" />
          <span className="font-playfair font-semibold text-xs tracking-[0.3em] text-gold uppercase">
            Optimal Build Path
          </span>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gold-dark/40 to-transparent" />
        </div>

        <div className="flex items-center justify-center flex-wrap gap-2 md:gap-3">
          {build.items.map((item, i) => (
            <div key={item.id} className="flex items-center gap-2 md:gap-3">
              <ItemIcon
                item={item}
                size="lg"
                animationDelay={i * 80}
              />
              {i < build.items.length - 1 && (
                <ChevronRight
                  size={16}
                  className="text-gold-dark/60 hidden sm:block flex-shrink-0"
                  style={{ animationDelay: `${i * 80 + 40}ms` }}
                />
              )}
            </div>
          ))}
        </div>

        {/* Item names row */}
        <div className="flex items-center justify-center flex-wrap gap-2 md:gap-3 mt-2">
          {build.items.map(item => (
            <div key={item.id} className="w-16 md:w-20 text-center">
              <p className="font-rajdhani text-[10px] text-ink-3 leading-tight truncate px-0.5">
                {item.name}
              </p>
            </div>
          ))}
        </div>

        {/* Boots */}
        <div className="flex items-center justify-center gap-3 mt-5 pt-5 border-t border-[#2A3147]">
          <span className="font-rajdhani text-xs tracking-[0.15em] text-ink-3 uppercase">
            Boots
          </span>
          <ItemIcon item={build.boots} size="md" />
          <span className="font-rajdhani font-semibold text-ink-2 text-sm">
            {build.boots.name}
          </span>
        </div>
      </div>

      {/* ── Build Order Timeline ──────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gold-dark/40 to-transparent" />
          <span className="font-playfair font-semibold text-xs tracking-[0.3em] text-gold uppercase">
            Build Order
          </span>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gold-dark/40 to-transparent" />
        </div>

        <div className="space-y-0">
          {build.build_order.map((phase, i) => (
            <div
              key={phase.phase}
              className="flex gap-4 group animate-slide-right"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              {/* Timeline dot + line */}
              <div className="flex flex-col items-center flex-shrink-0 pt-1">
                <div className="w-2 h-2 rounded-full bg-gold border-2 border-gold-dark flex-shrink-0" />
                {i < build.build_order.length - 1 && (
                  <div className="w-px flex-1 bg-[#2A3147] mt-1 mb-0" />
                )}
              </div>

              {/* Content */}
              <div className={`pb-5 ${i === build.build_order.length - 1 ? 'pb-0' : ''}`}>
                <p className="font-playfair font-semibold text-xs text-gold tracking-wider mb-1">
                  {phase.phase.toUpperCase()}
                </p>
                <p className="font-rajdhani text-ink-2 text-sm mb-2 leading-snug">
                  {phase.description}
                </p>
                <div className="flex flex-wrap gap-1">
                  {phase.items.map(itemId => (
                    <div
                      key={itemId}
                      className="w-8 h-8 border border-gold-dark/30 overflow-hidden"
                    >
                      <img
                        src={`https://ddragon.leagueoflegends.com/cdn/${build.version}/img/item/${itemId}.png`}
                        alt={`Item ${itemId}`}
                        className="w-full h-full object-cover"
                        onError={e => ((e.currentTarget as HTMLImageElement).style.display = 'none')}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Why This Build ────────────────────────────────────────────────── */}
      {build.comp_notes.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gold-dark/40 to-transparent" />
            <span className="font-playfair font-semibold text-xs tracking-[0.3em] text-gold uppercase">
              Why This Build
            </span>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gold-dark/40 to-transparent" />
          </div>

          <div className="space-y-2">
            {build.comp_notes.map((note, i) => (
              <div
                key={i}
                className="flex gap-3 items-start bg-surface-2 border-l-2 border-gold-dark/60 px-4 py-3 animate-fade-up"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <TrendingUp size={14} className="text-gold mt-0.5 flex-shrink-0" />
                <p className="font-rajdhani text-ink-2 text-sm leading-snug">{note}</p>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
