'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { Button } from '@/app/components/ui/button';
import { CharacterSheet } from '@/app/components/game/CharacterSheet';
import { ActionSelector } from '@/app/components/game/ActionSelector';
import { EncounterDisplay } from '@/app/components/game/EncounterDisplay';
import { OutcomeDisplay } from '@/app/components/game/OutcomeDisplay';
import { StoryLog } from '@/app/components/game/StoryLog';
import type { Action } from '@/app/data/actions';
import type { EncounterTemplate } from '@/app/data/encounter-templates';
import { LogOut, User, HelpCircle, Menu, X } from 'lucide-react';

type GameState = 'idle' | 'executing' | 'encounter' | 'resolving' | 'outcome';

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
  powers: Array<{ powerId: string; level: number; xp: number }>;
  factions: Record<string, number>;
  cooldowns: Record<string, string>;
  storyEvents: Array<{
    id: string;
    type: string;
    summary: string;
    fullDescription: string | null;
    weight: number;
    tags: string[];
    createdAt: string;
  }>;
}

interface OutcomeResult {
  success: boolean;
  description: string;
  xpGained: number;
  hpChange?: number;
  energyChange?: number;
  moneyGained?: number;
  factionChanges: { factionId: string; change: number }[];
  attributeGrowth: { attributeId: string; amount: number }[];
}

interface EncounterChoice {
  id: string;
  text: string;
  available: boolean;
  reason?: string;
}

