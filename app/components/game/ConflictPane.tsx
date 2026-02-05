'use client';

import { useRef, useEffect, useState } from 'react';
import { AnimatedCard } from '@/app/components/ui/AnimatedCard';
import {
  CONFLICT_MOVES,
  isMoveAvailable,
  evaluateOutcome,
  getPlayerMoves,
} from '@/app/lib/game-logic/conflict/engine';
import type { ConflictState, MoveId } from '@/app/lib/game-logic/conflict/types';
import type { GambitResult, GambitEffect } from '@/app/lib/game-logic/combat/types';
import {
  type LeverageState,
  type LeverageSpend,
  type LeverageType,
  LEVERAGE_EFFECTS,
  LEVERAGE_EFFECT_LABELS,
} from '@/app/lib/game-logic/leverage';

interface ConflictPaneProps {
  state: ConflictState;
  leverage: LeverageState;
  onPlayerMove: (move: MoveId) => void;
  onLeverageSpend: (spend: LeverageSpend) => void;
  onContinue: () => void;
}

const RESOURCE_COLORS: Record<string, string> = {
  control: 'bg-blue-400',
  stability: 'bg-green-400',
  position: 'bg-amber-400',
};

const RESOURCE_LABELS: Record<string, string> = {
  control: 'Control',
  stability: 'Stability',
  position: 'Position',
};

const LEVERAGE_COLORS: Record<LeverageType, string> = {
  control: 'bg-blue-500/30 border-blue-500/40 text-blue-300',
  stability: 'bg-green-500/30 border-green-500/40 text-green-300',
  position: 'bg-amber-500/30 border-amber-500/40 text-amber-300',
};

// Gambit outcome styling
const GAMBIT_OUTCOME_STYLES = {
  clean: { bg: 'bg-green-500/20', border: 'border-green-500/40', text: 'text-green-300', label: 'Clean' },
  complication: { bg: 'bg-yellow-500/20', border: 'border-yellow-500/40', text: 'text-yellow-300', label: 'Complication' },
  backfire: { bg: 'bg-red-500/20', border: 'border-red-500/40', text: 'text-red-300', label: 'Backfire' },
} as const;

/** Format gambit effects for display */
function formatGambitEffects(effects: GambitEffect[]): string {
  return effects.map((e) => {
    const targetLabel = e.target === 'player' ? 'You' : 'Enemy';
    const sign = e.delta > 0 ? '+' : '';
    const resource = e.resource.charAt(0).toUpperCase() + e.resource.slice(1);
    return `${targetLabel} ${sign}${e.delta} ${resource}`;
  }).join(', ');
}

