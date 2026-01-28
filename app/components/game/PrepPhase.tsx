'use client';

import { Zap, Target, Brain, ChevronDown } from 'lucide-react';
import type { PrepSelection } from '@/app/lib/game-logic/combat/types';
import { getPowerById } from '@/app/data/powers';

interface CharacterPower {
  powerId: string;
  level: number;
}

interface PrepPhaseProps {
  characterEnergy: number;
  characterPowers: CharacterPower[];
  selection: PrepSelection | null;
  onSelectionChange: (selection: PrepSelection | null) => void;
  disabled?: boolean;
}

// Prep option definitions
const PREP_OPTIONS = {
  momentum: { energyCost: 2, combatBonus: 10, label: 'Build Momentum', description: 'Focus your energy for a powerful strike' },
  intel: { energyCost: 1, combatBonus: 5, label: 'Gather Intel', description: 'Assess the situation before acting' },
} as const;

export function PrepPhase({
  characterEnergy,
  characterPowers,
  selection,
  onSelectionChange,
  disabled = false,
}: PrepPhaseProps) {
  const canAffordMomentum = characterEnergy >= PREP_OPTIONS.momentum.energyCost;
  const canAffordIntel = characterEnergy >= PREP_OPTIONS.intel.energyCost;

  // Calculate current selection cost and bonus for display
  let currentCost = 0;
  let currentBonus = 0;
  let currentLabel = '';

  if (selection) {
    if (selection.type === 'momentum') {
      currentCost = PREP_OPTIONS.momentum.energyCost;
      currentBonus = PREP_OPTIONS.momentum.combatBonus;
      currentLabel = PREP_OPTIONS.momentum.label;
    } else if (selection.type === 'intel') {
      currentCost = PREP_OPTIONS.intel.energyCost;
      currentBonus = PREP_OPTIONS.intel.combatBonus;
      currentLabel = PREP_OPTIONS.intel.label;
    } else if (selection.type === 'power') {
      const power = getPowerById(selection.powerId);
      if (power) {
        currentCost = power.energyCost;
        const charPower = characterPowers.find(cp => cp.powerId === selection.powerId);
        const level = charPower?.level ?? 1;
        // Combat bonus = power level * base effectiveness / 12 (matches calculatePowerBonus)
        currentBonus = Math.floor((power.baseCombatEffectiveness * Math.pow(power.levelScaling, level - 1)) / 12);
        currentLabel = `Use ${power.name}`;
      }
    }
  }

  const handleSelectMomentum = () => {
    if (disabled || !canAffordMomentum) return;
    if (selection?.type === 'momentum') {
      onSelectionChange(null);
    } else {
      onSelectionChange({ type: 'momentum' });
    }
  };

  const handleSelectIntel = () => {
    if (disabled || !canAffordIntel) return;
    if (selection?.type === 'intel') {
      onSelectionChange(null);
    } else {
      onSelectionChange({ type: 'intel' });
    }
  };

  const handleSelectPower = (powerId: string) => {
    if (disabled) return;
    const power = getPowerById(powerId);
    if (!power || characterEnergy < power.energyCost) return;

    if (selection?.type === 'power' && selection.powerId === powerId) {
      onSelectionChange(null);
    } else {
      onSelectionChange({ type: 'power', powerId });
    }
  };

  // Get available powers (that the player can afford)
  const availablePowers = characterPowers
    .map(cp => {
      const power = getPowerById(cp.powerId);
      if (!power) return null;
      return {
        ...cp,
        power,
        canAfford: characterEnergy >= power.energyCost,
      };
    })
    .filter((p): p is NonNullable<typeof p> => p !== null);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-white/70 text-sm uppercase tracking-wide flex items-center gap-2">
          <Target className="h-4 w-4" />
          Prep Phase
        </h4>
        {selection && (
          <button
            onClick={() => onSelectionChange(null)}
            className="text-xs text-white/40 hover:text-white/60 transition-colors"
            disabled={disabled}
          >
            Clear
          </button>
        )}
      </div>

      {/* Prep Options */}
      <div className="grid grid-cols-2 gap-2">
        {/* Build Momentum */}
        <button
          onClick={handleSelectMomentum}
          disabled={disabled || !canAffordMomentum}
          className={`p-3 rounded-lg border text-left transition-all ${
            selection?.type === 'momentum'
              ? 'bg-blue-500/20 border-blue-400/50 ring-1 ring-blue-400/30'
              : canAffordMomentum
              ? 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
              : 'bg-white/5 border-white/5 opacity-50 cursor-not-allowed'
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <Zap className="h-4 w-4 text-yellow-400" />
            <span className="text-sm font-medium text-white/90">Momentum</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-green-400">+{PREP_OPTIONS.momentum.combatBonus}</span>
            <span className="text-yellow-400">-{PREP_OPTIONS.momentum.energyCost} energy</span>
          </div>
        </button>

        {/* Gather Intel */}
        <button
          onClick={handleSelectIntel}
          disabled={disabled || !canAffordIntel}
          className={`p-3 rounded-lg border text-left transition-all ${
            selection?.type === 'intel'
              ? 'bg-blue-500/20 border-blue-400/50 ring-1 ring-blue-400/30'
              : canAffordIntel
              ? 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
              : 'bg-white/5 border-white/5 opacity-50 cursor-not-allowed'
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <Brain className="h-4 w-4 text-purple-400" />
            <span className="text-sm font-medium text-white/90">Intel</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-green-400">+{PREP_OPTIONS.intel.combatBonus}</span>
            <span className="text-yellow-400">-{PREP_OPTIONS.intel.energyCost} energy</span>
          </div>
        </button>
      </div>

      {/* Power Selection (if player has powers) */}
      {availablePowers.length > 0 && (
        <div className="relative">
          <div className="text-xs text-white/50 mb-1.5">Or use a power:</div>
          <div className="relative">
            <select
              value={selection?.type === 'power' ? selection.powerId : ''}
              onChange={(e) => {
                if (e.target.value) {
                  handleSelectPower(e.target.value);
                } else {
                  if (selection?.type === 'power') {
                    onSelectionChange(null);
                  }
                }
              }}
              disabled={disabled}
              className={`w-full p-2.5 pr-8 rounded-lg border text-sm appearance-none bg-white/5 text-white/80 transition-all ${
                selection?.type === 'power'
                  ? 'border-blue-400/50 ring-1 ring-blue-400/30'
                  : 'border-white/10 hover:border-white/20'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <option value="" className="bg-gray-900 text-white/60">Select a power...</option>
              {availablePowers.map((cp) => (
                <option
                  key={cp.powerId}
                  value={cp.powerId}
                  disabled={!cp.canAfford}
                  className="bg-gray-900"
                >
                  {cp.power.name} (Lv{cp.level}) — {cp.power.energyCost} energy
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 pointer-events-none" />
          </div>
        </div>
      )}

      {/* Summary */}
      <div className={`p-2.5 rounded-lg text-sm ${
        selection
          ? 'bg-green-500/10 border border-green-500/20'
          : 'bg-white/5 border border-white/10'
      }`}>
        {selection ? (
          <div className="flex items-center justify-between">
            <span className="text-white/70">{currentLabel}</span>
            <div className="flex items-center gap-3">
              <span className="text-green-400 font-medium">+{currentBonus} combat</span>
              <span className="text-yellow-400">-{currentCost} energy</span>
            </div>
          </div>
        ) : (
          <span className="text-white/40">No prep selected (optional)</span>
        )}
      </div>
    </div>
  );
}
