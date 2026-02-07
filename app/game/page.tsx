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
import { LoadingSigil } from '@/app/components/ui/LoadingSigil';
import { AnimatedCard } from '@/app/components/ui/AnimatedCard';
import { FocusChannel, type FocusResult, type FocusMode } from '@/app/components/game/FocusChannel';
import { useToast } from '@/app/components/ui/toast';
import { getFactionById } from '@/app/data/factions';
import { attributes as attributesList } from '@/app/data/attributes';
import type { Action } from '@/app/data/actions';
import type { DistrictId } from '@/app/data/districts';
import type { EncounterTemplate } from '@/app/data/encounter-templates';
import { getLocationBackground } from '@/app/lib/game-logic/location-backgrounds';
import { LogOut, User, HelpCircle, Menu, X, Sparkles, Trophy, ArrowUp, Users } from 'lucide-react';
import { previewEncounterResolution, inferApproachFromText, resolveGambitFromPreview, assignDistinctGambits } from '@/app/lib/game-logic/combat/resolve-encounter';
import type { ResolutionPreview, PrepSelection, GambitResult } from '@/app/lib/game-logic/combat/types';
import { ConflictPane } from '@/app/components/game/ConflictPane';
import { initConflict, executeTurn, evaluateOutcome } from '@/app/lib/game-logic/conflict/engine';
import type { ConflictState, ConflictResult, MoveId } from '@/app/lib/game-logic/conflict/types';
import { getNPCById } from '@/app/data/npcs';
import { resolveOpponentIdentity, logOpponentIdentity } from '@/app/lib/game-logic/conflict/opponent-identity';
import type { RivalPersonality } from '@/app/data/rivals';
import {
  type LeverageState,
  type LeverageSpend,
  emptyLeverage,
  addLeverage,
  leverageFromPrep,
  leverageFromFocus,
  spendLeverage,
  logLeverageGrant,
  logLeverageSpend,
} from '@/app/lib/game-logic/leverage';
import type { FollowUpAction } from '@/app/lib/game-logic/follow-up-actions';

