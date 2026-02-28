'use client';

import { useState, useEffect } from 'react';
import { AnimatedCard } from '@/app/components/ui/AnimatedCard';
import { Badge } from '@/app/components/ui/badge';
import { Swords, Trophy, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import type { PvpChallengeResult, PvpResolveResult, CombatantSnapshot, PvpMode } from '@/app/lib/game-logic/pvp/types';

interface FightClubPanelProps {
  characterLevel: number;
  currentEnergy: number;
  pvpRating: number;
  pvpWins: number;
  pvpLosses: number;
  onEnergyChange: (delta: number) => void;
  onRatingChange: (newRating: number, wins: number, losses: number) => void;
  /** Called when a match is found - parent should start conflict UI */
  onMatchFound: (data: {
    matchId: string;
    mode: PvpMode;
    attacker: CombatantSnapshot;
    defender: CombatantSnapshot;
  }) => void;
  /** Set by parent when PvP conflict is in progress */
  isPvpConflictActive?: boolean;
  /** Last PvP result (set by parent after conflict resolution) */
  lastPvpResult?: PvpResolveResult | null;
  /** Called when user dismisses the result */
  onResultDismissed?: () => void;
}

interface LeaderboardEntry {
  rank: number;
  characterId: string;
  characterName: string;
  rating: number;
  wins: number;
  losses: number;
}

const PVP_MIN_LEVEL = 5;
const PVP_ENERGY_COST = 10;

export function FightClubPanel({
  characterLevel,
  currentEnergy,
  pvpRating,
  pvpWins,
  pvpLosses,
  onEnergyChange,
  onRatingChange,
  onMatchFound,
  isPvpConflictActive = false,
  lastPvpResult,
  onResultDismissed,
}: FightClubPanelProps) {
  const [mode, setMode] = useState<PvpMode>('ranked');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

  const isEligible = characterLevel >= PVP_MIN_LEVEL;
  const hasEnergy = currentEnergy >= PVP_ENERGY_COST;
  const canFight = isEligible && hasEnergy && !isSearching && !isPvpConflictActive;

  const fetchLeaderboard = async () => {
    setLoadingLeaderboard(true);
    try {
      const response = await fetch('/api/pvp/leaderboard?limit=100');
      const data = await response.json();
      if (response.ok) {
        setLeaderboard(data.leaderboard);
      }
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err);
    } finally {
      setLoadingLeaderboard(false);
    }
  };

  useEffect(() => {
    if (showLeaderboard && leaderboard.length === 0) {
      fetchLeaderboard();
    }
  }, [showLeaderboard]);

  // Refresh leaderboard when a result comes in
  useEffect(() => {
    if (lastPvpResult?.success && showLeaderboard) {
      fetchLeaderboard();
    }
  }, [lastPvpResult]);

  const handleFindMatch = async () => {
    setIsSearching(true);
    setSearchError(null);

    try {
      const response = await fetch('/api/pvp/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      });

      const data: PvpChallengeResult = await response.json();

      if (data.success && data.matchId && data.attacker && data.defender && data.mode) {
        // Energy is deducted by the API
        onEnergyChange(-PVP_ENERGY_COST);

        // Notify parent to start conflict UI
        onMatchFound({
          matchId: data.matchId,
          mode: data.mode,
          attacker: data.attacker,
          defender: data.defender,
        });
      } else {
        setSearchError(data.error || 'No eligible opponents found');
      }
    } catch (err) {
      console.error('Challenge error:', err);
      setSearchError('Network error');
    } finally {
      setIsSearching(false);
    }
  };

  const handleDismissResult = () => {
    onResultDismissed?.();
  };

  return (
    <AnimatedCard variant="panel" className="panel-glass p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white/80 flex items-center gap-2">
          <Swords className="h-4 w-4 text-red-400" />
          Fight Club
        </h3>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-yellow-400 border-yellow-400/30">
            {pvpRating}
          </Badge>
          <span className="text-xs text-white/50">
            {pvpWins}W - {pvpLosses}L
          </span>
        </div>
      </div>

      {/* Eligibility warning */}
      {!isEligible && (
        <div className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded px-2 py-1">
          Reach level {PVP_MIN_LEVEL} to unlock Fight Club
        </div>
      )}

      {/* PvP conflict in progress indicator */}
      {isPvpConflictActive && (
        <div className="text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded px-2 py-1 flex items-center gap-2">
          <Loader2 className="h-3 w-3 animate-spin" />
          PvP match in progress...
        </div>
      )}

      {/* Mode toggle */}
      {isEligible && !isPvpConflictActive && (
        <div className="flex gap-2">
          <button
            onClick={() => setMode('ranked')}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              mode === 'ranked'
                ? 'bg-red-500/20 border border-red-500/40 text-red-300'
                : 'bg-white/5 border border-white/10 text-white/60 hover:bg-white/10'
            }`}
          >
            Ranked
          </button>
          <button
            onClick={() => setMode('unranked')}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              mode === 'unranked'
                ? 'bg-blue-500/20 border border-blue-500/40 text-blue-300'
                : 'bg-white/5 border border-white/10 text-white/60 hover:bg-white/10'
            }`}
          >
            Unranked
          </button>
        </div>
      )}

      {/* Fight button */}
      {isEligible && !isPvpConflictActive && (
        <button
          onClick={handleFindMatch}
          disabled={!canFight}
          className={`w-full px-4 py-3 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
            canFight
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : 'bg-white/10 text-white/30 cursor-not-allowed'
          }`}
        >
          {isSearching ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Finding opponent...
            </>
          ) : (
            <>
              <Swords className="h-4 w-4" />
              Find Match ({PVP_ENERGY_COST} Energy)
            </>
          )}
        </button>
      )}

      {/* Energy warning */}
      {isEligible && !hasEnergy && !isPvpConflictActive && (
        <div className="text-xs text-red-400 text-center">
          Not enough energy ({currentEnergy}/{PVP_ENERGY_COST})
        </div>
      )}

      {/* Search error */}
      {searchError && (
        <div className="p-3 rounded-lg border bg-amber-500/10 border-amber-500/30">
          <div className="text-sm text-amber-400">{searchError}</div>
        </div>
      )}

      {/* Last PvP result (shown after conflict resolution) */}
      {lastPvpResult && (
        <div
          className={`p-3 rounded-lg border ${
            lastPvpResult.success
              ? lastPvpResult.result === 'WIN'
                ? 'bg-green-500/10 border-green-500/30'
                : 'bg-red-500/10 border-red-500/30'
              : 'bg-amber-500/10 border-amber-500/30'
          }`}
        >
          {lastPvpResult.success ? (
            <>
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`font-semibold ${
                    lastPvpResult.result === 'WIN' ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  {lastPvpResult.result === 'WIN' ? 'Victory!' : 'Defeat'}
                </span>
                {lastPvpResult.ratingDelta !== undefined && (
                  <span
                    className={`text-sm font-medium ${
                      lastPvpResult.ratingDelta >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}
                  >
                    {lastPvpResult.ratingDelta >= 0 ? '+' : ''}
                    {lastPvpResult.ratingDelta}
                  </span>
                )}
              </div>
              <button
                onClick={handleDismissResult}
                className="mt-2 w-full text-xs text-white/50 hover:text-white/70"
              >
                Dismiss
              </button>
            </>
          ) : (
            <div className="text-sm text-amber-400">{lastPvpResult.error}</div>
          )}
        </div>
      )}

      {/* Leaderboard toggle */}
      <button
        onClick={() => setShowLeaderboard(!showLeaderboard)}
        className="w-full flex items-center justify-between px-3 py-2 text-sm text-white/60 hover:text-white/80 bg-white/5 rounded-lg transition-colors"
      >
        <span className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-yellow-400" />
          Leaderboard
        </span>
        {showLeaderboard ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </button>

      {/* Leaderboard */}
      {showLeaderboard && (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {loadingLeaderboard ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-white/40" />
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center text-sm text-white/40 py-4">
              No fighters yet
            </div>
          ) : (
            leaderboard.slice(0, 20).map((entry) => (
              <div
                key={entry.characterId}
                className="flex items-center gap-3 px-2 py-1.5 bg-white/5 rounded-lg"
              >
                <span
                  className={`w-6 text-center text-sm font-medium ${
                    entry.rank === 1
                      ? 'text-yellow-400'
                      : entry.rank === 2
                      ? 'text-gray-300'
                      : entry.rank === 3
                      ? 'text-amber-600'
                      : 'text-white/50'
                  }`}
                >
                  {entry.rank}
                </span>
                <span className="flex-1 text-sm text-white/80 truncate">
                  {entry.characterName}
                </span>
                <span className="text-sm font-medium text-yellow-400">
                  {entry.rating}
                </span>
                <span className="text-xs text-white/40">
                  {entry.wins}W-{entry.losses}L
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </AnimatedCard>
  );
}
