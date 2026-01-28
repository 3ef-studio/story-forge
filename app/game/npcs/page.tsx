'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-white/60">Loading contacts...</p>
        </div>
      </div>
    );
  }

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
          <h1 className="font-semibold text-white">NPC Codex</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {npcs.length === 0 ? (
          <div className="panel-glass rounded-2xl p-12">
            <div className="text-center text-white/50">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No contacts yet</h3>
              <p className="text-sm">
                As you explore the city and encounter various characters, they will appear here.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {/* NPC List */}
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-white/70 px-1">
                Known Contacts ({npcs.length})
              </h2>
              {npcs.map((npc) => {
                const faction = npc.factionId ? getFactionById(npc.factionId) : null;
                const isSelected = selectedNPC?.id === npc.id;

                return (
                  <div
                    key={npc.id}
                    className={`panel-glass rounded-xl p-3 cursor-pointer transition-all ${
                      isSelected
                        ? 'ring-2 ring-blue-500 border-blue-400/40'
                        : 'hover:bg-white/15'
                    }`}
                    onClick={() => setSelectedNPC(npc)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
                          <User className="h-5 w-5 text-white/40" />
                        </div>
                        <div>
                          <h3 className="font-medium text-white/90">{npc.name}</h3>
                          <p className="text-sm text-white/50">{npc.role}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant={getDispositionBadgeVariant(npc.dispositionLabel)}>
                          {npc.dispositionLabel}
                        </Badge>
                        {faction && (
                          <span className="text-xs text-white/40">{faction.shortName}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* NPC Detail */}
            <div className="md:sticky md:top-20 h-fit">
              {selectedNPC ? (
                <div className="panel-solid rounded-2xl overflow-hidden">
                  <div className="p-4 sm:p-6">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center">
                        <User className="h-8 w-8 text-white/40" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white">{selectedNPC.name}</h3>
                        {selectedNPC.alias && (
                          <p className="text-sm text-white/50">
                            a.k.a. {selectedNPC.alias}
                          </p>
                        )}
                        <p className="text-sm text-white/70">{selectedNPC.role}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4 px-4 sm:px-6 pb-5">
                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-2 p-2 bg-white/5 rounded-lg border border-white/10">
                        <Eye className="h-4 w-4 text-white/40" />
                        <div>
                          <p className="text-xs text-white/50">Familiarity</p>
                          <p className="text-sm font-medium text-white/80">{selectedNPC.familiarityLabel}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 p-2 bg-white/5 rounded-lg border border-white/10">
                        <Heart className="h-4 w-4 text-white/40" />
                        <div>
                          <p className="text-xs text-white/50">Disposition</p>
                          <p className="text-sm font-medium text-white/80">
                            {selectedNPC.disposition > 0 ? '+' : ''}{selectedNPC.disposition}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Last Seen */}
                    {selectedNPC.lastSeenAt && (
                      <div className="flex items-center gap-2 text-sm text-white/50">
                        <Calendar className="h-4 w-4" />
                        Last seen: {new Date(selectedNPC.lastSeenAt).toLocaleDateString()}
                      </div>
                    )}

                    {/* Description */}
                    <div>
                      <h4 className="text-sm font-medium text-white/70 mb-1">About</h4>
                      <p className="text-sm text-white/60">{selectedNPC.description}</p>
                    </div>

                    {/* Visual Description */}
                    <div>
                      <h4 className="text-sm font-medium text-white/70 mb-1">Appearance</h4>
                      <p className="text-sm text-white/60 italic">{selectedNPC.visualDescription}</p>
                    </div>

                    {/* Personality */}
                    <div>
                      <h4 className="text-sm font-medium text-white/70 mb-1">Personality</h4>
                      <p className="text-sm text-white/60">{selectedNPC.personality}</p>
                    </div>

                    {/* Faction */}
                    {selectedNPC.factionId && (
                      <div>
                        <h4 className="text-sm font-medium text-white/70 mb-1">Affiliation</h4>
                        <Badge variant="outline">
                          {getFactionById(selectedNPC.factionId)?.name || selectedNPC.factionId}
                        </Badge>
                      </div>
                    )}

                    {/* Notes */}
                    {selectedNPC.notes && (
                      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                        <h4 className="text-sm font-medium text-yellow-400 mb-1">Notes</h4>
                        <p className="text-sm text-yellow-300/80">{selectedNPC.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="panel-glass rounded-2xl p-12">
                  <div className="text-center text-white/40">
                    <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Select a contact to view details</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
