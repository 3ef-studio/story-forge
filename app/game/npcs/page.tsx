'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { getFactionById } from '@/app/data/factions';
import { ArrowLeft, Users, User, Heart, Eye, Calendar } from 'lucide-react';

interface NPCData {
  id: string;
  name: string;
  alias?: string;
  role: string;
  description: string;
  visualDescription: string;
  personality: string;
  factionId?: string;
  familiarity: number;
  familiarityLabel: string;
  disposition: number;
  dispositionLabel: string;
  lastSeenAt: string | null;
  notes: string | null;
}

export default function NPCCodexPage() {
  const router = useRouter();
  const [npcs, setNpcs] = useState<NPCData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNPC, setSelectedNPC] = useState<NPCData | null>(null);

  const fetchNPCs = useCallback(async () => {
    try {
      const response = await fetch('/api/npcs');
      if (response.status === 404) {
        router.push('/character-creation');
        return;
      }
      if (!response.ok) {
        throw new Error('Failed to fetch NPCs');
      }
      const data = await response.json();
      setNpcs(data.npcs);
    } catch (err) {
      console.error('Error fetching NPCs:', err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchNPCs();
  }, [fetchNPCs]);

  const getDispositionColor = (disposition: number): string => {
    if (disposition >= 30) return 'bg-blue-100 text-blue-700 border-blue-200';
    if (disposition >= 15) return 'bg-green-100 text-green-700 border-green-200';
    if (disposition >= -5) return 'bg-gray-100 text-gray-700 border-gray-200';
    if (disposition >= -15) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    return 'bg-red-100 text-red-700 border-red-200';
  };

  const getDispositionBadgeVariant = (label: string): 'hostile' | 'suspicious' | 'neutral' | 'friendly' | 'allied' => {
    const map: Record<string, 'hostile' | 'suspicious' | 'neutral' | 'friendly' | 'allied'> = {
      'Trusted Ally': 'allied',
      'Friendly': 'friendly',
      'Warm': 'friendly',
      'Neutral': 'neutral',
      'Cold': 'suspicious',
      'Hostile': 'hostile',
      'Enemy': 'hostile',
    };
    return map[label] ?? 'neutral';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading contacts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/game" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-5 w-5" />
            Back to Game
          </Link>
          <h1 className="font-semibold">NPC Codex</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {npcs.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">No contacts yet</h3>
                <p className="text-sm">
                  As you explore the city and encounter various characters, they will appear here.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {/* NPC List */}
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-gray-700 px-1">
                Known Contacts ({npcs.length})
              </h2>
              {npcs.map((npc) => {
                const faction = npc.factionId ? getFactionById(npc.factionId) : null;
                const isSelected = selectedNPC?.id === npc.id;

                return (
                  <Card
                    key={npc.id}
                    className={`cursor-pointer transition-all ${
                      isSelected
                        ? 'ring-2 ring-blue-500 border-blue-300'
                        : 'hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedNPC(npc)}
                  >
                    <CardContent className="py-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                            <User className="h-5 w-5 text-gray-400" />
                          </div>
                          <div>
                            <h3 className="font-medium">{npc.name}</h3>
                            <p className="text-sm text-gray-500">{npc.role}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge variant={getDispositionBadgeVariant(npc.dispositionLabel)}>
                            {npc.dispositionLabel}
                          </Badge>
                          {faction && (
                            <span className="text-xs text-gray-400">{faction.shortName}</span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* NPC Detail */}
            <div className="md:sticky md:top-4 h-fit">
              {selectedNPC ? (
                <Card className={`border ${getDispositionColor(selectedNPC.disposition)}`}>
                  <CardHeader>
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                        <User className="h-8 w-8 text-gray-400" />
                      </div>
                      <div>
                        <CardTitle>{selectedNPC.name}</CardTitle>
                        {selectedNPC.alias && (
                          <p className="text-sm text-gray-500">
                            a.k.a. {selectedNPC.alias}
                          </p>
                        )}
                        <p className="text-sm text-gray-600">{selectedNPC.role}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-2 p-2 bg-white/50 rounded">
                        <Eye className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-xs text-gray-500">Familiarity</p>
                          <p className="text-sm font-medium">{selectedNPC.familiarityLabel}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 p-2 bg-white/50 rounded">
                        <Heart className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-xs text-gray-500">Disposition</p>
                          <p className="text-sm font-medium">
                            {selectedNPC.disposition > 0 ? '+' : ''}{selectedNPC.disposition}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Last Seen */}
                    {selectedNPC.lastSeenAt && (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Calendar className="h-4 w-4" />
                        Last seen: {new Date(selectedNPC.lastSeenAt).toLocaleDateString()}
                      </div>
                    )}

                    {/* Description */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-1">About</h4>
                      <p className="text-sm text-gray-600">{selectedNPC.description}</p>
                    </div>

                    {/* Visual Description */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-1">Appearance</h4>
                      <p className="text-sm text-gray-600 italic">{selectedNPC.visualDescription}</p>
                    </div>

                    {/* Personality */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-1">Personality</h4>
                      <p className="text-sm text-gray-600">{selectedNPC.personality}</p>
                    </div>

                    {/* Faction */}
                    {selectedNPC.factionId && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-1">Affiliation</h4>
                        <Badge variant="outline">
                          {getFactionById(selectedNPC.factionId)?.name || selectedNPC.factionId}
                        </Badge>
                      </div>
                    )}

                    {/* Notes */}
                    {selectedNPC.notes && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                        <h4 className="text-sm font-medium text-yellow-800 mb-1">Notes</h4>
                        <p className="text-sm text-yellow-700">{selectedNPC.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="py-12">
                    <div className="text-center text-gray-400">
                      <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Select a contact to view details</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