function ResourceBar({ label, value, maxValue, colorClass }: {
  label: string;
  value: number;
  maxValue: number;
  colorClass: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-white/60 w-16 text-right">{label}</span>
      <div className="flex gap-1">
        {Array.from({ length: maxValue }).map((_, i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-sm transition-all duration-300 ${
              i < value ? colorClass : 'bg-white/10'
            }`}
          />
        ))}
      </div>
      <span className="text-xs text-white/40 w-4">{value}</span>
    </div>
  );
}

export function ConflictPane({ state, leverage, onPlayerMove, onLeverageSpend, onContinue }: ConflictPaneProps) {
  const logRef = useRef<HTMLDivElement>(null);
  const [spendingType, setSpendingType] = useState<LeverageType | null>(null);
  const [gambitBannerDismissed, setGambitBannerDismissed] = useState(false);
  const availableMoves = getPlayerMoves(state);
  const result = state.ended ? evaluateOutcome(state) : null;
  const hasAnyLeverage = leverage.control + leverage.stability + leverage.position > 0;
  const hasArmedLeverage = !!state.armedLeverage;
  const gambit = state.gambitResult;

  // Auto-scroll log
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [state.log.length]);

  // Reset spending panel on new turn
  useEffect(() => {
    setSpendingType(null);
  }, [state.turn]);

  const outcomeColor = result
    ? result.outcome === 'player_victory'
      ? 'border-green-500/50'
      : result.outcome === 'opponent_victory'
        ? 'border-red-500/50'
        : 'border-amber-500/50'
    : '';

  const outcomeTextColor = result
    ? result.outcome === 'player_victory'
      ? 'text-green-400'
      : result.outcome === 'opponent_victory'
        ? 'text-red-400'
        : 'text-amber-400'
    : '';

  const outcomeLabel = result
    ? result.outcome === 'player_victory'
      ? 'Victory'
      : result.outcome === 'opponent_victory'
        ? 'Defeat'
        : 'Stalemate'
    : '';

  const handleSpendEffect = (spend: LeverageSpend) => {
    onLeverageSpend(spend);
    setSpendingType(null);
  };

  return (
    <AnimatedCard variant="panel" className="panel-glass border border-white/15 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-white">Conflict</h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/70">
            Turn {Math.min(state.turn, state.maxTurns)}/{state.maxTurns}
          </span>
          {/* Heat badge */}
          {state.heatAtStart !== undefined && state.heatAtStart > 0 && (
            <span className={`text-xs px-1.5 py-0.5 rounded ${
              state.heatAtStart >= 3
                ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                : 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
            }`}>
              Heat {state.heatAtStart}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {state.opponentIdentity && (
            <>
              <span className="text-xs px-1.5 py-0.5 rounded bg-white/10 text-white/50 capitalize">
                {state.opponentIdentity.archetype}
              </span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-red-500/20 text-red-300">
                Threat {state.opponentIdentity.threatTier}
              </span>
            </>
          )}
          {/* Enemy Leverage badges */}
          {state.opponentLeverage && (state.opponentLeverage.control > 0 || state.opponentLeverage.stability > 0 || state.opponentLeverage.position > 0) && (
            <div className="flex gap-1">
              {state.opponentLeverage.control > 0 && (
                <span className="text-xs px-1 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  C{state.opponentLeverage.control}
                </span>
              )}
              {state.opponentLeverage.stability > 0 && (
                <span className="text-xs px-1 py-0.5 rounded bg-green-500/20 text-green-300 border border-green-500/30">
                  S{state.opponentLeverage.stability}
                </span>
              )}
              {state.opponentLeverage.position > 0 && (
                <span className="text-xs px-1 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  P{state.opponentLeverage.position}
                </span>
              )}
            </div>
          )}
          <span className="text-sm text-white/50">vs {state.opponent.label}</span>
        </div>
      </div>

      {/* Gambit Outcome Banner */}
      {gambit && !gambitBannerDismissed && (
        <div className={`px-4 py-3 border-b ${GAMBIT_OUTCOME_STYLES[gambit.outcomeTier].border} ${GAMBIT_OUTCOME_STYLES[gambit.outcomeTier].bg}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className={`text-sm font-bold ${GAMBIT_OUTCOME_STYLES[gambit.outcomeTier].text}`}>
                Gambit: {GAMBIT_OUTCOME_STYLES[gambit.outcomeTier].label}
              </span>
              <span className="text-xs text-white/70">
                {formatGambitEffects(gambit.effects)}
              </span>
            </div>
            <button
              onClick={() => setGambitBannerDismissed(true)}
              className="text-white/40 hover:text-white/60 text-xs px-2 py-0.5 rounded hover:bg-white/10 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Resource Display */}
      <div className="p-4 border-b border-white/10">
        <div className="grid grid-cols-2 gap-4">
          {/* Player */}
          <div>
            <h3 className="text-xs font-semibold text-white/80 mb-2">You</h3>
            <div className="space-y-1.5">
              {(['control', 'stability', 'position'] as const).map((key) => (
                <ResourceBar
                  key={key}
                  label={RESOURCE_LABELS[key]}
                  value={state.player.resources[key]}
                  maxValue={Math.max(5, state.player.resources[key])}
                  colorClass={RESOURCE_COLORS[key]}
                />
              ))}
            </div>
          </div>
          {/* Opponent */}
          <div>
            <h3 className="text-xs font-semibold text-white/80 mb-2">
              {state.opponent.label}
              {state.opponentIdentity?.factionId && (
                <span className="ml-2 font-normal text-white/40">({state.opponentIdentity.factionId})</span>
              )}
            </h3>
            <div className="space-y-1.5">
              {(['control', 'stability', 'position'] as const).map((key) => (
                <ResourceBar
                  key={key}
                  label={RESOURCE_LABELS[key]}
                  value={state.opponent.resources[key]}
                  maxValue={5}
                  colorClass={RESOURCE_COLORS[key]}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Leverage Display + Spend UI (before move selection, only when not ended) */}
      {!state.ended && (
        <div className="px-4 pt-3 pb-2 border-b border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold text-white/60 uppercase tracking-wide">Leverage</span>
            {hasArmedLeverage && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Armed: {state.armedLeverage!.effect.type === 'boost_self' ? '+1 self' : state.armedLeverage!.effect.type === 'drain_opponent' ? '-1 opp' : state.armedLeverage!.effect.type}
              </span>
            )}
            {!hasAnyLeverage && !hasArmedLeverage && (
              <span className="text-xs text-white/30">Earn via Prep &amp; Focus</span>
            )}
          </div>
          {/* Leverage counters */}
          <div className="flex gap-2 mb-2">
            {(['control', 'stability', 'position'] as const).map((type) => (
              <button
                key={type}
                disabled={leverage[type] <= 0 || hasArmedLeverage}
                onClick={() => setSpendingType(spendingType === type ? null : type)}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs transition-all ${
                  leverage[type] > 0 && !hasArmedLeverage
                    ? `${LEVERAGE_COLORS[type]} cursor-pointer hover:brightness-125`
                    : 'bg-white/5 border-white/10 text-white/30 cursor-not-allowed'
                } ${spendingType === type ? 'ring-1 ring-white/40' : ''}`}
              >
                <span className="capitalize font-medium">{type}</span>
                <span className="font-bold">{leverage[type]}</span>
              </button>
            ))}
          </div>
          {/* Effect selection (when a leverage type is selected) */}
          {spendingType && !hasArmedLeverage && (
            <div className="flex flex-wrap gap-1.5 mb-1">
              {LEVERAGE_EFFECTS[spendingType].map((effect, i) => (
                <button
                  key={i}
                  onClick={() => handleSpendEffect({ leverageType: spendingType, effect })}
                  className="text-xs px-2 py-1 rounded-lg bg-white/10 border border-white/15 text-white/80 hover:bg-white/15 hover:border-white/25 transition-all"
                >
                  {LEVERAGE_EFFECT_LABELS[effect.type]}
                </button>
              ))}
              <button
                onClick={() => setSpendingType(null)}
                className="text-xs px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-white/40 hover:text-white/60 transition-all"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      {/* Conflict Log */}
      {(state.log.length > 0 || gambit) && (
        <div ref={logRef} className="max-h-48 overflow-y-auto border-b border-white/10">
          <div className="p-3 space-y-2">
            {/* Gambit entry (Turn 0) */}
            {gambit && (
              <div className="text-xs space-y-0.5">
                <div className={`font-medium ${GAMBIT_OUTCOME_STYLES[gambit.outcomeTier].text}`}>
                  Gambit: {GAMBIT_OUTCOME_STYLES[gambit.outcomeTier].label}
                </div>
                <div className="text-white/60">
                  {formatGambitEffects(gambit.effects)}
                </div>
              </div>
            )}
            {state.log.map((entry) => (
              <div key={entry.turn} className="text-xs space-y-0.5">
                <div className="text-white/50 font-medium">Turn {entry.turn}</div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <span className="text-white/80">You: </span>
                    <span className="text-white/70">{CONFLICT_MOVES[entry.playerMove].name}</span>
                    {entry.playerCounterTriggered && (
                      <span className="ml-1 text-yellow-400 font-medium">COUNTER!</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <span className="text-white/80">Opp: </span>
                    <span className="text-white/70">{CONFLICT_MOVES[entry.opponentMove].name}</span>
                    {entry.opponentCounterTriggered && (
                      <span className="ml-1 text-yellow-400 font-medium">COUNTER!</span>
                    )}
                  </div>
                </div>
                {/* Enemy leverage spend event */}
                {entry.enemyLeverageSpentThisTurn && (
                  <div className="text-purple-300 italic">
                    Enemy spent +1 {entry.enemyLeverageSpentThisTurn.resource}{' '}
                    ({entry.enemyLeverageSpentThisTurn.effect === 'boost_self' ? 'boost' : 'drain'})
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Move Buttons or Summary */}
      {!state.ended ? (
        <div className="p-4">
          <div className="grid grid-cols-2 gap-2">
            {(['pressure', 'seize_control', 'reposition', 'stabilize', 'feint', 'withdraw'] as MoveId[]).map((moveId) => {
              const move = CONFLICT_MOVES[moveId];
              const available = availableMoves.includes(moveId);
              return (
                <button
                  key={moveId}
                  onClick={() => available && onPlayerMove(moveId)}
                  disabled={!available}
                  className={`text-left p-3 rounded-xl border transition-all ${
                    available
                      ? 'bg-white/10 border-white/15 hover:bg-white/15 hover:border-white/25 cursor-pointer'
                      : 'bg-white/5 border-white/5 opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className="text-sm font-medium text-white">{move.name}</div>
                  <div className="text-xs text-white/50 mt-0.5">{move.description}</div>
                </button>
              );
            })}
          </div>
        </div>
      ) : result ? (
        <div className="p-4">
          <AnimatedCard variant="panel" className={`border ${outcomeColor} rounded-xl p-4`}>
            <div className="text-center space-y-3">
              <h3 className={`text-xl font-bold ${outcomeTextColor}`}>{outcomeLabel}</h3>
              <p className="text-sm text-white/70">{result.narrativeSummary}</p>

              {/* Flag badges */}
              <div className="flex flex-wrap gap-2 justify-center">
                {result.flags.flawlessVictory && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-300 border border-green-500/30">
                    Flawless
                  </span>
                )}
                {result.flags.quickVictory && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    Quick Victory
                  </span>
                )}
                {result.flags.desperateStand && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Desperate Stand
                  </span>
                )}
                {result.flags.totalDefeat && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30">
                    Total Defeat
                  </span>
                )}
              </div>

              <button
                onClick={onContinue}
                className="mt-2 px-6 py-2 rounded-xl bg-white/10 border border-white/15 text-white font-medium hover:bg-white/15 hover:border-white/25 transition-all"
              >
                Continue
              </button>
            </div>
          </AnimatedCard>
        </div>
      ) : null}
    </AnimatedCard>
  );
}
