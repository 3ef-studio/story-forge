import { NextResponse } from 'next/server';
import { auth } from '@/app/lib/auth';
import { prisma } from '@/app/lib/db';
import { getActionById, applyActionEffects, getCooldownExpiry, rollForEncounter, selectEncounterType, getEncounterDifficulty } from '@/app/data/actions';
import { calculateReputationImpact, getFactionById } from '@/app/data/factions';
import { getAvailableEncounters, selectRandomEncounter, type EncounterTemplate } from '@/app/data/encounter-templates';
import { findCachedSeed, cacheSeed, getCachedEncounterById } from '@/app/lib/ai/encounter-cache';
import { generateSeed, buildSeedInput } from '@/app/lib/ai/encounter-seed-generator';
import { personalizeSeed, toEncounterTemplate as personalizedToTemplate } from '@/app/lib/ai/encounter-personalizer';
import { buildCharacterContext } from '@/app/lib/ai/context-builder';
import type { EncounterSeed } from '@/app/lib/ai/types';
import { applyGoalProgressOnAction, checkAndCompleteGoals, getActiveGoals } from '@/app/lib/game-logic/goal-manager';

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
    const { actionId } = body;

    const action = getActionById(actionId);
    if (!action) {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    }

    // Get character with all data
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

    // Check cooldown
    const existingCooldown = character.actionCooldowns.find(
      (cd) => cd.actionId === actionId && cd.expiresAt > new Date()
    );
    if (existingCooldown) {
      return NextResponse.json(
        { error: 'Action is on cooldown' },
        { status: 400 }
      );
    }

    // Build attribute map
    const attributesMap: Record<string, number> = {};
    character.attributes.forEach((attr) => {
      attributesMap[attr.attributeId] = attr.currentValue;
    });

    // Build powers list
    const powersList = character.powers.map((p) => p.powerId);

    // Check energy (handle rest action which restores energy)
    const energyCost = action.energyCost;
    if (energyCost > 0 && character.currentEnergy < energyCost) {
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

    // Apply action effects
    const effects = applyActionEffects(action, {}, attributesMap);

    // Build faction reputation map
    const factionReputations: Record<string, number> = {};
    character.factionReputations.forEach((rep) => {
      factionReputations[rep.factionId] = rep.reputation;
    });

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
      const location = action.locationTypes[0];

      // Build seed input for cache lookup
      const seedInput = buildSeedInput(
        actionId,
        action.category,
        encounterType,
        difficulty,
        location,
        involvedFactions
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
    }

    // Calculate new energy (handle rest which restores energy)
    const newEnergy = Math.max(0, Math.min(character.maxEnergy, character.currentEnergy - energyCost));

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

    // Update character in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update character stats including XP
      await tx.character.update({
        where: { id: character.id },
        data: {
          currentEnergy: newEnergy,
          currentHp: newHp,
          currentXp: newXp,
          level: newLevel,
          maxHp: leveledUp ? character.maxHp + 10 : character.maxHp,
          maxEnergy: leveledUp ? character.maxEnergy + 5 : character.maxEnergy,
          money: character.money + action.baseMoneyReward,
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
      if (!encounter) {
        await tx.storyEvent.create({
          data: {
            characterId: character.id,
            eventType: 'action',
            summary: `Performed ${action.name}`,
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
      };
    });

    // Apply goal progress for action execution
    await applyGoalProgressOnAction(character.id, action);

    // Check if any goals completed
    const { completedGoals, xpAwarded: goalXp } = await checkAndCompleteGoals(character.id);

    // Get updated active goals
    const activeGoals = await getActiveGoals(character.id);

    return NextResponse.json({
      success: true,
      ...result,
      goals: {
        active: activeGoals,
        completed: completedGoals,
        xpAwarded: goalXp,
      },
    });
  } catch (error) {
    console.error('Action execution error:', error);
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}
