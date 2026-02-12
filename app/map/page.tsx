'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, MapPin, Shield, AlertTriangle } from 'lucide-react';

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
  contestedPoints: number;
  contestedPercent: number;
  totalAllPoints: number;
}

// Faction colors for visual distinction
const FACTION_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  guardian_initiative: { bg: 'bg-blue-500/20', border: 'border-blue-500/50', text: 'text-blue-400' },
  vigilante_network: { bg: 'bg-purple-500/20', border: 'border-purple-500/50', text: 'text-purple-400' },
  syndicate: { bg: 'bg-red-500/20', border: 'border-red-500/50', text: 'text-red-400' },
  nihilist_collective: { bg: 'bg-orange-500/20', border: 'border-orange-500/50', text: 'text-orange-400' },
  neutral: { bg: 'bg-gray-500/20', border: 'border-gray-500/50', text: 'text-gray-400' },
};

function getFactionColors(factionId: string | null) {
  if (!factionId) return FACTION_COLORS.neutral;
  return FACTION_COLORS[factionId] ?? FACTION_COLORS.neutral;
}

function ControlBar({ value, factionId }: { value: number; factionId: string | null }) {
  const colors = getFactionColors(factionId);
  const clampedValue = Math.max(0, Math.min(100, value));

  return (
    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
      <div
        className={`h-full transition-all duration-500 ${colors.bg.replace('/20', '/60')}`}
        style={{ width: `${clampedValue}%` }}
      />
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
  const colors = getFactionColors(district.controllingFactionId);
  const controlLabel = district.controllingFactionShortName ?? 'Contested';

  return (
    <div
      className={`p-4 rounded-xl border ${colors.border} ${colors.bg} transition-all hover:scale-[1.02]`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{district.districtIcon}</span>
          <div>
            <h3 className="font-semibold text-white">{district.districtName}</h3>
            <div className={`text-sm ${colors.text}`}>
              <Shield className="w-3 h-3 inline mr-1" />
              {controlLabel}
            </div>
          </div>
        </div>
        <InstabilityIndicator value={district.instability} />
      </div>

      {/* Control Bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-white/60">
          <span>Control</span>
          <span>{district.controlValue}%</span>
        </div>
        <ControlBar value={district.controlValue} factionId={district.controllingFactionId} />
      </div>
    </div>
  );
}

export default function MapPage() {
  const router = useRouter();
  const [districtStates, setDistrictStates] = useState<DistrictState[]>([]);
  const [cityControl, setCityControl] = useState<CityControlSummary | null>(null);
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
                        className={`h-full transition-all duration-500 ${colors.bg.replace('/20', '/60')}`}
                        style={{ width: `${faction.percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {/* Contested indicator */}
              {cityControl.contestedPercent > 0 && (
                <div className="pt-2 border-t border-white/10">
                  <div className="flex items-center justify-between text-xs text-white/50">
                    <span>Contested districts</span>
                    <span>{cityControl.contestedPercent}% of city</span>
                  </div>
                </div>
              )}
            </div>
            <p className="text-xs text-white/40 mt-3">
              Contested districts not counted toward faction totals
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