export default function GamePage() {
  const router = useRouter();
  const [character, setCharacter] = useState<CharacterData | null>(null);
  const [gameState, setGameState] = useState<GameState>('idle');
  const [currentEncounter, setCurrentEncounter] = useState<EncounterTemplate | null>(null);
  const [encounterChoices, setEncounterChoices] = useState<EncounterChoice[]>([]);
  const [currentOutcome, setCurrentOutcome] = useState<OutcomeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [levelUpModal, setLevelUpModal] = useState<number | null>(null);

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
      if (data.energyRestored) {
        setError('Energy fully restored!');
        setTimeout(() => setError(null), 3000);
      }
    } catch (err) {
      console.error('Error fetching character:', err);
      setError('Failed to load character data');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchCharacter();
  }, [fetchCharacter]);

  const handleSelectAction = async (action: Action) => {
    if (!character || gameState !== 'idle') return;

    setGameState('executing');
    setError(null);

    try {
      const response = await fetch('/api/action/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionId: action.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to execute action');
        setGameState('idle');
        return;
      }

      // Update character energy
      setCharacter((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          currentEnergy: data.newEnergy,
          money: prev.money + (data.moneyGained || 0),
        };
      });

      if (data.encounterTriggered && data.encounter) {
        // Set up encounter
        const encounter = data.encounter as EncounterTemplate;
        setCurrentEncounter(encounter);

        // Build choices with availability
        const choices = encounter.choices.map((choice) => {
          let available = true;
          let reason: string | undefined;

          // Check power requirements
          if (choice.requiredPowers?.length) {
            const hasPower = choice.requiredPowers.some((p) =>
              character.powers.some((cp) => cp.powerId === p)
            );
            if (!hasPower) {
              available = false;
              reason = 'Requires specific power';
            }
          }

          // Check attribute requirements
          if (choice.requiredAttributes?.length && available) {
            const unmet = choice.requiredAttributes.find(
              (req) => (character.attributes[req.attributeId] || 0) < req.minValue
            );
            if (unmet) {
              available = false;
              reason = `Requires ${unmet.attributeId} ${unmet.minValue}`;
            }
          }

          return {
            id: choice.id,
            text: choice.text,
            available,
            reason,
          };
        });

        setEncounterChoices(choices);
        setGameState('encounter');
      } else {
        // No encounter, show simple result
        setCurrentOutcome({
          success: true,
          description: `You completed ${action.name}. ${
            Object.keys(data.attributeGrowth).length > 0
              ? 'You feel yourself growing stronger.'
              : ''
          }`,
          xpGained: data.xpGained || action.baseXPReward,
          moneyGained: data.moneyGained,
          factionChanges: Object.entries(data.reputationChanges).map(([factionId, change]) => ({
            factionId,
            change: change as number,
          })),
          attributeGrowth: Object.entries(data.attributeGrowth).map(([attributeId, amount]) => ({
            attributeId,
            amount: amount as number,
          })),
        });
        setGameState('outcome');

        // Update character state from server response
        setCharacter((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            currentXp: data.newXp,
            level: data.leveledUp ? data.newLevel : prev.level,
            maxHp: data.leveledUp ? prev.maxHp + 10 : prev.maxHp,
            maxEnergy: data.leveledUp ? prev.maxEnergy + 5 : prev.maxEnergy,
          };
        });

        // Show level up modal if applicable
        if (data.leveledUp) {
          setLevelUpModal(data.newLevel);
        }
      }
    } catch (err) {
      console.error('Action error:', err);
      setError('An error occurred');
      setGameState('idle');
    }
  };

  const handleSelectChoice = async (choiceId: string) => {
    if (!currentEncounter || gameState !== 'encounter') return;

    setGameState('resolving');
    setError(null);

    try {
      const response = await fetch('/api/action/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          encounterId: currentEncounter.id,
          choiceId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to resolve choice');
        setGameState('encounter');
        return;
      }

      setCurrentOutcome({
        success: data.success,
        description: data.outcome.description,
        xpGained: data.outcome.xpGained,
        hpChange: data.outcome.hpChange,
        factionChanges: data.outcome.factionChanges,
        attributeGrowth: data.outcome.attributeGrowth,
      });
      setGameState('outcome');

      // Check for level up
      if (data.leveledUp) {
        setLevelUpModal(data.newLevel);
      }
    } catch (err) {
      console.error('Resolve error:', err);
      setError('An error occurred');
      setGameState('encounter');
    }
  };

  const handleContinue = async () => {
    setCurrentEncounter(null);
    setEncounterChoices([]);
    setCurrentOutcome(null);
    setGameState('idle');
    await fetchCharacter();
  };

  const handleLevelUpClose = () => {
    setLevelUpModal(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your story...</p>
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

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Top Nav */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-lg">Story Forge</h1>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/profile')}
              className="hidden sm:flex"
            >
              <User className="h-4 w-4 mr-1" />
              Profile
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/help')}
              className="hidden sm:flex"
            >
              <HelpCircle className="h-4 w-4 mr-1" />
              Help
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => signOut({ callbackUrl: '/' })}
            >
              <LogOut className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Logout</span>
            </Button>

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="sm:hidden"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden bg-white border-b p-4 space-y-2">
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => {
              router.push('/profile');
              setMobileMenuOpen(false);
            }}
          >
            <User className="h-4 w-4 mr-2" />
            Profile
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => {
              router.push('/help');
              setMobileMenuOpen(false);
            }}
          >
            <HelpCircle className="h-4 w-4 mr-2" />
            Help
          </Button>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 py-2">
          <div
            className={`p-3 rounded-md ${
              error.includes('restored')
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {error}
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Sidebar - Character Sheet */}
          <aside className="lg:col-span-3 space-y-4">
            <CharacterSheet character={character} />
          </aside>

          {/* Center - Story Display */}
          <section className="lg:col-span-6 space-y-4">
            {/* Current State Display */}
            {gameState === 'idle' && (
              <div className="bg-white rounded-lg border p-6">
                <h2 className="text-xl font-semibold mb-2">What will you do?</h2>
                <p className="text-gray-600">
                  Choose an action from the panel on the right to continue your story.
                </p>
              </div>
            )}

            {gameState === 'executing' && (
              <div className="bg-white rounded-lg border p-6 flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Taking action...</p>
                </div>
              </div>
            )}

            {(gameState === 'encounter' || gameState === 'resolving') && currentEncounter && (
              <EncounterDisplay
                encounter={currentEncounter}
                choices={encounterChoices}
                onSelectChoice={handleSelectChoice}
                isResolving={gameState === 'resolving'}
              />
            )}

            {gameState === 'outcome' && currentOutcome && (
              <OutcomeDisplay outcome={currentOutcome} onContinue={handleContinue} />
            )}

            {/* Story Log */}
            <StoryLog events={character.storyEvents} />
          </section>

          {/* Right - Action Selector */}
          <aside className="lg:col-span-3">
            <ActionSelector
              playerLevel={character.level}
              playerAttributes={character.attributes}
              playerPowers={character.powers.map((p) => p.powerId)}
              playerEnergy={character.currentEnergy}
              cooldowns={character.cooldowns}
              onSelectAction={handleSelectAction}
              disabled={gameState !== 'idle'}
            />
          </aside>
        </div>
      </main>

      {/* Level Up Modal */}
      {levelUpModal !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4 text-center">
            <h2 className="text-2xl font-bold text-green-600 mb-2">Level Up!</h2>
            <p className="text-4xl font-bold mb-4">Level {levelUpModal}</p>
            <p className="text-gray-600 mb-4">
              Your maximum HP has increased by 10 and maximum Energy by 5!
            </p>
            <Button onClick={handleLevelUpClose} size="lg">
              Continue
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
