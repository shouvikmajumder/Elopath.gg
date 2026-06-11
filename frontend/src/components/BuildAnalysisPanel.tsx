import { Sparkles } from 'lucide-react'
import type { BuildAnalysisResponse, AnalyzedItem } from '../types'

interface BuildAnalysisPanelProps {
  data: BuildAnalysisResponse
}

function AnalyzedItemSlot({ item }: { item: AnalyzedItem }) {
  return (
    <div className="flex flex-col items-center gap-1">
      {item.icon ? (
        <img
          src={item.icon}
          alt={item.name}
          title={item.reasoning}
          className="w-8 h-8 flex-shrink-0 border border-[#2A3147] object-cover"
        />
      ) : (
        <div
          className="w-8 h-8 flex-shrink-0 border border-[#2A3147] bg-[#0D1117]"
          title={item.reasoning}
          aria-label={item.name}
        />
      )}
      <span className="font-rajdhani text-[10px] text-ink-2 truncate max-w-[40px] text-center leading-none">
        {item.name}
      </span>
    </div>
  )
}

export default function BuildAnalysisPanel({ data }: BuildAnalysisPanelProps) {
  return (
    <div className="border-t border-[#2A3147] bg-surface">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-[#2A3147]">
        <Sparkles size={12} className="text-gold flex-shrink-0" />
        <span className="font-cinzel text-xs font-bold tracking-[0.2em] text-gold uppercase">
          Recommended Build
        </span>
        <span className="font-rajdhani text-[10px] text-ink-3 ml-auto uppercase tracking-wider">
          {data.champion} &middot; {data.role}
        </span>
      </div>

      {/* Comp summary */}
      <p className="font-rajdhani text-xs italic text-ink-3 px-4 py-2 border-b border-[#2A3147]/50">
        {data.comp_summary}
      </p>

      {/* Core items */}
      <div className="px-4 py-3 border-b border-[#2A3147]/50">
        <p className="font-rajdhani text-[10px] text-ink-3 uppercase tracking-widest mb-2">
          Core Items
        </p>
        <div
          className="flex items-start gap-2 flex-wrap"
          role="list"
          aria-label="Recommended core items"
        >
          {data.items.map((item, idx) => (
            <div key={idx} role="listitem">
              <AnalyzedItemSlot item={item} />
            </div>
          ))}
        </div>
      </div>

      {/* Boots */}
      <div className="px-4 py-3">
        <p className="font-rajdhani text-[10px] text-ink-3 uppercase tracking-widest mb-2">
          Boots
        </p>
        <div
          className="flex items-center gap-3"
          role="list"
          aria-label="Recommended boots"
        >
          <div role="listitem">
            <AnalyzedItemSlot item={data.boots} />
          </div>
          <p
            className="font-rajdhani text-xs text-ink-3 italic leading-snug max-w-[280px]"
            title={data.boots.reasoning}
          >
            {data.boots.reasoning}
          </p>
        </div>
      </div>
    </div>
  )
}
