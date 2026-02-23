'use client';

import { useState } from 'react';
import { Badge } from '@/app/components/ui/badge';
import type { EncounterTemplate } from '@/app/data/encounter-templates';
import { getPowerById } from '@/app/data/powers';
import { AlertTriangle, CheckCircle, XCircle, Star, Zap, LogOut, Link, Eye, Sword, Shield } from 'lucide-react';
import { ChoicePreviewChips } from './ChoicePreviewChips';
import { PrepPhase, PREP_OPTIONS, deriveLeverageTypeFromPower, type LeverageType } from './PrepPhase';
import type { ResolutionPreview, PrepSelection } from '@/app/lib/game-logic/combat/types';
import { AnimatedCard } from '@/app/components/ui/AnimatedCard';
import { AnimatedChoiceCard } from '@/app/components/ui/AnimatedChoiceCard';
import { LoadingSigil } from '@/app/components/ui/LoadingSigil';
import { type ConsumableItem, CONSUMABLE_DEFINITIONS, MAX_CONSUMABLES } from '@/app/lib/game-logic/consumables';

interface EncounterChoice {
  id: string;
  text: string;
  available: boolean;
  reason?: string;
  requiredPowers?: string[];
  preview?: ResolutionPreview;
}

type EncounterWithThread = EncounterTemplate & {
  threadId?: string;
  threadTitle?: string;
};

interface CharacterPower {
  powerId: string;
  level: number;
}

type FocusMode = 'power' | 'awareness' | 'aggression' | 'defense';

interface FocusResultDisplay {
  mode: FocusMode | null;
  modifier: number;
}

const FOCUS_DISPLAY: Record<FocusMode, { label: string; icon: typeof Zap; color: string }> = {
  power: { label: 'Power', icon: Zap, color: 'text-purple-400' },
  awareness: { label: 'Awareness', icon: Eye, color: 'text-blue-400' },
  aggression: { label: 'Aggression', icon: Sword, color: 'text-red-400' },
  defense: { label: 'Defense', icon: Shield, color: 'text-green-400' },
};

// Focus mode → leverage type mapping
const FOCUS_LEVERAGE_MAP: Record<FocusMode, LeverageType> = {
  power: 'control',
  awareness: 'position',
  aggression: 'control',
  defense: 'stability',
};

interface EncounterDisplayProps {
  encounter: EncounterWithThread;
  choices: EncounterChoice[];
  onSelectChoice: (choiceId: string, prepSelection: PrepSelection | null) => void;
  isResolving?: boolean;
  characterEnergy?: number;
  characterPowers?: CharacterPower[];
  focusResult?: FocusResultDisplay;
  consumables?: ConsumableItem[];
  selectedConsumableId?: string | null;
  onSelectConsumable?: (id: string | null) => void;
}

