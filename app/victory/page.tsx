'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Trophy, ArrowLeft, MapPin, Play } from 'lucide-react';

interface VictoryData {
  victory: boolean;
  winnerFactionId: string | null;
  winnerFactionName: string | null;
  wonAtTurn: number | null;
  worldTurn: number;
}

// Faction colors for visual distinction
const FACTION_COLORS: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  guardian_initiative: { bg: 'from-blue-900 to-blue-950', border: 'border-blue-500', text: 'text-blue-400', glow: 'shadow-blue-500/50' },
  vigilante_network: { bg: 'from-purple-900 to-purple-950', border: 'border-purple-500', text: 'text-purple-400', glow: 'shadow-purple-500/50' },
  syndicate: { bg: 'from-red-900 to-red-950', border: 'border-red-500', text: 'text-red-400', glow: 'shadow-red-500/50' },
  nihilist_collective: { bg: 'from-orange-900 to-orange-950', border: 'border-orange-500', text: 'text-orange-400', glow: 'shadow-orange-500/50' },
};

const FACTION_SLOGANS: Record<string, string> = {
  guardian_initiative: 'Justice has prevailed. The city is safe.',
  vigilante_network: 'By any means necessary. The streets are ours.',
  syndicate: 'Power flows to those who seize it. The city belongs to the Syndicate.',
  nihilist_collective: 'Order crumbles. Chaos reigns supreme.',
};

function getFactionStyle(factionId: string | null) {
  if (!factionId) return FACTION_COLORS.guardian_initiative;
  return FACTION_COLORS[factionId] ?? FACTION_COLORS.guardian_initiative;
}

function getSlogan(factionId: string | null) {
  if (!factionId) return 'The city has fallen.';
  return FACTION_SLOGANS[factionId] ?? 'The city has fallen.';
}

export default function VictoryPage() {
  const router = useRouter();
  const [victoryData, setVictoryData] = useState<VictoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVictoryState = useCallback(async () => {
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
        throw new Error('Failed to fetch victory state');
      }

      const data = await response.json();

      if (!data.escalation?.victory) {
        // No victory yet, redirect to game
        router.push('/game');
        return;
      }

      setVictoryData({
        victory: data.escalation.victory,
        winnerFactionId: data.escalation.winnerFactionId,
        winnerFactionName: data.escalation.winnerFactionName,
        wonAtTurn: data.escalation.wonAtTurn,
        worldTurn: data.escalation.worldTurn,
      });
    } catch (err) {
      console.error('Error fetching victory state:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchVictoryState();
  }, [fetchVictoryState]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex items-center justify-center">
        <div className="text-white/60 flex items-center gap-2">
          <Trophy className="w-5 h-5 animate-pulse" />
          Loading...
        </div>
      </div>
    );
  }

  if (error || !victoryData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex items-center justify-center">
        <div className="text-red-400 text-center">
          <p className="mb-4">{error ?? 'No victory data'}</p>
          <Link
            href="/game"
            className="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors inline-block"
          >
            Return to Game
          </Link>
        </div>
      </div>
    );
  }

  const factionStyle = getFactionStyle(victoryData.winnerFactionId);
  const slogan = getSlogan(victoryData.winnerFactionId);

  return (
    <div className={`min-h-screen bg-gradient-to-b ${factionStyle.bg} text-white`}>
      {/* Header */}
      <header className="bg-black/30 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            href="/game"
            className="p-2 rounded-lg hover:bg-white/10 transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm">Back to Game</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-12 flex flex-col items-center justify-center min-h-[80vh]">
        {/* Victory Trophy */}
        <div className={`relative mb-8`}>
          <div className={`absolute inset-0 blur-3xl opacity-50 ${factionStyle.bg}`} />
          <Trophy className={`w-32 h-32 ${factionStyle.text} relative z-10 drop-shadow-2xl`} />
        </div>

        {/* Victory Title */}
        <h1 className={`text-5xl md:text-6xl font-bold mb-4 text-center ${factionStyle.text}`}>
          VICTORY
        </h1>

        {/* Winning Faction */}
        <div className={`text-2xl md:text-3xl font-semibold mb-6 text-center`}>
          {victoryData.winnerFactionName}
        </div>

        {/* Slogan */}
        <p className="text-lg text-white/70 mb-8 text-center max-w-lg italic">
          "{slogan}"
        </p>

        {/* Victory Stats */}
        <div className={`p-6 rounded-xl bg-black/30 border ${factionStyle.border} mb-8 w-full max-w-md`}>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-3xl font-bold">{victoryData.wonAtTurn}</div>
              <div className="text-sm text-white/50">Victory Turn</div>
            </div>
            <div>
              <div className="text-3xl font-bold">{victoryData.worldTurn}</div>
              <div className="text-sm text-white/50">Current Turn</div>
            </div>
          </div>
        </div>

        {/* Victory Explanation */}
        <div className="text-center text-white/60 mb-8 max-w-lg">
          <p className="text-sm">
            {victoryData.winnerFactionName} achieved dominance by controlling all districts
            with over 70% share for 2 consecutive turns.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/game"
            className={`px-6 py-3 rounded-lg bg-white/10 hover:bg-white/20 transition-colors flex items-center gap-2`}
          >
            <Play className="w-5 h-5" />
            Continue Playing
          </Link>
          <Link
            href="/map"
            className={`px-6 py-3 rounded-lg border ${factionStyle.border} hover:bg-white/10 transition-colors flex items-center gap-2`}
          >
            <MapPin className="w-5 h-5" />
            View City Map
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-6 text-white/30 text-sm">
        The struggle for the city continues...
      </footer>
    </div>
  );
}
