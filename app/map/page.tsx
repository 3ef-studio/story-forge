'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, MapPin, Shield, AlertTriangle, Info, Trophy, TrendingUp, Star } from 'lucide-react';
import { getDistrictTraits } from '@/app/data/districtModifiers';

interface DistrictShares {
  [controllerId: string]: number;
}

interface DistrictLeader {
  leaderFactionId: string | null;
  leaderShare: number;
  status: 'controlled' | 'contested';
}

interface DistrictState {
  id: string;
  characterId: string;
  districtId: string;
  controllingFactionId: string | null;
  controlValue: number;
  instability: number;
  districtName: string;
  districtIcon: string;
  controllingFactionName: string | null;
  controllingFactionShortName: string | null;
  shares: DistrictShares;
  leader: DistrictLeader;
}

interface FactionCityControl {
  factionId: string;
  factionName: string;
  factionShortName: string;
  totalPoints: number;
  percent: number;
}

interface CityControlSummary {
  factions: FactionCityControl[];
  totalControlledPoints: number;
  uncontrolledPoints: number;
  uncontrolledPercent: number;
  totalAllPoints: number;
}

interface FactionTierInfo {
  factionId: string;
  factionName: string;
  cityShare: number;
  tier: 0 | 1 | 2 | 3;
}

interface EscalationData {
  worldTurn: number;
  factionTiers: FactionTierInfo[];
  victory: boolean;
  winnerFactionId: string | null;
  winnerFactionName: string | null;
  winStreakFactionId: string | null;
  winStreakCount: number;
  wonAtTurn: number | null;
}

// Faction colors for visual distinction
const FACTION_COLORS: Record<string, { bg: string; border: string; text: string; solid: string }> = {
  guardian_initiative: { bg: 'bg-blue-500/20', border: 'border-blue-500/50', text: 'text-blue-400', solid: 'bg-blue-500' },
  vigilante_network: { bg: 'bg-purple-500/20', border: 'border-purple-500/50', text: 'text-purple-400', solid: 'bg-purple-500' },
  syndicate: { bg: 'bg-red-500/20', border: 'border-red-500/50', text: 'text-red-400', solid: 'bg-red-500' },
  nihilist_collective: { bg: 'bg-orange-500/20', border: 'border-orange-500/50', text: 'text-orange-400', solid: 'bg-orange-500' },
  neutral: { bg: 'bg-gray-500/20', border: 'border-gray-500/50', text: 'text-gray-400', solid: 'bg-gray-600' },
  uncontrolled: { bg: 'bg-gray-700/20', border: 'border-gray-700/50', text: 'text-gray-500', solid: 'bg-gray-700' },
};

// Controllable faction IDs in display order
const CONTROLLABLE_FACTION_IDS = ['guardian_initiative', 'vigilante_network', 'syndicate', 'nihilist_collective'];

function getFactionColors(factionId: string | null) {
  if (!factionId) return FACTION_COLORS.neutral;
  return FACTION_COLORS[factionId] ?? FACTION_COLORS.neutral;
}

function getFactionShortName(factionId: string): string {
  const names: Record<string, string> = {
    guardian_initiative: 'GI',
    vigilante_network: 'VN',
    syndicate: 'SYN',
    nihilist_collective: 'NC',
    uncontrolled: 'UC',
  };
  return names[factionId] ?? factionId.slice(0, 3).toUpperCase();
}

/**
 * Stacked control bar showing shares for all factions + uncontrolled
 */
function StackedControlBar({ shares }: { shares: DistrictShares }) {
  // Build segments in consistent order
  const segments: Array<{ id: string; share: number; color: string }> = [];

  // Add faction segments
  for (const factionId of CONTROLLABLE_FACTION_IDS) {
    const share = shares[factionId] ?? 0;
    if (share > 0) {
      segments.push({
        id: factionId,
        share,
        color: FACTION_COLORS[factionId]?.solid ?? 'bg-gray-500',
      });
    }
  }

  // Add uncontrolled segment
  const uncontrolledShare = shares['uncontrolled'] ?? 0;
  if (uncontrolledShare > 0) {
    segments.push({
      id: 'uncontrolled',
      share: uncontrolledShare,
      color: FACTION_COLORS.uncontrolled.solid,
    });
  }

  return (
    <div className="w-full h-3 bg-black/30 rounded-full overflow-hidden flex">
      {segments.map((segment, index) => (
        <div
          key={segment.id}
          className={`h-full transition-all duration-500 ${segment.color} ${index === 0 ? 'rounded-l-full' : ''} ${index === segments.length - 1 ? 'rounded-r-full' : ''}`}
          style={{ width: `${segment.share}%` }}
          title={`${getFactionShortName(segment.id)}: ${segment.share}%`}
        />
      ))}
    </div>
  );
}

