'use client';

import { useRef, useEffect } from 'react';
import { AnimatedCard } from '@/app/components/ui/AnimatedCard';
import {
  CONFLICT_MOVES,
  isMoveAvailable,
  evaluateOutcome,
  getPlayerMoves,
} from '@/app/lib/game-logic/conflict/engine';
import type { ConflictState, MoveId } from '@/app/lib/game-logic/conflict/types';

interface ConflictPaneProps {
  state: ConflictState;
  onPlayerMove: (move: MoveId) => void;
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

export function ConflictPane({ state, onPlayerMove, onContinue }: ConflictPaneProps) {
  const logRef = useRef<HTMLDivElement>(null);
  const availableMoves = getPlayerMoves(state);
  const result = state.ended ? evaluateOutcome(state) : null;

  // Auto-scroll log
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [state.log.length]);

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

  return (
    <AnimatedCard variant="panel" className="panel-glass border border-white/15 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-white">Conflict</h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/70">
            Turn {Math.min(state.turn, state.maxTurns)}/{state.maxTurns}
          </span>
        </div>
        <span className="text-sm text-white/50">vs {state.opponent.label}</span>
      </div>

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
                  maxValue={5}
                  colorClass={RESOURCE_COLORS[key]}
                />
              ))}
            </div>
          </div>
          {/* Opponent */}
          <div>
            <h3 className="text-xs font-semibold text-white/80 mb-2">{state.opponent.label}</h3>
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

      {/* Conflict Log */}
      {state.log.length > 0 && (
        <div ref={logRef} className="max-h-48 overflow-y-auto border-b border-white/10">
          <div className="p-3 space-y-2">
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
