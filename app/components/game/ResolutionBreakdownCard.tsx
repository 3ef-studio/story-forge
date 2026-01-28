'use client';

import { Dice5, Target, TrendingDown, TrendingUp, Minus } from 'lucide-react';

type Modifier = {
  label: string;
  value: number;
};

type Outcome = 'success' | 'partial' | 'failure';

interface ResolutionBreakdownCardProps {
  outcome: Outcome;
  roll: number;
  target: number;
  modifiers: Modifier[];
  summary: string;
  isRetreat?: boolean;
}

export function ResolutionBreakdownCard({
  outcome,
  roll,
  target,
  modifiers,
  summary,
  isRetreat = false,
}: ResolutionBreakdownCardProps) {
  const outcomeStyles: Record<Outcome, { bg: string; text: string; label: string }> = {
    success: { bg: 'bg-green-500/20', text: 'text-green-400', label: isRetreat ? 'Escaped' : 'Success' },
    partial: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'Partial' },
    failure: { bg: 'bg-red-500/20', text: 'text-red-400', label: isRetreat ? 'Caught' : 'Failure' },
  };

  const style = outcomeStyles[outcome];
  const rollSuccess = isRetreat ? roll < target : roll >= target;

  return (
    <div className="bg-white/5 rounded-lg border border-white/10 p-3 space-y-3">
      {/* Header with outcome */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-white/50 uppercase tracking-wide">
          Resolution
        </span>
        <span className={`text-xs font-bold px-2 py-0.5 rounded ${style.bg} ${style.text}`}>
          {style.label}
        </span>
      </div>

      {/* Roll vs Target */}
      <div className="flex items-center justify-center gap-4">
        <div className="text-center">
          <div className="flex items-center gap-1 text-white/50 text-xs mb-1">
            <Dice5 className="h-3 w-3" />
            <span>Roll</span>
          </div>
          <span className={`text-2xl font-bold ${rollSuccess ? 'text-green-400' : 'text-red-400'}`}>
            {roll}{isRetreat ? '%' : ''}
          </span>
        </div>

        <div className="text-white/40 text-lg">{isRetreat ? '<' : 'vs'}</div>

        <div className="text-center">
          <div className="flex items-center gap-1 text-white/50 text-xs mb-1">
            <Target className="h-3 w-3" />
            <span>{isRetreat ? 'Escape Chance' : 'Target'}</span>
          </div>
          <span className="text-2xl font-bold text-white/80">{target}{isRetreat ? '%' : ''}</span>
        </div>
      </div>

      {/* Modifiers list */}
      {modifiers.length > 0 && (
        <div className="space-y-1 pt-2 border-t border-white/10">
          <span className="text-xs text-white/50">{isRetreat ? 'Escape Modifiers:' : 'Modifiers:'}</span>
          <div className="space-y-0.5">
            {modifiers.map((mod, idx) => {
              const isGood = isRetreat ? mod.value > 0 : mod.value < 0;
              const isBad = isRetreat ? mod.value < 0 : mod.value > 0;

              return (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <span className="text-white/60">{mod.label}</span>
                  <span className={`font-medium flex items-center gap-0.5 ${
                    isGood
                      ? 'text-green-400'
                      : isBad
                      ? 'text-red-400'
                      : 'text-white/50'
                  }`}>
                    {mod.value === 0 ? (
                      <>
                        <Minus className="h-3 w-3" />
                        <span>Base</span>
                      </>
                    ) : mod.value < 0 ? (
                      <>
                        <TrendingDown className="h-3 w-3" />
                        <span>{mod.value}{isRetreat ? '%' : ''}</span>
                      </>
                    ) : (
                      <>
                        <TrendingUp className="h-3 w-3" />
                        <span>+{mod.value}{isRetreat ? '%' : ''}</span>
                      </>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Summary */}
      <p className="text-xs text-white/50 italic pt-1 border-t border-white/10">
        {summary}
      </p>
    </div>
  );
}
