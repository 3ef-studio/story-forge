'use client';

import {
  getIntentBand,
  getIntentBandLabel,
  getIntentMeterColor,
  INTENT_MIN,
  INTENT_MAX,
} from '@/app/lib/game-logic/intent';

interface IntentMeterProps {
  score: number;
  showScore?: boolean;
  compact?: boolean;
}

/**
 * IntentMeter - displays the player's intent score on a Villain ↔ Hero axis.
 *
 * Features:
 * - Visual meter bar showing position from Villain (-100) to Hero (+100)
 * - Intent band label (Villain, Criminal, Neutral, Vigilante, Hero)
 * - Optional numeric score display
 * - Compact mode for smaller UI contexts
 */
export function IntentMeter({ score, showScore = false, compact = false }: IntentMeterProps) {
  const band = getIntentBand(score);
  const label = getIntentBandLabel(band);
  const meterColor = getIntentMeterColor(band);

  // Calculate position percentage (0% = -100, 50% = 0, 100% = +100)
  const position = ((score - INTENT_MIN) / (INTENT_MAX - INTENT_MIN)) * 100;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <span className={`text-xs font-medium ${getIntentTextColor(band)}`}>
          {label}
        </span>
        <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full transition-all duration-300 relative"
            style={{ width: '100%' }}
          >
            <div
              className={`absolute h-full w-1.5 rounded-full ${meterColor}`}
              style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {/* Label row */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-white/60">Intent</span>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${getIntentTextColor(band)}`}>
            {label}
          </span>
          {showScore && (
            <span className="text-xs text-white/40">
              ({score > 0 ? '+' : ''}{score})
            </span>
          )}
        </div>
      </div>

      {/* Meter bar */}
      <div className="relative">
        {/* Background gradient from red (villain) to cyan (hero) */}
        <div className="h-2 rounded-full bg-gradient-to-r from-red-900/40 via-gray-700/40 to-cyan-900/40 border border-white/10" />

        {/* Position indicator */}
        <div
          className={`absolute top-0 h-2 w-2 rounded-full ${meterColor} border border-white/30 shadow-lg transition-all duration-300`}
          style={{ left: `calc(${position}% - 4px)` }}
        />

        {/* Center marker (neutral point) */}
        <div className="absolute top-0 left-1/2 h-2 w-px bg-white/20 -translate-x-1/2" />
      </div>

      {/* Axis labels */}
      <div className="flex justify-between text-[10px] text-white/30">
        <span>Villain</span>
        <span>Hero</span>
      </div>
    </div>
  );
}

function getIntentTextColor(band: ReturnType<typeof getIntentBand>): string {
  switch (band) {
    case 'villain': return 'text-red-400';
    case 'criminal': return 'text-orange-400';
    case 'neutral': return 'text-gray-300';
    case 'vigilante': return 'text-blue-400';
    case 'hero': return 'text-cyan-400';
  }
}

export default IntentMeter;
