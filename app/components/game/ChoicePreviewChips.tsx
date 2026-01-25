'use client';

import type { DisplayChip, RiskTier } from '@/app/lib/game-logic/combat/types';

interface ChoicePreviewChipsProps {
  riskTier: RiskTier;
  estimatedChance: number;
  displayChips: DisplayChip[];
  showPercent?: boolean;
}

// Risk tier styling
const RISK_STYLES: Record<RiskTier, { bg: string; text: string; label: string }> = {
  great: { bg: 'bg-green-100', text: 'text-green-700', label: 'Great' },
  good: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Good' },
  risky: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Risky' },
  dangerous: { bg: 'bg-red-100', text: 'text-red-700', label: 'Dangerous' },
};

// Format chip value with sign
function formatChipValue(value: number | undefined): string {
  if (value === undefined || value === 0) return '';
  return value > 0 ? ` +${value}` : ` ${value}`;
}

export function ChoicePreviewChips({
  riskTier,
  estimatedChance,
  displayChips,
  showPercent = true,
}: ChoicePreviewChipsProps) {
  const riskStyle = RISK_STYLES[riskTier];

  // Mobile: max 2 chips, Desktop: max 3 chips
  // We'll use responsive classes to show/hide the third chip
  const visibleChips = displayChips.slice(0, 3);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {/* Risk label with optional percent */}
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${riskStyle.bg} ${riskStyle.text}`}
      >
        {riskStyle.label}
        {showPercent && (
          <span className="ml-1 opacity-80">~{estimatedChance}%</span>
        )}
      </span>

      {/* Modifier chips */}
      {visibleChips.map((chip, index) => (
        <span
          key={`${chip.type}-${index}`}
          className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 ${
            // Hide third chip on mobile
            index === 2 ? 'hidden sm:inline-flex' : ''
          }`}
        >
          {chip.label}
          {chip.value !== undefined && chip.value !== 0 && (
            <span
              className={`ml-0.5 ${
                chip.value > 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {formatChipValue(chip.value)}
            </span>
          )}
        </span>
      ))}
    </div>
  );
}
