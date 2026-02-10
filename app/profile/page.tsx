'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Badge } from '@/app/components/ui/badge';
import { Progress } from '@/app/components/ui/progress';
import { getOriginById } from '@/app/data/origins';
import { getPowerById } from '@/app/data/powers';
import { getFactionById, getAttitudeLevel, getReputationDescriptor, controllableFactions } from '@/app/data/factions';
import { getAttributeById } from '@/app/data/attributes';
import { ArrowLeft, User, Zap, Users, ScrollText, Trash2, Shield, UserPlus, LogOut } from 'lucide-react';

interface CharacterData {
  id: string;
  name: string;
  originId: string;
  level: number;
  currentXp: number;
  xpToNextLevel: number;
  currentHp: number;
  maxHp: number;
  currentEnergy: number;
  maxEnergy: number;
  money: number;
  attributes: Record<string, number>;
  powers: Array<{ powerId: string; level: number; xp: number; timesUsed: number }>;
  factions: Record<string, number>;
  factionId: string | null;
  storyEvents: Array<{
    id: string;
    type: string;
    summary: string;
    weight: number;
    createdAt: string;
  }>;
}

export default function ProfilePage() {
  const router = useRouter();
  const [character, setCharacter] = useState<CharacterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [joiningFaction, setJoiningFaction] = useState(false);
  const [leavingFaction, setLeavingFaction] = useState(false);
  const [factionError, setFactionError] = useState<string | null>(null);

  const fetchCharacter = useCallback(async () => {
    try {
      const response = await fetch('/api/character/get');
      if (response.status === 404) {
        router.push('/character-creation');
        return;
      }
      if (!response.ok) {
        throw new Error('Failed to fetch character');
      }
      const data = await response.json();
      setCharacter(data.character);
    } catch (err) {
      console.error('Error fetching character:', err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchCharacter();
  }, [fetchCharacter]);

  const handleDeleteCharacter = async () => {
    setDeleting(true);
    try {
      const response = await fetch('/api/character/delete', {
        method: 'DELETE',
      });
      if (response.ok) {
        router.push('/character-creation');
      }
    } catch (err) {
      console.error('Error deleting character:', err);
    } finally {
      setDeleting(false);
    }
  };

  const handleJoinFaction = async (factionId: string) => {
    setJoiningFaction(true);
    setFactionError(null);
    try {
      const response = await fetch('/api/character/faction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ factionId }),
      });
      const data = await response.json();
      if (!response.ok) {
        setFactionError(data.error || 'Failed to join faction');
        return;
      }
      // Refresh character data
      await fetchCharacter();
    } catch (err) {
      console.error('Error joining faction:', err);
      setFactionError('Failed to join faction');
    } finally {
      setJoiningFaction(false);
    }
  };

  const handleLeaveFaction = async () => {
    setLeavingFaction(true);
    setFactionError(null);
    try {
      const response = await fetch('/api/character/faction', {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!response.ok) {
        setFactionError(data.error || 'Failed to leave faction');
        return;
      }
      // Refresh character data
      await fetchCharacter();
    } catch (err) {
      console.error('Error leaving faction:', err);
      setFactionError('Failed to leave faction');
    } finally {
      setLeavingFaction(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-white/60">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!character) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-center">
          <p className="text-white/60">No character found. Redirecting...</p>
        </div>
      </div>
    );
  }

  const origin = getOriginById(character.originId);

  const majorEvents = character.storyEvents
    .filter((e) => e.weight >= 7)
    .slice(0, 5);

  return (
    <div
      className="min-h-screen bg-gray-950 game-backdrop"
      style={{
        backgroundImage: `url('/images/downtown.png')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Header */}
      <header className="bg-gray-950/90 border-b border-white/10 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/game" className="flex items-center gap-2 text-white/70 hover:text-white">
            <ArrowLeft className="h-5 w-5" />
            Back to Game
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Character Overview */}
        <div className="panel-solid rounded-2xl overflow-hidden">
          <div className="p-4 sm:p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center">
                <User className="h-8 w-8 text-blue-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">{character.name}</h2>
                <p className="text-white/50">
                  {origin?.name} - Level {character.level}
                </p>
              </div>
            </div>
          </div>
          <div className="space-y-4 px-4 sm:px-6 pb-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-white/5 rounded-lg border border-white/10">
                <p className="text-sm text-white/50">Level</p>
                <p className="text-2xl font-bold text-white">{character.level}</p>
              </div>
              <div className="text-center p-3 bg-white/5 rounded-lg border border-white/10">
                <p className="text-sm text-white/50">HP</p>
                <p className="text-2xl font-bold text-white">
                  {character.currentHp}/{character.maxHp}
                </p>
              </div>
              <div className="text-center p-3 bg-white/5 rounded-lg border border-white/10">
                <p className="text-sm text-white/50">Energy</p>
                <p className="text-2xl font-bold text-white">
                  {character.currentEnergy}/{character.maxEnergy}
                </p>
              </div>
              <div className="text-center p-3 bg-white/5 rounded-lg border border-white/10">
                <p className="text-sm text-white/50">Money</p>
                <p className="text-2xl font-bold text-white">${character.money}</p>
              </div>
            </div>

            <Progress
              value={character.currentXp}
              max={character.xpToNextLevel}
              variant="xp"
              showLabel
              label={`XP to Level ${character.level + 1}`}
            />
          </div>
        </div>

        {/* Origin Story */}
        {origin && (
          <div className="panel-glass rounded-2xl overflow-hidden">
            <div className="p-4 sm:p-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <ScrollText className="h-5 w-5" />
                Origin: {origin.name}
              </h3>
            </div>
            <div className="space-y-4 px-4 sm:px-6 pb-5">
              <p className="text-white/70">{origin.backstory}</p>

              <div className="bg-blue-500/15 border border-blue-500/20 rounded-lg p-4">
                <h4 className="font-semibold text-blue-300 mb-1">
                  {origin.uniqueTrait.name}
                </h4>
                <p className="text-sm text-blue-200/80">
                  {origin.uniqueTrait.description}
                </p>
                <p className="text-xs text-blue-300/60 mt-1 italic">
                  {origin.uniqueTrait.mechanicalEffect}
                </p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                <h4 className="font-semibold text-white/90 mb-1">Your Goal</h4>
                <p className="text-sm text-white/70">{origin.personalGoal}</p>
              </div>
            </div>
          </div>
        )}

        {/* Attributes */}
        <div className="panel-glass rounded-2xl overflow-hidden">
          <div className="p-4 sm:p-6">
            <h3 className="text-lg font-bold text-white">Attributes</h3>
          </div>
          <div className="px-4 sm:px-6 pb-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(character.attributes).map(([id, value]) => {
                const attr = getAttributeById(id);
                return (
                  <div
                    key={id}
                    className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10"
                  >
                    <span className="text-sm text-white/60 capitalize">
                      {attr?.name || id}
                    </span>
                    <span className="font-bold text-lg text-white">{value}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Powers */}
        <div className="panel-glass rounded-2xl overflow-hidden">
          <div className="p-4 sm:p-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Powers
            </h3>
          </div>
          <div className="px-4 sm:px-6 pb-5">
            {character.powers.length === 0 ? (
              <p className="text-white/50">No powers unlocked yet.</p>
            ) : (
              <div className="space-y-4">
                {character.powers.map((power) => {
                  const powerData = getPowerById(power.powerId);
                  return (
                    <div key={power.powerId} className="bg-white/5 rounded-lg border border-white/10 p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-semibold text-white/90">
                            {powerData?.name || power.powerId}
                          </h4>
                          <p className="text-sm text-white/50 capitalize">
                            {powerData?.category}
                          </p>
                        </div>
                        <Badge variant="outline">Level {power.level}</Badge>
                      </div>
                      <p className="text-sm text-white/60 mb-2">
                        {powerData?.description}
                      </p>
                      <div className="text-xs text-white/40">
                        Used {power.timesUsed} times
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Faction Standings */}
        <div className="panel-glass rounded-2xl overflow-hidden">
          <div className="p-4 sm:p-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Users className="h-5 w-5" />
              Faction Standings
            </h3>
          </div>
          <div className="px-4 sm:px-6 pb-5">
            <div className="space-y-3">
              {Object.entries(character.factions)
                .sort(([, a], [, b]) => b - a)
                .map(([factionId, reputation]) => {
                  const faction = getFactionById(factionId);
                  if (!faction) return null;
                  const attitude = getAttitudeLevel(faction, reputation);
                  const descriptor = getReputationDescriptor(faction, reputation);

                  const attitudeColors: Record<string, string> = {
                    hostile: 'bg-red-500/15 text-red-300 border-red-500/20',
                    suspicious: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/20',
                    neutral: 'bg-white/5 text-white/70 border-white/10',
                    friendly: 'bg-green-500/15 text-green-300 border-green-500/20',
                    allied: 'bg-blue-500/15 text-blue-300 border-blue-500/20',
                  };

                  return (
                    <div
                      key={factionId}
                      className={`p-3 rounded-lg border ${attitudeColors[attitude]}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{faction.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">
                            {reputation > 0 ? '+' : ''}
                            {reputation}
                          </span>
                          <Badge className="capitalize text-xs">{attitude}</Badge>
                        </div>
                      </div>
                      <p className="text-sm opacity-80">{descriptor}</p>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>

        {/* Faction Membership */}
        <div className="panel-glass rounded-2xl overflow-hidden">
          <div className="p-4 sm:p-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Faction Membership
            </h3>
          </div>
          <div className="px-4 sm:px-6 pb-5">
            {factionError && (
              <div className="mb-4 p-3 bg-red-500/15 border border-red-500/20 rounded-lg text-red-300 text-sm">
                {factionError}
              </div>
            )}

            {character.factionId ? (
              <div className="space-y-4">
                <div className="p-4 bg-blue-500/15 border border-blue-500/20 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-300/70">Current Faction</p>
                      <p className="text-lg font-semibold text-blue-200">
                        {getFactionById(character.factionId)?.name ?? character.factionId}
                      </p>
                    </div>
                    <button
                      onClick={handleLeaveFaction}
                      disabled={leavingFaction}
                      className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 border border-red-500/30 disabled:opacity-50"
                    >
                      <LogOut className="h-4 w-4" />
                      {leavingFaction ? 'Leaving...' : 'Leave Faction'}
                    </button>
                  </div>
                </div>
                <p className="text-sm text-white/50">
                  As a faction member, your actions may affect district control and faction reputation.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-white/70 mb-4">
                  Join a faction to participate in the struggle for district control.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {controllableFactions.map((faction) => {
                    const reputation = character.factions[faction.id] ?? 0;
                    const attitude = getAttitudeLevel(faction, reputation);

                    return (
                      <button
                        key={faction.id}
                        onClick={() => handleJoinFaction(faction.id)}
                        disabled={joiningFaction}
                        className="p-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-lg text-left transition-all disabled:opacity-50 group"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-white group-hover:text-blue-300 transition-colors">
                            {faction.name}
                          </span>
                          <UserPlus className="h-4 w-4 text-white/40 group-hover:text-blue-400 transition-colors" />
                        </div>
                        <p className="text-sm text-white/50 mb-2">{faction.shortName}</p>
                        <div className="text-xs text-white/40">
                          Your standing: <span className="capitalize">{attitude}</span> ({reputation > 0 ? '+' : ''}{reputation})
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Major Story Events */}
        {majorEvents.length > 0 && (
          <div className="panel-glass rounded-2xl overflow-hidden">
            <div className="p-4 sm:p-6">
              <h3 className="text-lg font-bold text-white">Story Highlights</h3>
            </div>
            <div className="px-4 sm:px-6 pb-5">
              <div className="space-y-2">
                {majorEvents.map((event) => (
                  <div key={event.id} className="p-3 bg-white/5 rounded-lg border border-white/10">
                    <p className="text-sm text-white/80">{event.summary}</p>
                    <p className="text-xs text-white/40 mt-1">
                      {new Date(event.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Danger Zone */}
        <div className="panel-solid rounded-2xl border-red-500/30 overflow-hidden">
          <div className="p-4 sm:p-6">
            <h3 className="text-lg font-bold text-red-400">Danger Zone</h3>
          </div>
          <div className="px-4 sm:px-6 pb-5">
            {!showDeleteConfirm ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-white/90">Delete Character</p>
                  <p className="text-sm text-white/50">
                    Permanently delete your character and all progress.
                  </p>
                </div>
                <button
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium text-sm transition-colors flex items-center gap-2"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </div>
            ) : (
              <div className="bg-red-500/15 border border-red-500/20 p-4 rounded-lg">
                <p className="font-medium text-red-300 mb-2">
                  Are you sure you want to delete {character.name}?
                </p>
                <p className="text-sm text-red-300/70 mb-4">
                  This action cannot be undone. All progress will be lost.
                </p>
                <div className="flex gap-2">
                  <button
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
                    onClick={handleDeleteCharacter}
                    disabled={deleting}
                  >
                    {deleting ? 'Deleting...' : 'Yes, Delete Forever'}
                  </button>
                  <button
                    className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white/80 rounded-lg font-medium text-sm transition-colors border border-white/15"
                    onClick={() => setShowDeleteConfirm(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