function InstabilityIndicator({ value }: { value: number }) {
  if (value <= 10) return null;

  const intensity = value > 50 ? 'text-red-400' : value > 25 ? 'text-yellow-400' : 'text-orange-400';

  return (
    <div className={`flex items-center gap-1 text-xs ${intensity}`}>
      <AlertTriangle className="w-3 h-3" />
      <span>{value}%</span>
    </div>
  );
}

function DistrictCard({ district }: { district: DistrictState }) {
  const leader = district.leader;
  const leaderColors = getFactionColors(leader.leaderFactionId);
  const traits = getDistrictTraits(district.districtId);

  // Build leader label
  let leaderLabel: string;
  if (leader.status === 'controlled' && leader.leaderFactionId) {
    leaderLabel = `Controlled by ${getFactionShortName(leader.leaderFactionId)} (${leader.leaderShare}%)`;
  } else if (leader.leaderFactionId) {
    leaderLabel = `Contested (${getFactionShortName(leader.leaderFactionId)} leads: ${leader.leaderShare}%)`;
  } else {
    leaderLabel = 'Contested';
  }

  return (
    <div
      className={`p-4 rounded-xl border ${leaderColors.border} ${leaderColors.bg} transition-all hover:scale-[1.02]`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{district.districtIcon}</span>
          <div>
            <h3 className="font-semibold text-white">{district.districtName}</h3>
            <div className={`text-sm ${leaderColors.text}`}>
              <Shield className="w-3 h-3 inline mr-1" />
              {leaderLabel}
            </div>
          </div>
        </div>
        <InstabilityIndicator value={district.instability} />
      </div>

      {/* Stacked Control Bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-white/60">
          <span>Control Shares</span>
        </div>
        <StackedControlBar shares={district.shares} />
        {/* Share breakdown */}
        <div className="flex flex-wrap gap-2 mt-2">
          {CONTROLLABLE_FACTION_IDS.map((factionId) => {
            const share = district.shares[factionId] ?? 0;
            if (share === 0) return null;
            const colors = FACTION_COLORS[factionId];
            return (
              <div key={factionId} className="flex items-center gap-1 text-xs">
                <div className={`w-2 h-2 rounded-full ${colors.solid}`} />
                <span className={colors.text}>{getFactionShortName(factionId)}: {share}%</span>
              </div>
            );
          })}
          {(district.shares['uncontrolled'] ?? 0) > 0 && (
            <div className="flex items-center gap-1 text-xs">
              <div className="w-2 h-2 rounded-full bg-gray-700" />
              <span className="text-gray-500">UC: {district.shares['uncontrolled']}%</span>
            </div>
          )}
        </div>
      </div>

      {/* District Traits */}
      {traits.length > 0 && (
        <div className="mt-3 pt-2 border-t border-white/10">
          <div className="flex items-center gap-1 text-xs text-white/40">
            <Info className="w-3 h-3" />
            <span>{traits.join(' · ')}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Tier labels and styles
const TIER_LABELS: Record<number, { label: string; color: string }> = {
  0: { label: 'Minor', color: 'text-gray-400' },
  1: { label: 'Rising', color: 'text-yellow-400' },
  2: { label: 'Major', color: 'text-orange-400' },
  3: { label: 'Dominant', color: 'text-red-400' },
};

export default function MapPage() {
  const router = useRouter();
  const [districtStates, setDistrictStates] = useState<DistrictState[]>([]);
  const [cityControl, setCityControl] = useState<CityControlSummary | null>(null);
  const [escalation, setEscalation] = useState<EscalationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDistrictStates = useCallback(async () => {
    try {
      const response = await fetch('/api/district-state');

      if (response.status === 401) {
        router.push('/login');
        return;
      }

      if (response.status === 404) {
        router.push('/character-creation');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch district states');
      }

      const data = await response.json();
      setDistrictStates(data.districtStates);
      setCityControl(data.cityControl ?? null);
      setEscalation(data.escalation ?? null);
    } catch (err) {
      console.error('Error fetching district states:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchDistrictStates();
  }, [fetchDistrictStates]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex items-center justify-center">
        <div className="text-white/60 flex items-center gap-2">
          <MapPin className="w-5 h-5 animate-pulse" />
          Loading map...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex items-center justify-center">
        <div className="text-red-400 text-center">
          <p className="mb-4">{error}</p>
          <button
            onClick={() => {
              setError(null);
              setLoading(true);
              fetchDistrictStates();
            }}
            className="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-gray-900/80 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/game"
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-400" />
              <h1 className="text-lg font-bold">City Map</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* City Control Summary */}
        {cityControl && (
          <div className="mb-6 p-4 rounded-xl bg-white/5 border border-white/10">
            <h2 className="text-sm font-medium text-white/60 mb-4">City Control</h2>
            <div className="space-y-3">
              {cityControl.factions.map((faction) => {
                const colors = getFactionColors(faction.factionId);
                return (
                  <div key={faction.factionId} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className={colors.text}>{faction.factionShortName}</span>
                      <span className="text-white/70">{faction.percent}%</span>
                    </div>
                    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${colors.solid}`}
                        style={{ width: `${faction.percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {/* Uncontrolled indicator */}
              {cityControl.uncontrolledPercent > 0 && (
                <div className="pt-2 border-t border-white/10">
                  <div className="flex items-center justify-between text-xs text-white/50">
                    <span className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-gray-700" />
                      Uncontrolled territory
                    </span>
                    <span>{cityControl.uncontrolledPercent}% of city</span>
                  </div>
                </div>
              )}
            </div>
            <p className="text-xs text-white/40 mt-3">
              Sum of each faction's shares across all districts
            </p>
          </div>
        )}

        {/* Victory Banner (if game is won) */}
        {escalation?.victory && (
          <div className="mb-6 p-4 rounded-xl bg-yellow-500/20 border border-yellow-500/50">
            <div className="flex items-center gap-3">
              <Trophy className="w-8 h-8 text-yellow-400" />
              <div>
                <h2 className="text-lg font-bold text-yellow-400">Victory!</h2>
                <p className="text-yellow-200/80">
                  {escalation.winnerFactionName} has taken control of the city on turn {escalation.wonAtTurn}.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Win Streak Tracker (if a faction is close to winning) */}
        {escalation && !escalation.victory && escalation.winStreakFactionId && escalation.winStreakCount > 0 && (
          <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-6 h-6 text-amber-400" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-amber-400">Domination Streak</span>
                  <span className="text-sm text-amber-300">{escalation.winStreakCount}/2 turns</span>
                </div>
                <p className="text-xs text-amber-200/60 mt-1">
                  {(() => {
                    const faction = escalation.factionTiers.find(f => f.factionId === escalation.winStreakFactionId);
                    return faction?.factionName ?? escalation.winStreakFactionId;
                  })()} leads all districts with &gt;70% share
                </p>
                <div className="mt-2 w-full h-2 bg-amber-900/30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-400 transition-all duration-500"
                    style={{ width: `${(escalation.winStreakCount / 2) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Faction Tiers */}
        {escalation && escalation.factionTiers.length > 0 && (
          <div className="mb-6 p-4 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-2 mb-4">
              <Star className="w-4 h-4 text-white/60" />
              <h2 className="text-sm font-medium text-white/60">Faction Power Tiers</h2>
              <span className="text-xs text-white/40 ml-auto">Turn {escalation.worldTurn}</span>
            </div>
            <div className="space-y-2">
              {escalation.factionTiers.map((faction) => {
                const colors = getFactionColors(faction.factionId);
                const tierInfo = TIER_LABELS[faction.tier];
                return (
                  <div key={faction.factionId} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${colors.solid}`} />
                      <span className={`text-sm ${colors.text}`}>{faction.factionName}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-white/50">{faction.cityShare.toFixed(1)}%</span>
                      <span className={`text-xs font-medium ${tierInfo.color}`}>
                        {tierInfo.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-white/40 mt-3">
              Tier affects counter-moves (higher tier = stronger responses) and ripple bias
            </p>
          </div>
        )}

        {/* Legend */}
        <div className="mb-6 p-4 rounded-xl bg-white/5 border border-white/10">
          <h2 className="text-sm font-medium text-white/60 mb-3">Faction Colors</h2>
          <div className="flex flex-wrap gap-3">
            {Object.entries(FACTION_COLORS).map(([id, colors]) => (
              <div key={id} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${colors.bg.replace('/20', '/60')} border ${colors.border}`} />
                <span className="text-xs text-white/70 capitalize">
                  {id === 'guardian_initiative' ? 'Guardians' :
                   id === 'vigilante_network' ? 'Vigilantes' :
                   id === 'nihilist_collective' ? 'Nihilists' :
                   id === 'syndicate' ? 'Syndicate' : 'Contested'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* District Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {districtStates.map((district) => (
            <DistrictCard key={district.id} district={district} />
          ))}
        </div>

        {/* Empty State */}
        {districtStates.length === 0 && (
          <div className="text-center py-12 text-white/40">
            <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No district data available</p>
          </div>
        )}
      </main>
    </div>
  );
}