/** Format leverage type for display */
function formatLeverageType(type: LeverageType): string {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

/**
 * Compute leverage hint text based on prep selection and focus result.
 * Returns a string like "Prep: +1 Stability" or "Prep: +1 Control, Focus: +1 Position"
 */
function computeLeverageHint(
  prepSelection: PrepSelection | null,
  focusResult: FocusResultDisplay | undefined
): string | undefined {
  const hints: string[] = [];

  // Prep leverage
  if (prepSelection) {
    let leverageType: LeverageType | null = null;

    if (prepSelection.type === 'momentum') {
      leverageType = PREP_OPTIONS.momentum.leverageType;
    } else if (prepSelection.type === 'intel') {
      leverageType = PREP_OPTIONS.intel.leverageType;
    } else if (prepSelection.type === 'power') {
      const power = getPowerById(prepSelection.powerId);
      if (power) {
        leverageType = deriveLeverageTypeFromPower(power);
      }
    }

    if (leverageType) {
      hints.push(`Prep: +1 ${formatLeverageType(leverageType)}`);
    }
  }

  // Focus leverage (only if modifier > 0)
  if (focusResult?.mode && focusResult.modifier > 0) {
    const focusLeverageType = FOCUS_LEVERAGE_MAP[focusResult.mode];
    hints.push(`Focus: +1 ${formatLeverageType(focusLeverageType)}`);
  }

  return hints.length > 0 ? hints.join(', ') : undefined;
}

export function EncounterDisplay({
  encounter,
  choices,
  onSelectChoice,
  isResolving = false,
  characterEnergy = 100,
  characterPowers = [],
  focusResult,
  consumables = [],
  selectedConsumableId = null,
  onSelectConsumable,
}: EncounterDisplayProps) {
  const [prepSelection, setPrepSelection] = useState<PrepSelection | null>(null);

  // Find the selected consumable for display
  const selectedConsumable = consumables.find(c => c.id === selectedConsumableId);

  const handleChoiceClick = (choiceId: string) => {
    onSelectChoice(choiceId, prepSelection);
  };

  // Compute leverage hint for choice chips
  const leverageHint = computeLeverageHint(prepSelection, focusResult);

  return (
    <AnimatedCard variant="panel" className="panel-glass border border-blue-500/30 rounded-2xl">
      <div className="pb-2 px-4 sm:px-6 pt-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-xl sm:text-lg font-bold text-white">{encounter.name}</h3>
          <div className="flex items-center gap-2">
            {encounter.threadTitle && (
              <Badge variant="suspicious" className="flex items-center gap-1">
                <Link className="h-3 w-3" />
                {encounter.threadTitle}
              </Badge>
            )}
            <Badge variant="outline" className="flex items-center gap-1 border-white/20 text-white/70">
              <Star className="h-3 w-3" />
              Difficulty {encounter.difficulty}
            </Badge>
          </div>
        </div>
      </div>
      <div className="space-y-5 px-4 sm:px-6 pb-5">
        {/* Main Description */}
        <div className="bg-white/10 rounded-xl p-4 sm:p-5 border border-white/10">
          <p className="text-base sm:text-lg text-white/90 leading-relaxed max-w-prose">
            {encounter.description}
          </p>
          {encounter.flavorText && (
            <p className="mt-3 text-sm text-white/50 italic border-l-2 border-white/20 pl-3">
              {encounter.flavorText}
            </p>
          )}
        </div>

        {/* Focus Charged indicator */}
        {focusResult && focusResult.mode && focusResult.modifier > 0 && (() => {
          const config = FOCUS_DISPLAY[focusResult.mode];
          const Icon = config.icon;
          const focusLeverageType = FOCUS_LEVERAGE_MAP[focusResult.mode];
          return (
            <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 ${config.color}`}>
              <Icon className="h-4 w-4" />
              <span className="text-sm font-medium">
                Focus Charged: +1 {formatLeverageType(focusLeverageType)} leverage ({config.label})
              </span>
            </div>
          );
        })()}

        {/* Consumables Panel (MVP) */}
        {consumables.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold text-white/70 text-sm uppercase tracking-wide">Items</h4>
            <div className="flex gap-2">
              {consumables.map((item) => {
                const def = CONSUMABLE_DEFINITIONS[item.type];
                const isSelected = item.id === selectedConsumableId;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectConsumable?.(isSelected ? null : item.id)}
                    disabled={isResolving}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-500/50 ring-1 ring-amber-400/30'
                        : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                    } ${isResolving ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <span className="text-lg">{def.icon}</span>
                    <div className="text-left">
                      <div className="text-sm font-medium text-white/90">{def.name}</div>
                      <div className="text-xs text-white/50">{def.description}</div>
                    </div>
                  </button>
                );
              })}
              {/* Empty slots */}
              {Array.from({ length: MAX_CONSUMABLES - consumables.length }).map((_, i) => (
                <div
                  key={`empty-${i}`}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-white/10 opacity-30"
                >
                  <span className="text-lg">-</span>
                  <div className="text-left">
                    <div className="text-sm font-medium text-white/50">Empty</div>
                    <div className="text-xs text-white/30">No item</div>
                  </div>
                </div>
              ))}
            </div>
            {/* Selected consumable confirmation */}
            {selectedConsumable && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <span className="text-sm text-amber-300">
                  Using {CONSUMABLE_DEFINITIONS[selectedConsumable.type].name} on this encounter
                </span>
                <button
                  onClick={() => onSelectConsumable?.(null)}
                  className="ml-auto text-xs text-white/50 hover:text-white/80 underline"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}

        {/* Prep Phase */}
        <PrepPhase
          characterEnergy={characterEnergy}
          characterPowers={characterPowers}
          selection={prepSelection}
          onSelectionChange={setPrepSelection}
          disabled={isResolving}
        />

        {/* Choices */}
        <div className="space-y-3">
          <h4 className="font-semibold text-white/70 text-sm uppercase tracking-wide">What do you do?</h4>
          <div className="grid gap-3">
            {choices.map((choice, index) => (
              <AnimatedChoiceCard
                key={choice.id}
                delay={0.05 * index}
                className={`w-full text-left h-auto py-4 px-4 rounded-xl min-h-14 border transition-colors ${
                  choice.available
                    ? 'bg-white/10 border-white/15 hover:bg-white/15 hover:border-blue-400/40 active:bg-white/20'
                    : 'bg-white/5 border-white/5 opacity-50 cursor-not-allowed'
                }`}
                onClick={() => choice.available && handleChoiceClick(choice.id)}
                disabled={!choice.available || isResolving}
              >
                <div className="flex items-start gap-3 w-full">
                  <div className="mt-0.5">
                    {choice.available ? (
                      <CheckCircle className="h-5 w-5 text-green-400" />
                    ) : (
                      <XCircle className="h-5 w-5 text-white/30" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-white/90">{choice.text}</span>
                      {choice.requiredPowers && choice.requiredPowers.length > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">
                          <Zap className="h-3 w-3" />
                          {choice.requiredPowers
                            .map((powerId) => getPowerById(powerId)?.name || powerId)
                            .join(', ')}
                        </span>
                      )}
                    </div>
                    {/* Preview chips for available choices - no percent, optional leverage hint, gambit consequences */}
                    {choice.available && choice.preview && (
                      <ChoicePreviewChips
                        riskTier={choice.preview.riskTier}
                        hintText={leverageHint}
                        showPercent={false}
                        gambit={choice.preview.gambit}
                      />
                    )}
                    {!choice.available && choice.reason && (
                      <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {choice.reason}
                      </p>
                    )}
                  </div>
                </div>
              </AnimatedChoiceCard>
            ))}
          </div>

          {/* Retreat Option */}
          <div className="pt-3 border-t border-white/10 mt-4">
            <button
              className="w-full text-left h-auto py-3.5 px-4 text-white/60 hover:bg-white/10 hover:text-white/80 rounded-xl min-h-12 transition-colors"
              onClick={() => handleChoiceClick('retreat')}
              disabled={isResolving}
            >
              <div className="flex items-center gap-3 w-full">
                <LogOut className="h-5 w-5 text-white/40" />
                <div>
                  <span className="font-semibold">Retreat</span>
                  <p className="text-xs text-white/40 mt-0.5">
                    Attempt to escape. Success depends on agility and mobility powers.
                  </p>
                </div>
              </div>
            </button>
          </div>
        </div>

        {isResolving && (
          <div className="flex flex-col items-center justify-center py-6 gap-2">
            <LoadingSigil label="Resolving encounter" />
            <span className="text-sm text-white/50">Resolving...</span>
          </div>
        )}
      </div>
    </AnimatedCard>
  );
}
