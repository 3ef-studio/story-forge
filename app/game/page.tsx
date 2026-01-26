'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { Button } from '@/app/components/ui/button';
import { CharacterSheet } from '@/app/components/game/CharacterSheet';
import { ActionSelector } from '@/app/components/game/ActionSelector';
import { EncounterDisplay } from '@/app/components/game/EncounterDisplay';
import { OutcomeDisplay } from '@/app/components/game/OutcomeDisplay';
import { ActiveGoalsPanel, type GoalRecord } from '@/app/components/game/ActiveGoalsPanel';
import { GoalChoiceModal, type GoalChoice } from '@/app/components/game/GoalChoiceModal';
import { StatusStrip } from '@/app/components/game/StatusStrip';
import { MobileTabBar, type MobileTab } from '@/app/components/game/MobileTabBar';
import { StoryLogPanel } from '@/app/components/game/StoryLogPanel';
import { CityUpdateCard } from '@/app/components/game/CityUpdateCard';
import { useToast } from '@/app/components/ui/toast';
import { getFactionById } from '@/app/data/factions';
import { attributes as attributesList } from '@/app/data/attributes';
import type { Action } from '@/app/data/actions';
import type { EncounterTemplate } from '@/app/data/encounter-templates';
import { LogOut, User, HelpCircle, Menu, X, Sparkles, Trophy, ArrowUp } from 'lucide-react';
import { previewEncounterResolution, inferApproachFromText } from '@/app/lib/game-logic/combat/resolve-encounter';
import type { ResolutionPreview } from '@/app/lib/game-logic/combat/types';

type GameState = 'idle' | 'executing' | 'encounter' | 'resolving' | 'outcome';

// 3-step loading messages that cycle every ~800ms
const LOADING_STEPS = [
  'Reading the city...',
  'Tracking factions...',
  'Shaping your options...',
];

interface CharacterData {
  id: string;
  name: string;
  originId: string;
  characterType?: string;
  level: number;
  currentXp: number;
  xpToNextLevel: number;
  currentHp: number;
  maxHp: number;
  currentEnergy: number;
  maxEnergy: number;
  money: number;
  pendingLevelUpAttributePick?: boolean;
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
  partial?: boolean;
  description: string;
  xpGained: number;
  hpChange?: number;
  energyChange?: number;
  moneyGained?: number;
  factionChanges: { factionId: string; change: number }[];
  attributeGrowth: { attributeId: string; amount: number }[];
}

interface ResolutionData {
  outcome: 'success' | 'partial' | 'failure';
  roll: number;
  target: number;
  modifiers: { label: string; value: number }[];
  summary: string;
  isRetreat?: boolean;
}

interface PowerProgressionData {
  powerId: string;
  powerName: string;
  powerCategory: string;
  levelBefore: number;
  xpBefore: number;
  levelAfter: number;
  xpAfter: number;
  xpGained: number;
  leveledUp: boolean;
  powerBonusApplied: number;
  xpToNextLevel: number;
}

interface EncounterChoice {
  id: string;
  text: string;
  available: boolean;
  reason?: string;
  requiredPowers?: string[];
  preview?: ResolutionPreview;
}

