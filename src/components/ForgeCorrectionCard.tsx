import { useState } from 'react';
import { ChevronDown, ChevronUp, Wand2, ArrowRight, Wrench, Sparkles } from 'lucide-react';
import type { ForgeCorrectionInfo } from '@/hooks/useVoiceAssistant';
import { cn } from '@/lib/utils';

interface ForgeCorrectionCardProps {
  correction: ForgeCorrectionInfo;
  className?: string;
  /** 卡片风格 */
  variant?: 'light' | 'dark';
}

/**
 * 锻造专业文本矫正信息展示卡片
 * 显示：矫正前原文 → 矫正后文本 + 修正明细
 */
export default function ForgeCorrectionCard({
  correction,
  className,
  variant = 'light',
}: ForgeCorrectionCardProps) {
  const [expanded, setExpanded] = useState(false);

  if (!correction) return null;

  const hasCorrections =
    (correction.localCorrections && correction.localCorrections.length > 0) ||
    (correction.aiCorrections && correction.aiCorrections.length > 0);

  const isDark = variant === 'dark';

  return (
    <div
      className={cn(
        'rounded-2xl overflow-hidden border animate-slide-up',
        isDark ? 'bg-white/10 border-white/20' : 'bg-cream-50 border-cream-200',
        className
      )}
    >
      {/* 矫正头部：原文 → 矫正后 */}
      <div className="px-4 py-3">
        <div className="flex items-center gap-1.5 mb-2">
          <Wand2 className={cn('w-3.5 h-3.5', isDark ? 'text-cream-200' : 'text-cream-700')} />
          <span className={cn('text-xs font-semibold', isDark ? 'text-cream-100' : 'text-coffee-800')}>
            锻造专业文本矫正
          </span>
          {correction.hasCorrection && (
            <span className={cn(
              'px-1.5 py-0.5 rounded-full text-[10px] font-medium',
              isDark ? 'bg-white/20 text-white' : 'bg-cream-200 text-cream-800'
            )}>
              已修正
            </span>
          )}
          {!correction.hasCorrection && (
            <span className={cn(
              'px-1.5 py-0.5 rounded-full text-[10px] font-medium',
              isDark ? 'bg-white/10 text-cream-200' : 'bg-coffee-50 text-coffee-500'
            )}>
              无需修正
            </span>
          )}
        </div>

        {/* 原文 → 矫正后 */}
        <div className="flex items-start gap-2 flex-wrap">
          <div className={cn(
            'flex-1 min-w-0 px-3 py-1.5 rounded-lg text-xs leading-relaxed',
            isDark ? 'bg-white/5 text-cream-200' : 'bg-white text-coffee-500 line-through decoration-coffee-300'
          )}>
            {correction.originalText || '（空）'}
          </div>
          {correction.hasCorrection && (
            <>
              <ArrowRight className={cn(
                'w-3.5 h-3.5 mt-1.5 shrink-0',
                isDark ? 'text-cream-300' : 'text-cream-600'
              )} />
              <div className={cn(
                'flex-1 min-w-0 px-3 py-1.5 rounded-lg text-xs leading-relaxed font-medium',
                isDark ? 'bg-white/15 text-white' : 'bg-coffee-100 text-coffee-800'
              )}>
                {correction.correctedText}
              </div>
            </>
          )}
        </div>
      </div>

      {/* 修正明细（可展开） */}
      {hasCorrections && (
        <div className="border-t border-current/10">
          <button
            onClick={() => setExpanded(!expanded)}
            className={cn(
              'w-full flex items-center justify-between px-4 py-2 text-xs transition-colors',
              isDark ? 'text-cream-200 hover:bg-white/5' : 'text-coffee-600 hover:bg-coffee-50'
            )}
          >
            <span className="flex items-center gap-1">
              <Wrench className="w-3 h-3" />
              修正明细（{correction.localCorrections.length + correction.aiCorrections.length} 项）
            </span>
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {expanded && (
            <div className="px-4 pb-3 space-y-1.5">
              {/* 本地正则修正 */}
              {correction.localCorrections.map((c, i) => (
                <div key={`local-${i}`} className="flex items-center gap-2 text-xs">
                  <span className={cn(
                    'px-1.5 py-0.5 rounded font-mono',
                    isDark ? 'bg-red-500/20 text-red-200' : 'bg-red-50 text-red-500 line-through'
                  )}>
                    {c.from}
                  </span>
                  <ArrowRight className={cn('w-3 h-3 shrink-0', isDark ? 'text-cream-400' : 'text-coffee-400')} />
                  <span className={cn(
                    'px-1.5 py-0.5 rounded font-mono font-medium',
                    isDark ? 'bg-green-500/20 text-green-200' : 'bg-green-50 text-green-600'
                  )}>
                    {c.to}
                  </span>
                  {c.type && (
                    <span className={cn('text-[10px]', isDark ? 'text-cream-400' : 'text-coffee-400')}>
                      [{c.type}]
                    </span>
                  )}
                </div>
              ))}

              {/* AI 深度修正 */}
              {correction.aiCorrections.map((c, i) => (
                <div key={`ai-${i}`} className="flex items-center gap-2 text-xs">
                  <Sparkles className={cn('w-3 h-3 shrink-0', isDark ? 'text-cream-300' : 'text-cream-600')} />
                  <span className={cn(
                    'px-1.5 py-0.5 rounded font-mono',
                    isDark ? 'bg-red-500/20 text-red-200' : 'bg-red-50 text-red-500 line-through'
                  )}>
                    {c.from}
                  </span>
                  <ArrowRight className={cn('w-3 h-3 shrink-0', isDark ? 'text-cream-400' : 'text-coffee-400')} />
                  <span className={cn(
                    'px-1.5 py-0.5 rounded font-mono font-medium',
                    isDark ? 'bg-green-500/20 text-green-200' : 'bg-green-50 text-green-600'
                  )}>
                    {c.to}
                  </span>
                  {c.reason && (
                    <span className={cn('text-[10px] truncate', isDark ? 'text-cream-400' : 'text-coffee-400')}>
                      {c.reason}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 备注 */}
      {correction.note && (
        <div className={cn(
          'px-4 py-2 text-[10px] border-t border-current/10',
          isDark ? 'text-cream-300 bg-white/5' : 'text-coffee-400 bg-coffee-50/50'
        )}>
          {correction.note}
        </div>
      )}
    </div>
  );
}
