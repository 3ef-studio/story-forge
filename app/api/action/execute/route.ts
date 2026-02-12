import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { auth } from '@/app/lib/auth';
import { prisma } from '@/app/lib/db';
import { getActionById, applyActionEffects, getCooldownExpiry, rollForEncounter, selectEncounterType, getEncounterDifficulty, normalizeActionId, type Action } from '@/app/data/actions';
import { calculateReputationImpact, getFactionById } from '@/app/data/factions';
import { getAvailableEncounters, selectRandomEncounter, type EncounterTemplate } from '@/app/data/encounter-templates';
import { findCachedSeed, cacheSeed } from '@/app/lib/ai/encounter-cache';
import { generateSeed, buildSeedInput } from '@/app/lib/ai/encounter-seed-generator';
import { personalizeSeed, toEncounterTemplate as personalizedToTemplate } from '@/app/lib/ai/encounter-personalizer';
import { buildCharacterContext } from '@/app/lib/ai/context-builder';
import type { EncounterSeed } from '@/app/lib/ai/types';
import { applyGoalProgressOnAction, checkAndCompleteGoals, getActiveGoals } from '@/app/lib/game-logic/goal-manager';
import { buildAttributeMap, buildFactionMap } from '@/app/lib/utils/character-utils';
import { computeEnergyRegen } from '@/app/lib/game-logic/energy-regen';
import { buildFactionStateSummary } from '@/app/lib/world/faction-state';
import { shouldEmitCityUpdate, generateCityUpdate, type CityUpdate } from '@/app/lib/world/city-updates';
import {
  incrementThreadAging,
  getActiveThread,
  threadTriggered,
  buildThreadInjection,
} from '@/app/lib/game-logic/thread-manager';
import {
  selectNPCForEncounter,
  buildNPCInjection,
  recordSocialInteraction,
} from '@/app/lib/game-logic/npc-manager';
import {
  districtToLocationType,
  isActionAvailableInDistrict,
  isActionGlobal,
  getDistrictById,
} from '@/app/data/districts';
import { generateRivalForCharacter } from '@/app/lib/game-logic/rival-generator';
import { RIVAL_FLAVOR, type RivalIntensity } from '@/app/data/rivals';
import { applyDecay, type LeverageState } from '@/app/lib/game-logic/leverage';
import {
  isFollowUpActionId,
  parsePendingFollowUps,
  parseFollowUpHistory,
  addHistoryEntries,
  buildEphemeralActionFromFollowUp,
  type FollowUpAction,
} from '@/app/lib/game-logic/follow-up-actions';

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const rawActionId = body.actionId as string;

    // Get character with all data first (needed for follow-up lookups)
    const character = await prisma.character.findUnique({
      where: { userId: session.user.id },
      include: {
        attributes: true,
        powers: true,
        factionReputations: true,
        actionCooldowns: true,
      },
    });

    if (!character) {
      return NextResponse.json(
        { error: 'Character not found' },
        { status: 404 }
      );
    }

    // Handle follow-up action IDs (fup_*) or regular action IDs
    let action: Action | null = null;
    let isFollowUp = false;
    let usedFollowUpId: string | null = null;
    let actionId: string;

    // Pre-compute follow-up removal data for atomic persistence inside transaction
    let remainingFollowUps: FollowUpAction[] | null = null;
    let updatedFollowUpHistory: ReturnType<typeof parseFollowUpHistory> | null = null;

    if (isFollowUpActionId(rawActionId)) {
      // Load follow-up from character's pendingFollowUps
      const pendingFollowUps = parsePendingFollowUps(character.pendingFollowUps);
      const followUp = pendingFollowUps.find(f => f.id === rawActionId);

      if (!followUp) {
        return NextResponse.json(
          { error: 'Follow-up action not found or expired' },
          { status: 400 }
        );
      }

      // Build ephemeral action from follow-up
      action = buildEphemeralActionFromFollowUp(followUp);
      isFollowUp = true;
      usedFollowUpId = rawActionId;
      actionId = followUp.origin.actionId ?? 'followup';

      // Pre-compute the remaining follow-ups and updated history for atomic persistence
      remainingFollowUps = pendingFollowUps.filter(f => f.id !== usedFollowUpId);
      updatedFollowUpHistory = parseFollowUpHistory(character.followUpHistory);
      if (followUp.followUpKey) {
        updatedFollowUpHistory = addHistoryEntries(updatedFollowUpHistory, [{
          followUpKey: followUp.followUpKey,
          actionCounter: character.actionCounter ?? 0,
          status: 'executed',
        }]);
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('[Execute] Follow-up action:', followUp.name, '| Base action:', actionId);
      }
    } else {
      // Standard action lookup
      actionId = normalizeActionId(rawActionId);
      action = getActionById(actionId) ?? null;
    }

    if (!action) {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    }

    // Age any active consequence thread (once per action)
    await incrementThreadAging(character.id);

    // Check cooldown (normalize stored IDs for legacy compatibility)
    const existingCooldown = character.actionCooldowns.find(
      (cd) => normalizeActionId(cd.actionId) === actionId && cd.expiresAt > new Date()
    );
    if (existingCooldown) {
      return NextResponse.json(
        { error: 'Action is on cooldown' },
        { status: 400 }
      );
    }

    // Build attribute map using utility
    const attributesMap = buildAttributeMap(character.attributes);

    // Build powers list
    const powersList = character.powers.map((p) => p.powerId);

    // Apply lazy energy regeneration (catch-up ticks)
    const regenResult = computeEnergyRegen({
      currentEnergy: character.currentEnergy,
      maxEnergy: character.maxEnergy,
      lastEnergyRegenAt: character.lastEnergyRegenAt,
    });

    let currentEnergy = regenResult.newEnergy;
    if (regenResult.changed) {
      await prisma.character.update({
        where: { id: character.id },
        data: {
          currentEnergy: regenResult.newEnergy,
          lastEnergyRegenAt: regenResult.newLastEnergyRegenAt,
        },
      });
    }

    // Check energy (handle rest action which restores energy)
    let energyCost = action.energyCost;
    if (!energyCost && energyCost !== 0) {
      console.warn(`[execute] action "${action.id}" has no energyCost, defaulting to 6`);
      energyCost = 6;
    }
    if (energyCost > 0 && currentEnergy < energyCost) {
      return NextResponse.json(
        { error: 'Not enough energy' },
        { status: 400 }
      );
    }

    // Check level requirement
    if (action.minLevel && character.level < action.minLevel) {
      return NextResponse.json(
        { error: 'Level too low' },
        { status: 400 }
      );
    }

    // Check attribute requirements
    if (action.requiredAttributes) {
      const unmet = action.requiredAttributes.find(
        (req) => (attributesMap[req.attributeId] || 0) < req.minValue
      );
      if (unmet) {
        return NextResponse.json(
          { error: `Requires ${unmet.attributeId} ${unmet.minValue}` },
          { status: 400 }
        );
      }
    }

    // Check power requirements
    if (action.requiredPowers?.length) {
      const hasPower = action.requiredPowers.some((p) => powersList.includes(p));
      if (!hasPower) {
        return NextResponse.json(
          { error: 'Missing required power' },
          { status: 400 }
        );
      }
    }

    // Check district compatibility
    const currentDistrict = character.currentDistrict ?? 'downtown';
    if (
      !isActionGlobal(action.id, action.category) &&
      !isActionAvailableInDistrict(action.locationTypes, currentDistrict)
    ) {
      const district = getDistrictById(currentDistrict);
      return NextResponse.json(
        { error: `This action is not available in ${district?.name ?? 'this district'}. Try changing your district.` },
        { status: 400 }
      );
    }

    // Apply action effects
    const effects = applyActionEffects(action, {}, attributesMap);

    // Build faction reputation map using utility
    const factionReputations = buildFactionMap(character.factionReputations);

    // Calculate cascading reputation changes
    const allReputationChanges: Record<string, number> = {};
    for (const [factionId, change] of Object.entries(effects.reputationChanges)) {
      const faction = getFactionById(factionId);
      if (faction) {
        const cascadeChanges = calculateReputationImpact(faction, change, factionReputations);
        for (const [cascadeFactionId, cascadeChange] of Object.entries(cascadeChanges)) {
          allReputationChanges[cascadeFactionId] = (allReputationChanges[cascadeFactionId] || 0) + cascadeChange;
        }
      }
    }

    // Check for encounter
    const encounterTriggered = rollForEncounter(action);
    let encounter: EncounterTemplate | null = null;
    let isCachedEncounter = false;
    let cachedEncounterId: string | null = null;

    if (encounterTriggered) {
      const encounterType = selectEncounterType(action);
      const difficulty = getEncounterDifficulty(action);
      const involvedFactions = action.likelyFactions;
      const location = districtToLocationType(currentDistrict);

      // Build seed input for cache lookup
      const seedInput = buildSeedInput(
        actionId,
        action.category,
        encounterType,
        difficulty,
        location,
        involvedFactions,
        action.moralIntent ?? 'neutral'
      );

      let seed: EncounterSeed | null = null;

      // 1. Try seed cache first (deterministic key lookup)
      seed = await findCachedSeed(seedInput);

      if (seed) {
        console.log('[Encounter] SEED CACHE HIT:', seed.seedId);
        cachedEncounterId = seed.seedId;
        isCachedEncounter = true;
      }

      // 2. Generate seed with AI if no cache hit
      if (!seed) {
        console.log('[Encounter] SEED CACHE MISS - Generating with AI...');
        seed = await generateSeed(seedInput);

        if (seed) {
          // Cache the successful seed generation
          cachedEncounterId = await cacheSeed(seed, seedInput);
          if (cachedEncounterId) {
            seed.seedId = cachedEncounterId;
            isCachedEncounter = true;
            console.log('[Encounter] Seed generated and cached:', cachedEncounterId);
          }
        }
      }

      // 3. Personalize seed if we have one
      if (seed) {
        try {
          // Build character context for personalization
          const characterContext = await buildCharacterContext(character);

          // Personalize the seed (deterministic, no AI call)
          const personalized = personalizeSeed({
            seed,
            characterName: characterContext.name,
            originName: characterContext.origin.name,
            powerNames: characterContext.powers.map(p => p.name),
            reputationTiers: characterContext.factionStandings.map(fs => ({
              factionId: fs.factionId,
              tier: fs.reputation <= -50 ? 'hostile' as const :
                    fs.reputation <= -20 ? 'unfriendly' as const :
                    fs.reputation >= 50 ? 'allied' as const :
                    fs.reputation >= 20 ? 'friendly' as const : 'neutral' as const,
            })),
            recentEncounterTags: characterContext.previousEncounters
              .slice(0, 3)
              .flatMap(e => e.factionsInvolved),
            moralIntent: action.moralIntent ?? 'neutral',
          });

          // Convert to EncounterTemplate for API compatibility
          encounter = personalizedToTemplate(personalized, seed.seedId);
          console.log('[Encounter] Personalized encounter ready:', encounter.name);
        } catch (personalizeError) {
          console.error('[Encounter] Personalization failed, using seed directly:', personalizeError);
          // Fallback: use seed with minimal personalization
          encounter = {
            id: seed.seedId,
            name: seed.title,
            category: seed.category,
            difficulty: seed.difficulty,
            description: seed.situationSummary,
            choices: seed.choices.map(c => ({
              id: c.id,
              text: c.genericLabel,
              requiredPowers: c.requiredPowers,
              requiredAttributes: c.requiredAttributes,
              narrativeDescription: c.genericLabel,
            })),
            outcomes: seed.outcomes,
            narrativeTags: seed.tags,
            canBeReused: true,
            timesUsed: 0,
          };
        }
      }

      // 4. Fallback to static templates if seed generation failed
      if (!encounter) {
        console.log('[Encounter] Falling back to static templates...');
        const availableEncounters = getAvailableEncounters(
          encounterType,
          difficulty,
          character.level,
          attributesMap.reputation || 0,
          attributesMap.notoriety || 0,
          involvedFactions,
          location
        );
        encounter = selectRandomEncounter(availableEncounters);
        isCachedEncounter = false;
      }

      // 5. Check for consequence thread injection
      if (encounter) {
        const activeThread = await getActiveThread(character.id);
        if (activeThread) {
          const actionContext = {
            actionId,
            locationTypes: action.locationTypes,
            involvedFactions: involvedFactions,
          };

          if (threadTriggered(activeThread, actionContext)) {
            const injection = buildThreadInjection(activeThread);

            // Inject complication into encounter
            encounter = {
              ...encounter,
              description: `${encounter.description}\n\n${injection.injectionText}`,
              difficulty: Math.min(10, encounter.difficulty + injection.difficultyMod),
              narrativeTags: [...(encounter.narrativeTags || []), ...injection.tagsToAdd],
              // Add thread metadata for resolve route
              threadId: activeThread.id,
              threadTitle: activeThread.title,
            } as EncounterTemplate & { threadId: string; threadTitle: string };

            console.log('[Encounter] Thread injected:', activeThread.title);
          }
        }
      }

      // 6. Select and inject NPC if appropriate
      if (encounter) {
        const npc = await selectNPCForEncounter(character.id, {
          factionIds: involvedFactions,
          locationTags: action.locationTypes,
        });

        if (npc) {
          const npcInjection = await buildNPCInjection(character.id, npc);

          encounter = {
            ...encounter,
            description: `${encounter.description}\n\n${npcInjection.injectionText}`,
            npcId: npcInjection.npcId,
          } as EncounterTemplate & { npcId: string; threadId?: string; threadTitle?: string };

          console.log('[Encounter] NPC injected:', npc.name);
        }
      }
    }

    // 7. Rival encounter injection (small chance)
    let rivalPresence: {
      rivalId: string;
      name: string;
      role: string;
      personality: string;
      intensity: RivalIntensity;
      flavorText: string;
      level: number;
      hostility: number;
    } | null = null;

    if (encounter) {
      const rival = await prisma.rival.findUnique({
        where: { characterId: character.id },
      });

      if (rival) {
        const rivalRoll = Math.random();
        // 8% chance of rival appearance, weighted by hostility
        const rivalChance = 0.15 + (rival.hostility / 100) * 0.05;
        if (rivalRoll < rivalChance) {
          // Determine intensity based on hostility
          let intensity: RivalIntensity = 'watching';
          if (rival.hostility >= 70) {
            intensity = 'direct';
          } else if (rival.hostility >= 40) {
            intensity = 'agents';
          }

          // Pick flavor text deterministically from templates
          const templates = RIVAL_FLAVOR[intensity];
          const templateIndex = Math.floor(Math.random() * templates.length);
          const flavorText = templates[templateIndex].replace('{name}', rival.name);

          rivalPresence = {
            rivalId: rival.id,
            name: rival.name,
            role: rival.role,
            personality: rival.personality,
            intensity,
            flavorText,
            level: rival.level,
            hostility: rival.hostility,
          };

          // Inject flavor text into encounter description
          encounter = {
            ...encounter,
            description: `${encounter.description}\n\n${flavorText}`,
            narrativeTags: [...(encounter.narrativeTags || []), 'rival_presence'],
          } as typeof encounter;

          console.log('[Encounter] Rival injected:', rival.name, intensity);
        }
      }
    }

    // Calculate new energy (handle rest which restores energy)
    const newEnergy = Math.max(0, Math.min(character.maxEnergy, currentEnergy - energyCost));

    // Calculate HP restoration if action has hpRestore
    const hpRestored = action.hpRestore ?? 0;
    const newHp = Math.min(character.maxHp, character.currentHp + hpRestored);

    // Calculate XP and check for level up
    const xpGained = action.baseXPReward;
    let newXp = character.currentXp + xpGained;
    let newLevel = character.level;
    const xpToLevel = character.level * 100;
    let leveledUp = false;

    if (newXp >= xpToLevel) {
      newXp -= xpToLevel;
      newLevel++;
      leveledUp = true;
    }

    // Compute leverage decay for non-encounter actions (encounter actions decay in resolve)
    const currentLeverage: LeverageState = {
      control: character.leverageControl,
      stability: character.leverageStability,
      position: character.leveragePosition,
    };
    const newActionCounter = encounter ? character.actionCounter : character.actionCounter + 1;
    const decayResult = encounter ? { leverage: currentLeverage, decayed: false } : applyDecay(currentLeverage, newActionCounter);
    if (!encounter && process.env.NODE_ENV === 'development') {
      console.log(
        `[Leverage Execute] char=${character.id} | ` +
        `counter=${character.actionCounter}→${newActionCounter} | ` +
        `db={c:${currentLeverage.control},s:${currentLeverage.stability},p:${currentLeverage.position}} | ` +
        `decay=${decayResult.decayed ? `yes(-1 ${decayResult.decayedType})` : 'no'} | ` +
        `final={c:${decayResult.leverage.control},s:${decayResult.leverage.stability},p:${decayResult.leverage.position}}`
      );
    }

    // Update character in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update character stats including XP
      // NOTE: Follow-up removal is done atomically here (not post-transaction) to prevent
      // race conditions where a server crash could leave stale follow-ups or duplicate history entries
      await tx.character.update({
        where: { id: character.id },
        data: {
          currentEnergy: leveledUp ? character.maxEnergy + 5 : newEnergy,
          currentHp: newHp,
          currentXp: newXp,
          level: newLevel,
          maxHp: leveledUp ? character.maxHp + 10 : character.maxHp,
          maxEnergy: leveledUp ? character.maxEnergy + 5 : character.maxEnergy,
          // Reset regen timer on level-up (full energy restore)
          ...(leveledUp ? { lastEnergyRegenAt: new Date() } : {}),
          money: character.money + action.baseMoneyReward,
          pendingLevelUpAttributePick: leveledUp ? true : undefined,
          // Increment action counter + apply decay (only for non-encounter actions)
          ...(!encounter ? {
            actionCounter: newActionCounter,
            leverageControl: decayResult.leverage.control,
            leverageStability: decayResult.leverage.stability,
            leveragePosition: decayResult.leverage.position,
          } : {}),
          // Atomic follow-up removal: persist updated follow-ups and history in same transaction
          ...(isFollowUp && remainingFollowUps !== null ? {
            pendingFollowUps: remainingFollowUps.length > 0 ? JSON.parse(JSON.stringify(remainingFollowUps)) : Prisma.DbNull,
            followUpHistory: updatedFollowUpHistory ? JSON.parse(JSON.stringify(updatedFollowUpHistory)) : undefined,
          } : {}),
        },
      });

      // Update attributes
      for (const [attrId, growth] of Object.entries(effects.attributeGrowth)) {
        await tx.characterAttribute.updateMany({
          where: {
            characterId: character.id,
            attributeId: attrId,
          },
          data: {
            currentValue: {
              increment: growth,
            },
          },
        });
      }

      // Update faction reputations
      for (const [factionId, change] of Object.entries(allReputationChanges)) {
        await tx.factionReputation.updateMany({
          where: {
            characterId: character.id,
            factionId,
          },
          data: {
            reputation: {
              increment: change,
            },
          },
        });
      }

      // Set cooldown if applicable
      const cooldownExpiry = getCooldownExpiry(action, new Date());
      if (cooldownExpiry) {
        await tx.actionCooldown.upsert({
          where: {
            characterId_actionId: {
              characterId: character.id,
              actionId,
            },
          },
          create: {
            characterId: character.id,
            actionId,
            expiresAt: cooldownExpiry,
          },
          update: {
            expiresAt: cooldownExpiry,
          },
        });
      }

      // Create story event if no encounter (encounters create their own events)
      // For social actions without encounters, also select an NPC to interact with
      let socialNpcInteraction: {
        npcId: string;
        npcName: string;
        npcRole: string;
        dispositionChange: number;
        dispositionLabel: string;
      } | null = null;

      if (!encounter) {
        let storySummary = `Performed ${action.name}`;

        // Social actions should still interact with an NPC even without an encounter
        if (action.category === 'social') {
          const socialNpc = await selectNPCForEncounter(character.id, {
            factionIds: action.likelyFactions,
            locationTags: action.locationTypes,
          });

          if (socialNpc) {
            const factionChanges = Object.entries(allReputationChanges).map(
              ([factionId, change]) => ({ factionId, change })
            );
            socialNpcInteraction = await recordSocialInteraction(
              character.id,
              socialNpc.id,
              factionChanges,
              tx
            );
            storySummary = `Networked with ${socialNpc.name}`;
          }
        }

        await tx.storyEvent.create({
          data: {
            characterId: character.id,
            eventType: 'action',
            summary: storySummary,
            narrativeWeight: 3,
            tags: [action.category, actionId],
          },
        });
      }

      // Create level up event if applicable
      if (leveledUp) {
        await tx.storyEvent.create({
          data: {
            characterId: character.id,
            eventType: 'level_up',
            summary: `Reached Level ${newLevel}!`,
            narrativeWeight: 8,
            tags: ['level_up', 'milestone'],
          },
        });

        // Create rival at level 5 if one doesn't exist
        if (newLevel >= 5) {
          const existingRival = await tx.rival.findUnique({
            where: { characterId: character.id },
          });

          if (!existingRival) {
            const factionReputations = buildFactionMap(character.factionReputations);
            const rivalInput = generateRivalForCharacter({
              characterId: character.id,
              characterLevel: newLevel,
              attributes: attributesMap,
              powers: character.powers.map((p) => ({
                powerId: p.powerId,
                currentLevel: p.currentLevel,
                currentXp: p.currentXp,
                timesUsed: p.timesUsed,
              })),
              factionReputations,
            });

            await tx.rival.create({
              data: {
                characterId: rivalInput.characterId,
                name: rivalInput.name,
                role: rivalInput.role,
                personality: rivalInput.personality,
                level: rivalInput.level,
                attributes: rivalInput.attributes,
                powers: JSON.parse(JSON.stringify(rivalInput.powers)),
                hostility: rivalInput.hostility,
                notoriety: rivalInput.notoriety,
              },
            });

            await tx.storyEvent.create({
              data: {
                characterId: character.id,
                eventType: 'rival_emerged',
                summary: `A new presence emerges: ${rivalInput.name}`,
                fullDescription: `As your reputation grows, a ${rivalInput.role === 'hero' ? 'heroic figure' : 'dangerous villain'} known as ${rivalInput.name} has taken notice. Their ${rivalInput.personality} nature makes them a formidable adversary.`,
                narrativeWeight: 9,
                tags: ['rival', 'milestone', rivalInput.role],
              },
            });
          }
        }
      }

      return {
        energySpent: energyCost,
        newEnergy,
        newHp,
        hpRestored,
        xpGained,
        newXp,
        leveledUp,
        newLevel: leveledUp ? newLevel : undefined,
        reputationChanges: allReputationChanges,
        attributeGrowth: effects.attributeGrowth,
        moneyGained: action.baseMoneyReward,
        encounterTriggered: !!encounter,
        encounter,
        isCachedEncounter,
        npcInteraction: socialNpcInteraction,
        rivalPresence,
      };
    });

    // Apply goal progress for action execution
    await applyGoalProgressOnAction(character.id, action);

    // Check if any goals completed
    const { completedGoals, xpAwarded: goalXp } = await checkAndCompleteGoals(character.id);

    // Get updated active goals
    const activeGoals = await getActiveGoals(character.id);

    // Follow-up removal is now done atomically inside the transaction above
    if (isFollowUp && usedFollowUpId && process.env.NODE_ENV === 'development') {
      console.log('[Execute] Follow-up consumed (atomic):', usedFollowUpId, '| Remaining:', remainingFollowUps?.length ?? 0);
    }

    // City Update Logic: Check if we should emit a city update
    let cityUpdate: CityUpdate | null = null;

    // Count total action events to determine action count
    const actionEventCount = await prisma.storyEvent.count({
      where: {
        characterId: character.id,
        eventType: { in: ['action', 'encounter'] },
      },
    });

    if (shouldEmitCityUpdate(actionEventCount)) {
      // Get updated faction reputations for city update
      const updatedFactionReps = await prisma.factionReputation.findMany({
        where: { characterId: character.id },
      });
      const updatedRepByFaction: Record<string, number> = {};
      for (const fr of updatedFactionReps) {
        updatedRepByFaction[fr.factionId] = fr.reputation;
      }

      // Build faction state summary
      const factionStateLines = buildFactionStateSummary(updatedRepByFaction, {
        topN: 3,
        includeFactions: action.likelyFactions,
      });

      // Generate city update — use district name for location context
      const districtInfo = getDistrictById(currentDistrict);
      cityUpdate = generateCityUpdate({
        actionId,
        location: districtInfo?.name ?? action.locationTypes?.[0],
        factionStateLines,
      });

      // Save as story event
      await prisma.storyEvent.create({
        data: {
          characterId: character.id,
          eventType: 'city_update',
          summary: cityUpdate.title,
          fullDescription: cityUpdate.body,
          narrativeWeight: 2,
          tags: ['city_update', 'world_texture'],
        },
      });
    }

    return NextResponse.json({
      success: true,
      ...result,
      // Action ID tracking for Heat system in resolve
      sourceActionId: rawActionId,  // Original action ID from client (may be fup_...)
      baseActionId: actionId,       // Normalized base action ID
      isFollowUp,                   // Whether this was a follow-up action
      goals: {
        active: activeGoals,
        completed: completedGoals,
        xpAwarded: goalXp,
      },
      cityUpdate,
    });
  } catch (error) {
    console.error('Action execution error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Action execution failed', details: message },
      { status: 500 }
    );
  }
}