export default function GamePage() {
  const router = useRouter();
  const { showFactionChange, addToast } = useToast();
  const [character, setCharacter] = useState<CharacterData | null>(null);
  const [gameState, setGameState] = useState<GameState>('idle');
  const [currentEncounter, setCurrentEncounter] = useState<EncounterTemplate | null>(null);
  const [encounterChoices, setEncounterChoices] = useState<EncounterChoice[]>([]);
  const [currentOutcome, setCurrentOutcome] = useState<OutcomeResult | null>(null);
  const [currentResolution, setCurrentResolution] = useState<ResolutionData | null>(null);
  const [currentPowerProgression, setCurrentPowerProgression] = useState<PowerProgressionData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [levelUpModal, setLevelUpModal] = useState<number | null>(null);
  const [levelUpAttributeLoading, setLevelUpAttributeLoading] = useState(false);
  const [isCachedEncounter, setIsCachedEncounter] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);

  // Mobile tab state
  const [mobileTab, setMobileTab] = useState<MobileTab>('scene');

  // Goals state
  const [activeGoals, setActiveGoals] = useState<GoalRecord[]>([]);
  const [completedGoals, setCompletedGoals] = useState<GoalRecord[]>([]);
  const [goalChoices, setGoalChoices] = useState<GoalChoice[]>([]);
  const [showGoalChoice, setShowGoalChoice] = useState(false);

  const fetchGoals = useCallback(async () => {
    try {
      const response = await fetch('/api/goals');
      if (!response.ok) return;
      const data = await response.json();
      setActiveGoals(data.activeGoals || []);
      if (data.needsChoice && data.choices?.length > 0) {
        setGoalChoices(data.choices);
        setShowGoalChoice(true);
      }
    } catch (err) {
      console.error('Error fetching goals:', err);
    }
  }, []);

  const handleAcceptGoal = async (goalTemplateId: string) => {
    try {
      const response = await fetch('/api/goals/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goalTemplateId }),
      });
      if (!response.ok) {
        const data = await response.json();
        addToast({
          type: 'error',
          title: 'Failed to accept goal',
          message: data.error || 'Please try again',
          duration: 3000,
        });
        return;
      }
      const data = await response.json();
      setActiveGoals(data.activeGoals || []);
      if (data.needsChoice && data.choices?.length > 0) {
        setGoalChoices(data.choices);
      } else {
        setShowGoalChoice(false);
        setGoalChoices([]);
      }
      addToast({
        type: 'success',
        title: 'New Goal Accepted!',
        message: data.newGoal?.title || 'Your journey continues',
        duration: 3000,
      });
    } catch (err) {
      console.error('Error accepting goal:', err);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to accept goal',
        duration: 3000,
      });
    }
  };

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

      // Check for pending level-up attribute pick
      if (data.character.pendingLevelUpAttributePick) {
        setLevelUpModal(data.character.level);
      }

      if (data.energyRestored) {
        addToast({
          type: 'success',
          title: 'Energy Restored',
          message: 'Your energy has been fully restored!',
          duration: 3000,
        });
      }
      fetchGoals();
    } catch (err) {
      console.error('Error fetching character:', err);
      setError('Failed to load character data');
    } finally {
      setLoading(false);
    }
  }, [router, fetchGoals, addToast]);

  useEffect(() => {
    fetchCharacter();
  }, [fetchCharacter]);

  // Loading step animation for encounter generation
  useEffect(() => {
    if (gameState !== 'executing') return;

    const interval = setInterval(() => {
      setLoadingStep((prev) => (prev + 1) % LOADING_STEPS.length);
    }, 800);

    return () => clearInterval(interval);
  }, [gameState]);

  const handleSelectAction = async (action: Action) => {
    if (!character || gameState !== 'idle') return;

    setGameState('executing');
    setError(null);
    setLoadingStep(0);
    // Switch to scene tab on mobile when action is selected
    setMobileTab('scene');

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

      // Update character energy and HP
      setCharacter((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          currentEnergy: data.newEnergy,
          currentHp: data.newHp ?? prev.currentHp,
          money: prev.money + (data.moneyGained || 0),
        };
      });

      if (data.encounterTriggered && data.encounter) {
        const encounter = data.encounter as EncounterTemplate;
        setCurrentEncounter(encounter);
        setIsCachedEncounter(data.isCachedEncounter || false);

        const choices = encounter.choices.map((choice) => {
          let available = true;
          let reason: string | undefined;

          if (choice.requiredPowers?.length) {
            const hasPower = choice.requiredPowers.some((p) =>
              character.powers.some((cp) => cp.powerId === p)
            );
            if (!hasPower) {
              available = false;
              reason = 'Requires specific power';
            }
          }

          if (choice.requiredAttributes?.length && available) {
            const unmet = choice.requiredAttributes.find(
              (req) => (character.attributes[req.attributeId] || 0) < req.minValue
            );
            if (unmet) {
              available = false;
              reason = `Requires ${unmet.attributeId} ${unmet.minValue}`;
            }
          }

          // Calculate preview for available choices
          let preview: ResolutionPreview | undefined;
          if (available) {
            const approach = inferApproachFromText(choice.text);
            preview = previewEncounterResolution({
              difficulty: encounter.difficulty,
              approach,
              attributes: character.attributes,
              powerIds: character.powers.map((p) => p.powerId),
              repByFaction: character.factions,
              encounterTags: encounter.narrativeTags,
              involvedFactions: encounter.requiredFactions,
            });
          }

          return {
            id: choice.id,
            text: choice.text,
            available,
            reason,
            requiredPowers: choice.requiredPowers,
            preview,
          };
        });

        setEncounterChoices(choices);
        setGameState('encounter');
      } else {
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

        if (data.leveledUp) {
          setLevelUpModal(data.newLevel);
        }
      }

      if (data.goals) {
        setActiveGoals(data.goals.active || []);
        if (data.goals.completed?.length > 0) {
          setCompletedGoals(data.goals.completed);
          data.goals.completed.forEach((goal: GoalRecord) => {
            addToast({
              type: 'success',
              title: 'Goal Completed!',
              message: `${goal.title} (+${goal.xpReward} XP)`,
              duration: 4000,
            });
          });
          setTimeout(() => setCompletedGoals([]), 5000);
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
          isCached: isCachedEncounter,
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
        partial: data.partial,
        description: data.outcome.description,
        xpGained: data.outcome.xpGained,
        hpChange: data.outcome.hpChange,
        factionChanges: data.outcome.factionChanges,
        attributeGrowth: data.outcome.attributeGrowth,
      });

      // Set resolution breakdown if available
      if (data.resolution) {
        setCurrentResolution(data.resolution);
      }

      // Set power progression if available
      if (data.powerProgression) {
        setCurrentPowerProgression(data.powerProgression);
      }

      setGameState('outcome');

      if (data.outcome.factionChanges?.length > 0) {
        data.outcome.factionChanges.forEach((change: { factionId: string; change: number }, index: number) => {
          setTimeout(() => {
            const faction = getFactionById(change.factionId);
            if (faction) {
              showFactionChange(faction.shortName || faction.name, change.change);
            }
          }, index * 500);
        });
      }

      // Determine toast type and title based on outcome
      const toastType = data.success ? 'success' : data.partial ? 'warning' : 'error';
      const toastTitle = data.success ? 'Success!' : data.partial ? 'Partial Success' : 'Failed';

      addToast({
        type: toastType as 'success' | 'warning' | 'error',
        title: toastTitle,
        message: `${data.outcome.xpGained} XP gained`,
        duration: 3000,
      });

      if (data.leveledUp) {
        setLevelUpModal(data.newLevel);
      }

      if (data.goals) {
        setActiveGoals(data.goals.active || []);
        if (data.goals.completed?.length > 0) {
          setCompletedGoals(data.goals.completed);
          data.goals.completed.forEach((goal: GoalRecord) => {
            addToast({
              type: 'success',
              title: 'Goal Completed!',
              message: `${goal.title} (+${goal.xpReward} XP)`,
              duration: 4000,
            });
          });
          setTimeout(() => setCompletedGoals([]), 5000);
        }
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
    setCurrentResolution(null);
    setCurrentPowerProgression(null);
    setIsCachedEncounter(false);
    setGameState('idle');
    await fetchCharacter();
  };

  const handleLevelUpAttributeSelect = async (attributeId: string) => {
    if (levelUpAttributeLoading) return;
    setLevelUpAttributeLoading(true);

    try {
      const response = await fetch('/api/character/levelup/attribute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attributeId }),
      });

      const data = await response.json();

      if (!response.ok) {
        addToast({
          type: 'error',
          title: 'Error',
          message: data.error || 'Failed to apply attribute bonus',
          duration: 3000,
        });
        setLevelUpAttributeLoading(false);
        return;
      }

      // Update character attributes locally
      setCharacter((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          attributes: data.attributes,
          pendingLevelUpAttributePick: false,
        };
      });

      const attr = attributesList.find((a) => a.id === attributeId);
      addToast({
        type: 'success',
        title: 'Attribute Improved!',
        message: `${attr?.name || attributeId} +${data.bonus}`,
        duration: 3000,
      });

      setLevelUpModal(null);
    } catch {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'An error occurred',
        duration: 3000,
      });
    } finally {
      setLevelUpAttributeLoading(false);
    }
  };

  // Get active goal title for status strip
  const activeGoalTitle = activeGoals.length > 0 ? activeGoals[0].title : undefined;

  // Find the most recent city update from story events
  const latestCityUpdate = character?.storyEvents?.find(
    (event) => event.type === 'city_update'
  );

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

  // Determine if we have an active encounter for tab indicator
  const hasActiveEncounter = gameState === 'encounter' || gameState === 'executing' || gameState === 'outcome';

  // Scene content (shared between mobile tab and desktop center column)
  const renderSceneContent = () => {
    if (gameState === 'idle') {
      return (
        <div className="bg-white rounded-lg border p-4 sm:p-6 text-center">
          <h2 className="text-lg sm:text-xl font-semibold mb-2">What will you do?</h2>
          <p className="text-gray-600 text-sm sm:text-base">
            <span className="hidden sm:inline">Choose an action from the panel on the right to continue your story.</span>
            <span className="sm:hidden">Tap the Actions tab below to choose your next move.</span>
          </p>
        </div>
      );
    }

    if (gameState === 'executing') {
      return (
        <div className="bg-white rounded-lg border p-6">
          <div className="text-center space-y-4">
            {/* Title */}
            <h3 className="text-lg font-semibold text-gray-800">Encounter forming...</h3>

            {/* 3-step indicator */}
            <div className="space-y-2">
              {LOADING_STEPS.map((step, index) => (
                <div
                  key={step}
                  className={`flex items-center gap-2 justify-center transition-opacity duration-300 ${
                    index === loadingStep ? 'opacity-100' : 'opacity-30'
                  }`}
                >
                  <div
                    className={`w-2 h-2 rounded-full ${
                      index === loadingStep ? 'bg-blue-500 animate-pulse' : 'bg-gray-300'
                    }`}
                  />
                  <span
                    className={`text-sm ${
                      index === loadingStep ? 'text-blue-600 font-medium' : 'text-gray-400'
                    }`}
                  >
                    {step}
                  </span>
                </div>
              ))}
            </div>

            {/* Skeleton card preview */}
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto mb-3"></div>
              <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-5/6 mb-4"></div>
              <div className="space-y-2">
                <div className="h-10 bg-gray-200 rounded"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if ((gameState === 'encounter' || gameState === 'resolving') && currentEncounter) {
      return (
        <EncounterDisplay
          encounter={currentEncounter}
          choices={encounterChoices}
          onSelectChoice={handleSelectChoice}
          isResolving={gameState === 'resolving'}
        />
      );
    }

    if (gameState === 'outcome' && currentOutcome) {
      return (
        <OutcomeDisplay
          outcome={currentOutcome}
          resolution={currentResolution ?? undefined}
          powerProgression={currentPowerProgression ?? undefined}
          onContinue={handleContinue}
        />
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-gray-100 pb-16 sm:pb-0">
      {/* Top Nav */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-lg text-gray-900">Story Forge</h1>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => router.push('/profile')}
              className="hidden sm:flex"
            >
              <User className="h-4 w-4 mr-1" />
              Profile
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => router.push('/help')}
              className="hidden sm:flex"
            >
              <HelpCircle className="h-4 w-4 mr-1" />
              Help
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => signOut({ callbackUrl: '/' })}
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline ml-1">Logout</span>
            </Button>

            {/* Mobile menu button */}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="sm:hidden"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile dropdown menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden bg-white border-b p-3 space-y-2 shadow-md">
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

      {/* Mobile Status Strip */}
      <StatusStrip
        hp={character.currentHp}
        maxHp={character.maxHp}
        energy={character.currentEnergy}
        maxEnergy={character.maxEnergy}
        xp={character.currentXp}
        xpToNextLevel={character.xpToNextLevel}
        level={character.level}
        activeGoalTitle={activeGoalTitle}
      />

      {/* Error Banner */}
      {error && (
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2">
          <div className="p-3 rounded-md bg-red-50 text-red-700 border border-red-200 text-sm">
            {error}
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto">
        {/* MOBILE LAYOUT (< sm) */}
        <div className="sm:hidden">
          <div className="px-3 py-3">
            {mobileTab === 'scene' && renderSceneContent()}

            {mobileTab === 'actions' && (
              <ActionSelector
                playerLevel={character.level}
                playerAttributes={character.attributes}
                playerPowers={character.powers.map((p) => p.powerId)}
                playerEnergy={character.currentEnergy}
                cooldowns={character.cooldowns}
                onSelectAction={handleSelectAction}
                disabled={gameState !== 'idle'}
                activeGoals={activeGoals}
                compact
                hideHeader
              />
            )}

            {mobileTab === 'log' && (
              <div className="space-y-4">
                {/* City Update */}
                {latestCityUpdate && (
                  <CityUpdateCard
                    title={latestCityUpdate.summary}
                    body={latestCityUpdate.fullDescription || ''}
                    timestamp={latestCityUpdate.createdAt}
                  />
                )}

                {/* Compact goals summary */}
                {activeGoals.length > 0 && (
                  <div className="bg-white rounded-lg border p-3">
                    <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
                      <span className="text-yellow-500">★</span> Goals
                    </h3>
                    <div className="space-y-2">
                      {activeGoals.slice(0, 2).map((goal) => (
                        <div key={goal.id} className="text-xs">
                          <div className="flex justify-between text-gray-700">
                            <span className="truncate flex-1">{goal.title}</span>
                            <span className="text-gray-500 ml-2">
                              {goal.currentProgress}/{goal.targetValue}
                            </span>
                          </div>
                          <div className="h-1 bg-gray-100 rounded-full mt-1 overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full"
                              style={{
                                width: `${Math.min(100, (goal.currentProgress / goal.targetValue) * 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Story log */}
                <div className="bg-white rounded-lg border p-3">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Recent Events</h3>
                  <StoryLogPanel events={character.storyEvents} maxItems={10} compact />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* DESKTOP LAYOUT (>= sm) */}
        <div className="hidden sm:block px-4 py-4">
          <div className="grid grid-cols-12 gap-4">
            {/* Left Sidebar - Character Sheet & Goals */}
            <aside className="col-span-4 lg:col-span-3 space-y-4">
              <CharacterSheet character={character} />
              <ActiveGoalsPanel goals={activeGoals} completedGoals={completedGoals} />
            </aside>

            {/* Center - Scene */}
            <section className="col-span-8 lg:col-span-6 space-y-4">
              {renderSceneContent()}

              {/* City Update (desktop only) */}
              {latestCityUpdate && (
                <CityUpdateCard
                  title={latestCityUpdate.summary}
                  body={latestCityUpdate.fullDescription || ''}
                  timestamp={latestCityUpdate.createdAt}
                />
              )}

              {/* Story Log (desktop only) */}
              <div className="bg-white rounded-lg border p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Story Log</h3>
                <StoryLogPanel events={character.storyEvents} maxItems={5} />
              </div>
            </section>

            {/* Right - Actions */}
            <aside className="hidden lg:block lg:col-span-3">
              <ActionSelector
                playerLevel={character.level}
                playerAttributes={character.attributes}
                playerPowers={character.powers.map((p) => p.powerId)}
                playerEnergy={character.currentEnergy}
                cooldowns={character.cooldowns}
                onSelectAction={handleSelectAction}
                disabled={gameState !== 'idle'}
                activeGoals={activeGoals}
              />
            </aside>
          </div>
        </div>
      </main>

      {/* Mobile Tab Bar */}
      <MobileTabBar
        activeTab={mobileTab}
        onTabChange={setMobileTab}
        hasActiveEncounter={hasActiveEncounter}
      />

      {/* Level Up Modal with Attribute Selection */}
      {levelUpModal !== null && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-60 p-4">
          <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl border-2 border-yellow-300">
            <div className="text-center mb-6">
              <div className="flex justify-center gap-2 mb-4">
                <Sparkles className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-500 animate-pulse" />
                <Trophy className="h-8 w-8 sm:h-10 sm:w-10 text-yellow-600" />
                <Sparkles className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-500 animate-pulse" />
              </div>

              <h2 className="text-2xl sm:text-3xl font-bold text-yellow-600 mb-2">
                Level Up!
              </h2>

              <div className="text-4xl sm:text-5xl font-black text-yellow-600 mb-4">
                Level {levelUpModal}
              </div>

              <div className="space-y-1 text-sm text-gray-600">
                <div className="text-green-600">+10 Maximum HP</div>
                <div className="text-yellow-600">+5 Maximum Energy</div>
              </div>
            </div>

            <div className="border-t border-yellow-200 pt-4">
              <h3 className="text-center font-semibold text-gray-800 mb-3 flex items-center justify-center gap-2">
                <ArrowUp className="h-4 w-4 text-green-600" />
                Choose an Attribute to Improve (+2)
              </h3>

              <div className="grid grid-cols-2 gap-2">
                {attributesList
                  .filter((attr) => !['reputation', 'notoriety'].includes(attr.id))
                  .map((attr) => (
                    <Button
                      key={attr.id}
                      variant="outline"
                      size="sm"
                      onClick={() => handleLevelUpAttributeSelect(attr.id)}
                      disabled={levelUpAttributeLoading}
                      className="justify-between hover:bg-yellow-100 hover:border-yellow-400"
                    >
                      <span className="capitalize">{attr.name}</span>
                      <span className="text-gray-400 text-xs">
                        {character?.attributes[attr.id] ?? attr.baseValue}
                      </span>
                    </Button>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Goal Choice Modal */}
      {showGoalChoice && goalChoices.length > 0 && (
        <GoalChoiceModal
          choices={goalChoices}
          onAccept={handleAcceptGoal}
          onClose={() => setShowGoalChoice(false)}
        />
      )}
    </div>
  );
}