type GameState = 'idle' | 'executing' | 'encounter' | 'conflict' | 'resolving' | 'outcome';

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
  currentDistrict: DistrictId;
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
  activeThread?: {
    id: string;
    type: string;
    title: string;
    summary: string;
    expiresIn: number;
  } | null;
  leverage?: LeverageState;
  heat?: number;
  actionCounter?: number;
  followUps?: FollowUpAction[];
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
  const [currentEncounter, setCurrentEncounter] = useState<(EncounterTemplate & { threadId?: string; threadTitle?: string; npcId?: string }) | null>(null);
  const [currentActionContext, setCurrentActionContext] = useState<{ actionId: string; sourceActionId?: string; locationType?: string; isFollowUp?: boolean } | null>(null);
  const [encounterChoices, setEncounterChoices] = useState<EncounterChoice[]>([]);
  const [currentOutcome, setCurrentOutcome] = useState<OutcomeResult | null>(null);
  const [currentResolution, setCurrentResolution] = useState<ResolutionData | null>(null);
  const [currentPowerProgression, setCurrentPowerProgression] = useState<PowerProgressionData | null>(null);
  const [rivalPresence, setRivalPresence] = useState<{
    rivalId: string; name: string; role: string; personality: string;
    intensity: string; flavorText: string; level: number; hostility: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [levelUpModal, setLevelUpModal] = useState<number | null>(null);
  const [levelUpAttributeLoading, setLevelUpAttributeLoading] = useState(false);
  const [isCachedEncounter, setIsCachedEncounter] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [focusResult, setFocusResult] = useState<FocusResult>({ mode: null, modifier: 0 });

  // Conflict state
  const [conflictState, setConflictState] = useState<ConflictState | null>(null);
  const [conflictResult, setConflictResult] = useState<ConflictResult | null>(null);
  const [pendingChoiceId, setPendingChoiceId] = useState<string | null>(null);
  const [pendingPrepSelection, setPendingPrepSelection] = useState<PrepSelection | null>(null);

  // Leverage state — synced from character on load / resolve response, display-only during conflict
  const [leverage, setLeverage] = useState<LeverageState>(emptyLeverage());
  // Tracks how much leverage was spent during the current conflict (reset per encounter)
  const [leverageSpent, setLeverageSpent] = useState<LeverageState>(emptyLeverage());

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

  const handleDistrictChange = useCallback(async (districtId: DistrictId) => {
    try {
      const response = await fetch('/api/character/district', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ districtId }),
      });
      if (!response.ok) {
        const data = await response.json();
        addToast({
          type: 'error',
          title: 'Failed to change district',
          message: data.error || 'Please try again',
          duration: 3000,
        });
        return;
      }
      setCharacter((prev) => prev ? { ...prev, currentDistrict: districtId } : null);
      addToast({
        type: 'success',
        title: 'District Changed',
        message: `You moved to a new district.`,
        duration: 2000,
      });
    } catch (err) {
      console.error('District change error:', err);
    }
  }, [addToast]);

  const fetchCharacter = useCallback(async () => {
    try {
      const response = await fetch('/api/character/get', { cache: 'no-store' });
      if (response.status === 404) {
        router.push('/character-creation');
        return;
      }
      if (!response.ok) {
        throw new Error('Failed to fetch character');
      }
      const data = await response.json();
      setCharacter(data.character);
      // Sync leverage from server
      if (data.character.leverage) {
        setLeverage(data.character.leverage);
      }

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

  // Handle follow-up action selection
  const handleSelectFollowUp = async (followUp: FollowUpAction) => {
    if (!character || gameState !== 'idle') return;

    setGameState('executing');
    setError(null);
    setLoadingStep(0);
    setFocusResult({ mode: null, modifier: 0 });
    setMobileTab('scene');

    try {
      // Follow-up actions use their ID directly - the execute route handles fup_* IDs
      const response = await fetch('/api/action/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionId: followUp.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to execute follow-up');
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
          // Clear the consumed follow-up from local state
          followUps: prev.followUps?.filter(f => f.id !== followUp.id),
        };
      });

      if (data.encounterTriggered && data.encounter) {
        const encounter = data.encounter as EncounterTemplate & { threadId?: string; threadTitle?: string };
        setCurrentEncounter(encounter);
        setIsCachedEncounter(data.isCachedEncounter || false);
        setRivalPresence(data.rivalPresence ?? null);
        setCurrentActionContext({
          actionId: data.baseActionId ?? followUp.origin.actionId ?? 'followup',
          sourceActionId: data.sourceActionId ?? followUp.id,
          locationType: followUp.executeHints.locationTypes?.[0],
          isFollowUp: data.isFollowUp ?? true,
        });

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
              choiceText: choice.text,
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

        // Assign mechanically distinct gambits across available choices
        const availableChoices = choices.filter(c => c.available && c.preview);
        if (availableChoices.length > 1) {
          const distinctGambits = assignDistinctGambits(
            availableChoices.map(c => ({ text: c.text, riskTier: c.preview!.riskTier }))
          );
          availableChoices.forEach((c, i) => {
            c.preview!.gambit = distinctGambits[i];
          });
        }

        setEncounterChoices(choices);
        setGameState('encounter');
      } else {
        const outcomeDescription = `You pursued ${followUp.name}. ${
          Object.keys(data.attributeGrowth).length > 0
            ? 'You feel yourself growing stronger.'
            : ''
        }`;

        setCurrentOutcome({
          success: true,
          description: outcomeDescription,
          xpGained: data.xpGained || 0,
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
      console.error('Follow-up execution error:', err);
      setError('An error occurred');
      setGameState('idle');
    }
  };

  const handleSelectAction = async (action: Action) => {
    if (!character || gameState !== 'idle') return;

    setGameState('executing');
    setError(null);
    setLoadingStep(0);
    setFocusResult({ mode: null, modifier: 0 });
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
        const encounter = data.encounter as EncounterTemplate & { threadId?: string; threadTitle?: string };
        setCurrentEncounter(encounter);
        setIsCachedEncounter(data.isCachedEncounter || false);
        setRivalPresence(data.rivalPresence ?? null);
        setCurrentActionContext({
          actionId: data.baseActionId ?? action.id,
          sourceActionId: data.sourceActionId ?? action.id,
          locationType: action.locationTypes?.[0],
          isFollowUp: data.isFollowUp ?? false,
        });

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

          // Calculate preview for available choices (gambit assigned below via dedup)
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
              choiceText: choice.text,
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

        // Assign mechanically distinct gambits across available choices
        const availableChoices = choices.filter(c => c.available && c.preview);
        if (availableChoices.length > 1) {
          const distinctGambits = assignDistinctGambits(
            availableChoices.map(c => ({ text: c.text, riskTier: c.preview!.riskTier }))
          );
          availableChoices.forEach((c, i) => {
            c.preview!.gambit = distinctGambits[i];
          });
        }

        setEncounterChoices(choices);
        setGameState('encounter');
      } else {
        let outcomeDescription = `You completed ${action.name}. ${
          Object.keys(data.attributeGrowth).length > 0
            ? 'You feel yourself growing stronger.'
            : ''
        }`;

        // Append NPC interaction info for social actions
        if (data.npcInteraction) {
          const npc = data.npcInteraction;
          outcomeDescription += ` You spent time with ${npc.npcName} (${npc.npcRole}). They seem ${npc.dispositionLabel} toward you.`;
        }

        setCurrentOutcome({
          success: true,
          description: outcomeDescription,
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

  const handleSelectChoice = async (choiceId: string, prepSelection: PrepSelection | null = null) => {
    if (!currentEncounter || gameState !== 'encounter') return;

    // Save pending state for after conflict resolution
    setPendingChoiceId(choiceId);
    setPendingPrepSelection(prepSelection);

    // Look up NPC tags for AI profile
    const npc = currentEncounter.npcId ? getNPCById(currentEncounter.npcId) : null;
    const npcTags: string[] = npc ? [...npc.tags] : [];

    // Resolve opponent identity
    const opponentIdentity = resolveOpponentIdentity({
      rival: rivalPresence ? {
        id: rivalPresence.rivalId,
        name: rivalPresence.name,
        personality: rivalPresence.personality as RivalPersonality,
        level: rivalPresence.level,
        hostility: rivalPresence.hostility,
      } : undefined,
      npc: npc ? { id: npc.id, name: npc.name, tags: npc.tags, factionId: npc.factionId } : undefined,
      encounterCategory: currentEncounter.category,
      encounterDifficulty: currentEncounter.difficulty,
      encounterTags: currentEncounter.narrativeTags,
      district: character?.currentDistrict,
      factionId: currentEncounter.requiredFactions?.[0],
    });
    logOpponentIdentity(opponentIdentity);

    // Generate leverage preview for conflict UI (server is authoritative, this is display-only)
    // Reset spent tracker for new encounter
    setLeverageSpent(emptyLeverage());
    let conflictLeverage = { ...leverage };

    if (prepSelection) {
      const prepGrant = leverageFromPrep(prepSelection);
      conflictLeverage = addLeverage(conflictLeverage, prepGrant.type);
      logLeverageGrant(prepGrant.type, prepGrant.source, conflictLeverage);
    }

    if (focusResult.mode && focusResult.modifier > 0) {
      const prepPowerId = prepSelection?.type === 'power' ? prepSelection.powerId : undefined;
      const focusGrant = leverageFromFocus(focusResult.mode, focusResult.modifier, prepPowerId);
      if (focusGrant) {
        conflictLeverage = addLeverage(conflictLeverage, focusGrant.type);
        logLeverageGrant(focusGrant.type, focusGrant.source, conflictLeverage);
      }
    }

    setLeverage(conflictLeverage);

    // Roll gambit outcome using the preview (preserves distinct shape assignment)
    const choice = encounterChoices.find(c => c.id === choiceId);
    let gambitResult: GambitResult | undefined;
    if (choice?.preview?.gambit) {
      gambitResult = resolveGambitFromPreview(choice.preview.gambit);
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Gambit] Rolled ${gambitResult.outcomeTier} (${gambitResult.roll}) for ${gambitResult.intent} choice`);
      }
    }

    // Initialize conflict
    const conflict = initConflict({
      encounterCategory: currentEncounter.category,
      encounterDifficulty: currentEncounter.difficulty,
      npcTags,
      playerLabel: character?.name || 'You',
      opponentLabel: opponentIdentity.name,
      opponentIdentity,
      leverage: conflictLeverage,
      gambitResult,
      heat: character?.heat ?? 0,
      playerBuild: character ? {
        level: character.level,
        attributes: character.attributes,
        powers: character.powers.map(p => ({ powerId: p.powerId, level: p.level })),
      } : undefined,
    });

    setConflictState(conflict);
    setGameState('conflict');
  };

  const handleConflictMove = (moveId: MoveId) => {
    if (!conflictState || conflictState.ended) return;
    const newState = executeTurn(conflictState, moveId);
    setConflictState(newState);
  };

  const handleLeverageSpend = (spend: LeverageSpend) => {
    if (!conflictState || conflictState.ended) return;
    const newLeverage = spendLeverage(leverage, spend.leverageType);
    if (!newLeverage) return;

    logLeverageSpend(spend.leverageType, spend.effect, newLeverage);
    setLeverage(newLeverage);
    // Track cumulative spent for this encounter (server needs this)
    setLeverageSpent(prev => ({
      ...prev,
      [spend.leverageType]: prev[spend.leverageType] + 1,
    }));
    // Arm the effect on the conflict state — will be applied in executeTurn
    setConflictState({ ...conflictState, armedLeverage: spend, leverage: newLeverage });
  };

  const handleConflictContinue = async () => {
    if (!conflictState || !currentEncounter) return;

    // Evaluate conflict result — this is the authoritative success/failure signal
    const result = evaluateOutcome(conflictState);
    setConflictResult(result);

    // Map conflict outcome → resolution override
    // player_victory → success, opponent_victory → failure, stalemate → partial
    const resolutionOutcomeOverride =
      result.outcome === 'player_victory' ? 'success'
      : result.outcome === 'opponent_victory' ? 'failure'
      : 'partial';

    // Build conflict outcome payload for the resolver
    const conflictOutcome = {
      result: result.outcome === 'player_victory' ? 'victory' as const : result.outcome === 'opponent_victory' ? 'defeat' as const : 'stalemate' as const,
      turnsUsed: result.turnsPlayed,
      final: {
        player: { ...result.playerFinalResources },
        opponent: { ...result.opponentFinalResources },
      },
    };

    // Build turn timeline for telemetry (compact format)
    const turnTimeline = result.conflictLog.map((entry) => ({
      turnIndex: entry.turn,
      playerMove: entry.playerMove,
      opponentMove: entry.opponentMove,
      leverageSpent: entry.leverageSpentThisTurn
        ? { type: entry.leverageSpentThisTurn.leverageType, effect: entry.leverageSpentThisTurn.effectType }
        : null,
      resourcesBefore: entry.resourcesBefore
        ? {
            player: { c: entry.resourcesBefore.player.control, s: entry.resourcesBefore.player.stability, p: entry.resourcesBefore.player.position },
            opponent: { c: entry.resourcesBefore.opponent.control, s: entry.resourcesBefore.opponent.stability, p: entry.resourcesBefore.opponent.position },
          }
        : null,
      resourcesAfter: {
        player: { c: entry.playerSnapshot.control, s: entry.playerSnapshot.stability, p: entry.playerSnapshot.position },
        opponent: { c: entry.opponentSnapshot.control, s: entry.opponentSnapshot.stability, p: entry.opponentSnapshot.position },
      },
    }));

    if (process.env.NODE_ENV === 'development') {
      console.log('[Conflict→Resolve] Conflict result:', result.outcome);
      console.log('[Conflict→Resolve] Mapped to resolutionOutcomeOverride:', resolutionOutcomeOverride);
      console.log('[Conflict→Resolve] conflictOutcome payload:', conflictOutcome);
    }

    // Transition to resolving — the legacy results screen is the final output
    setGameState('resolving');
    setError(null);

    try {
      const response = await fetch('/api/action/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          encounterId: currentEncounter.id,
          choiceId: pendingChoiceId,
          isCached: isCachedEncounter,
          threadId: currentEncounter.threadId,
          actionId: currentActionContext?.actionId,
          sourceActionId: currentActionContext?.sourceActionId,
          locationType: currentActionContext?.locationType,
          npcId: currentEncounter.npcId,
          prepSelection: pendingPrepSelection,
          rivalPresent: !!rivalPresence,
          focusMode: focusResult.mode,
          focusModifier: focusResult.modifier,
          resolutionOutcomeOverride,
          conflictOutcome,
          leverageSpent,
          turnTimeline,
          // Opponent identity for telemetry
          opponentIdentity: conflictState.opponentIdentity ? {
            kind: conflictState.opponentIdentity.kind,
            name: conflictState.opponentIdentity.name,
            archetype: conflictState.opponentIdentity.archetype,
            threatTier: conflictState.opponentIdentity.threatTier,
          } : undefined,
          // Gambit result for telemetry
          gambitResult: conflictState.gambitResult ? {
            intent: conflictState.gambitResult.intent,
            roll: conflictState.gambitResult.roll,
            outcomeTier: conflictState.gambitResult.outcomeTier,
            effects: conflictState.gambitResult.effects,
          } : undefined,
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
        energyChange: data.outcome.energyChange,
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

      // Sync leverage from server-authoritative response
      if (data.leverage) {
        setLeverage(data.leverage);
      }

      // Update character stats immediately from resolve response for character pane display
      setCharacter(prev => {
        if (!prev) return null;
        return {
          ...prev,
          currentHp: Math.max(0, prev.currentHp + (data.outcome.hpChange ?? 0)),
          currentEnergy: Math.max(0, prev.currentEnergy + (data.outcome.energyChange ?? 0)),
          currentXp: prev.currentXp + (data.outcome.xpGained ?? 0),
          level: data.leveledUp ? data.newLevel : prev.level,
          leverage: data.leverage ?? prev.leverage,
        };
      });

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
    setCurrentActionContext(null);
    setRivalPresence(null);
    setIsCachedEncounter(false);
    setConflictState(null);
    setConflictResult(null);
    setPendingChoiceId(null);
    setPendingPrepSelection(null);
    setLeverageSpent(emptyLeverage());
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
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-center space-y-3">
          <LoadingSigil label="Loading your story" />
          <p className="text-sm text-white/50">Loading your story...</p>
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
  const hasActiveEncounter = gameState === 'encounter' || gameState === 'executing' || gameState === 'conflict' || gameState === 'outcome';

  // Scene content (shared between mobile tab and desktop center column)
  const renderSceneContent = () => {
    if (gameState === 'idle') {
      return (
        <AnimatedCard variant="panel" className="panel-glass p-5 sm:p-6 text-center">
          <h2 className="text-lg sm:text-xl font-bold text-white mb-2">What will you do?</h2>
          <p className="text-white/60 text-sm sm:text-base">
            <span className="hidden sm:inline">Choose an action from the panel on the right to continue your story.</span>
            <span className="sm:hidden">Tap the <span className="font-semibold text-white/80">Actions</span> tab below to choose your next move.</span>
          </p>
        </AnimatedCard>
      );
    }

    if (gameState === 'executing') {
      return (
        <AnimatedCard variant="panel" className="panel-glass p-6">
          <div className="space-y-5">
            <div className="text-center space-y-4">
              {/* Title */}
              <h3 className="text-lg font-semibold text-white">Encounter forming...</h3>

              {/* Animated sigil */}
              <div className="flex justify-center">
                <LoadingSigil label="Generating encounter" />
              </div>

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
                        index === loadingStep ? 'bg-blue-400 animate-pulse' : 'bg-white/30'
                      }`}
                    />
                    <span
                      className={`text-sm ${
                        index === loadingStep ? 'text-blue-300 font-medium' : 'text-white/40'
                      }`}
                    >
                      {step}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Focus Channeling Mini-Game */}
            <div className="border-t border-white/10 pt-4">
              <FocusChannel
                active={gameState === 'executing'}
                onComplete={setFocusResult}
              />
            </div>
          </div>
        </AnimatedCard>
      );
    }

    if ((gameState === 'encounter' || gameState === 'resolving') && currentEncounter) {
      return (
        <EncounterDisplay
          encounter={currentEncounter}
          choices={encounterChoices}
          onSelectChoice={handleSelectChoice}
          isResolving={gameState === 'resolving'}
          characterEnergy={character.currentEnergy}
          characterPowers={character.powers}
          focusResult={focusResult}
        />
      );
    }

    if (gameState === 'conflict' && conflictState) {
      return (
        <ConflictPane
          state={conflictState}
          leverage={leverage}
          onPlayerMove={handleConflictMove}
          onLeverageSpend={handleLeverageSpend}
          onContinue={handleConflictContinue}
        />
      );
    }

    if (gameState === 'outcome' && currentOutcome) {
      return (
        <OutcomeDisplay
          outcome={currentOutcome}
          resolution={currentResolution ?? undefined}
          powerProgression={currentPowerProgression ?? undefined}
          conflictResult={conflictResult ?? undefined}
          onContinue={handleContinue}
        />
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-gray-950 pb-24 sm:pb-0">
      {/* Top Nav */}
      <header className="bg-gray-950/90 border-b border-white/10 sticky top-0 z-50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-lg text-white">Story Forge</h1>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => router.push('/profile')}
              className="hidden sm:flex text-white/70 hover:text-white hover:bg-white/10"
            >
              <User className="h-4 w-4 mr-1" />
              Profile
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => router.push('/game/npcs')}
              className="hidden sm:flex text-white/70 hover:text-white hover:bg-white/10"
            >
              <Users className="h-4 w-4 mr-1" />
              Contacts
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => router.push('/help')}
              className="hidden sm:flex text-white/70 hover:text-white hover:bg-white/10"
            >
              <HelpCircle className="h-4 w-4 mr-1" />
              Help
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => signOut({ callbackUrl: '/' })}
              className="text-white/70 hover:text-white hover:bg-white/10"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline ml-1">Logout</span>
            </Button>

            {/* Mobile menu button */}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="sm:hidden text-white/70 hover:text-white hover:bg-white/10"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile dropdown menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden bg-gray-900/95 border-b border-white/10 p-3 space-y-2 backdrop-blur-md">
          <Button
            variant="ghost"
            className="w-full justify-start text-white/70 hover:text-white hover:bg-white/10"
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
            className="w-full justify-start text-white/70 hover:text-white hover:bg-white/10"
            onClick={() => {
              router.push('/game/npcs');
              setMobileMenuOpen(false);
            }}
          >
            <Users className="h-4 w-4 mr-2" />
            Contacts
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start text-white/70 hover:text-white hover:bg-white/10"
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
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 relative z-10">
          <div className="p-3 rounded-md bg-red-900/80 text-red-200 border border-red-700/50 text-sm">
            {error}
          </div>
        </div>
      )}

      {/* Main Content */}
      <main
        className="game-backdrop max-w-full min-h-screen"
        style={{
          backgroundImage: `url(${getLocationBackground(character.currentDistrict)})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',
        }}
      >
        <div className="max-w-7xl mx-auto">
        {/* MOBILE LAYOUT (< sm) */}
        <div className="sm:hidden">
          <div className="px-4 py-4 max-w-lg mx-auto">
            {mobileTab === 'scene' && renderSceneContent()}

            {mobileTab === 'actions' && (
              <ActionSelector
                playerLevel={character.level}
                playerAttributes={character.attributes}
                playerPowers={character.powers.map((p) => p.powerId)}
                playerEnergy={character.currentEnergy}
                cooldowns={character.cooldowns}
                onSelectAction={handleSelectAction}
                onSelectFollowUp={handleSelectFollowUp}
                followUps={character.followUps}
                disabled={gameState !== 'idle'}
                activeGoals={activeGoals}
                currentDistrict={character.currentDistrict}
                onDistrictChange={handleDistrictChange}
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
                  <div className="panel-glass p-3">
                    <h3 className="text-sm font-semibold text-white/80 mb-2 flex items-center gap-1">
                      <span className="text-yellow-400">★</span> Goals
                    </h3>
                    <div className="space-y-2">
                      {activeGoals.slice(0, 2).map((goal) => (
                        <div key={goal.id} className="text-xs">
                          <div className="flex justify-between text-white/80">
                            <span className="truncate flex-1">{goal.title}</span>
                            <span className="text-white/50 ml-2">
                              {goal.currentProgress}/{goal.targetValue}
                            </span>
                          </div>
                          <div className="h-1 bg-white/10 rounded-full mt-1 overflow-hidden">
                            <div
                              className="h-full bg-blue-400 rounded-full"
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
                <div className="panel-glass p-3">
                  <h3 className="text-sm font-semibold text-white/80 mb-3">Recent Events</h3>
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
              <div className="panel-glass p-4">
                <h3 className="text-sm font-semibold text-white/80 mb-3">Story Log</h3>
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
                onSelectFollowUp={handleSelectFollowUp}
                followUps={character.followUps}
                disabled={gameState !== 'idle'}
                activeGoals={activeGoals}
                currentDistrict={character.currentDistrict}
                onDistrictChange={handleDistrictChange}
              />
            </aside>
          </div>
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
          <div className="bg-linear-to-br from-yellow-50 to-amber-50 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl border-2 border-yellow-300">
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
