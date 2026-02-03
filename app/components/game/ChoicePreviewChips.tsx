'use client';

import type { RiskTier } from '@/app/lib/game-logic/combat/types';

interface ChoicePreviewChipsProps {
  riskTier: RiskTier;
  estimatedChance?: number;
  /** Optional hint text to show instead of percent (e.g., "Prep: +1 Stability leverage") */
  hintText?: string;
  /** Show percent only if explicitly true AND no hintText provided */
  showPercent?: boolean;
}

// Risk tier styling
const RISK_STYLES: Record<RiskTier, { bg: string; text: string; label: string }> = {
  great: { bg: 'bg-green-100', text: 'text-green-700', label: 'Great' },
  good: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Good' },
  risky: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Risky' },
  dangerous: { bg: 'bg-red-100', text: 'text-red-700', label: 'Dangerous' },
};

export function ChoicePreviewChips({
  riskTier,
  estimatedChance,
  hintText,
  showPercent = false,
}: ChoicePreviewChipsProps) {
  const riskStyle = RISK_STYLES[riskTier];

  // Determine what to show after risk label
  const showPercentValue = showPercent && !hintText && estimatedChance !== undefined;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {/* Risk label */}
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${riskStyle.bg} ${riskStyle.text}`}
      >
        {riskStyle.label}
        {showPercentValue && (
          <span className="ml-1 opacity-80">~{estimatedChance}%</span>
        )}
      </span>

      {/* Hint text (e.g., "Prep: +1 Stability leverage") */}
      {hintText && (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-500/20 text-blue-300">
          {hintText}
        </span>
      )}
    </div>
  );
}
