'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Progress } from '@/app/components/ui/progress';
import { getOriginById } from '@/app/data/origins';
import { getPowerById } from '@/app/data/powers';
import { getFactionById, getAttitudeLevel, getReputationDescriptor } from '@/app/data/factions';
import { getAttributeById } from '@/app/data/attributes';
import { ArrowLeft, User, Zap, Users, ScrollText, Trash2 } from 'lucide-react';

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!character) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <p className="text-gray-600">No character found. Redirecting...</p>
        </div>
      </div>
    );
  }

  const origin = getOriginById(character.originId);

  // Get major story events (high weight)
  const majorEvents = character.storyEvents
    .filter((e) => e.weight >= 7)
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/game" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-5 w-5" />
            Back to Game
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Character Overview */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="h-8 w-8 text-blue-500" />
              </div>
              <div>
                <CardTitle className="text-2xl">{character.name}</CardTitle>
                <CardDescription>
                  {origin?.name} - Level {character.level}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Level</p>
                <p className="text-2xl font-bold">{character.level}</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">HP</p>
                <p className="text-2xl font-bold">
                  {character.currentHp}/{character.maxHp}
                </p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Energy</p>
                <p className="text-2xl font-bold">
                  {character.currentEnergy}/{character.maxEnergy}
                </p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Money</p>
                <p className="text-2xl font-bold">${character.money}</p>
              </div>
            </div>

            <Progress
              value={character.currentXp}
              max={character.xpToNextLevel}
              variant="xp"
              showLabel
              label={`XP to Level ${character.level + 1}`}
            />
          </CardContent>
        </Card>

        {/* Origin Story */}
        {origin && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ScrollText className="h-5 w-5" />
                Origin: {origin.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">{origin.backstory}</p>

              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-1">
                  {origin.uniqueTrait.name}
                </h4>
                <p className="text-sm text-blue-700">
                  {origin.uniqueTrait.description}
                </p>
                <p className="text-xs text-blue-600 mt-1 italic">
                  {origin.uniqueTrait.mechanicalEffect}
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-1">Your Goal</h4>
                <p className="text-sm text-gray-600">{origin.personalGoal}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Attributes */}
        <Card>
          <CardHeader>
            <CardTitle>Attributes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(character.attributes).map(([id, value]) => {
                const attr = getAttributeById(id);
                return (
                  <div
                    key={id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <span className="text-sm text-gray-600 capitalize">
                      {attr?.name || id}
                    </span>
                    <span className="font-bold text-lg">{value}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Powers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Powers
            </CardTitle>
          </CardHeader>
          <CardContent>
            {character.powers.length === 0 ? (
              <p className="text-gray-500">No powers unlocked yet.</p>
            ) : (
              <div className="space-y-4">
                {character.powers.map((power) => {
                  const powerData = getPowerById(power.powerId);
                  return (
                    <div key={power.powerId} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-semibold">
                            {powerData?.name || power.powerId}
                          </h4>
                          <p className="text-sm text-gray-500 capitalize">
                            {powerData?.category}
                          </p>
                        </div>
                        <Badge variant="outline">Level {power.level}</Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        {powerData?.description}
                      </p>
                      <div className="text-xs text-gray-400">
                        Used {power.timesUsed} times
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Faction Standings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Faction Standings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(character.factions)
                .sort(([, a], [, b]) => b - a)
                .map(([factionId, reputation]) => {
                  const faction = getFactionById(factionId);
                  if (!faction) return null;
                  const attitude = getAttitudeLevel(faction, reputation);
                  const descriptor = getReputationDescriptor(faction, reputation);

                  const attitudeColors: Record<string, string> = {
                    hostile: 'bg-red-100 text-red-700 border-red-200',
                    suspicious: 'bg-yellow-100 text-yellow-700 border-yellow-200',
                    neutral: 'bg-gray-100 text-gray-700 border-gray-200',
                    friendly: 'bg-green-100 text-green-700 border-green-200',
                    allied: 'bg-blue-100 text-blue-700 border-blue-200',
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
          </CardContent>
        </Card>

        {/* Major Story Events */}
        {majorEvents.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Story Highlights</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {majorEvents.map((event) => (
                  <div key={event.id} className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm">{event.summary}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(event.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Danger Zone */}
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600">Danger Zone</CardTitle>
          </CardHeader>
          <CardContent>
            {!showDeleteConfirm ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Delete Character</p>
                  <p className="text-sm text-gray-500">
                    Permanently delete your character and all progress.
                  </p>
                </div>
                <Button
                  variant="destructive"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            ) : (
              <div className="bg-red-50 p-4 rounded-lg">
                <p className="font-medium text-red-700 mb-2">
                  Are you sure you want to delete {character.name}?
                </p>
                <p className="text-sm text-red-600 mb-4">
                  This action cannot be undone. All progress will be lost.
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    onClick={handleDeleteCharacter}
                    isLoading={deleting}
                  >
                    Yes, Delete Forever
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowDeleteConfirm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
