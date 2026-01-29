'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Badge } from '@/app/components/ui/badge';
import { actions, type Action, type ActionCategory, getAvailableActions, normalizeActionId } from '@/app/data/actions';
import { isActionAvailableInDistrict, isActionGlobal, type DistrictId } from '@/app/data/districts';
import { DistrictSelector } from '@/app/components/game/DistrictSelector';
import { AlertCircle, Circle, Clock, Dumbbell, MapPinOff, Shield, Skull, Star, Users, Zap } from 'lucide-react';
import type { GoalRecord } from '@/app/components/game/ActiveGoalsPanel';

interface ActionSelectorProps {
  playerLevel: number;
  playerAttributes: Record<string, number>;
  playerPowers: string[];
  playerEnergy: number;
  // actionId -> ISO date string (or any Date-parsable string)
  cooldowns: Record<string, string>;
  onSelectAction: (action: Action) => void;
  disabled?: boolean;
  activeGoals?: GoalRecord[];
  currentDistrict?: DistrictId;
  onDistrictChange?: (districtId: DistrictId) => void;
  compact?: boolean;
  hideHeader?: boolean;
}

const categoryInfo: Record<ActionCategory, { label: string; icon: ReactNode; color: string }> = {
  heroic: { label: 'Heroic', icon: <Shield className="h-4 w-4" />, color: 'bg-blue-500' },
  criminal: { label: 'Criminal', icon: <Skull className="h-4 w-4" />, color: 'bg-red-500' },
  neutral: { label: 'Neutral', icon: <Circle className="h-4 w-4" />, color: 'bg-gray-500' },
  training: { label: 'Training', icon: <Dumbbell className="h-4 w-4" />, color: 'bg-green-500' },
  social: { label: 'Social', icon: <Users className="h-4 w-4" />, color: 'bg-purple-500' },
};

// Check if an action advances any active goal
function doesActionAdvanceGoal(
  action: Action,
  goals: GoalRecord[]
): boolean {
  for (const goal of goals) {
    if (!goal.isActive || goal.currentProgress >= goal.targetValue) continue;
    const meta = goal.metadata;

    switch (goal.goalType) {
      case 'action_count':
        if (meta?.actionId && normalizeActionId(meta.actionId) === action.id) return true;
        break;
      case 'category_count':
        if (meta?.category === action.category) return true;
        break;
      case 'location_count':
        if (meta?.location && action.locationTypes.includes(meta.location)) return true;
        break;
    }
  }
  return false;
}

export function ActionSelector({
  playerLevel,
  playerAttributes,
  playerPowers,
  playerEnergy,
  cooldowns,
  onSelectAction,
  disabled = false,
  activeGoals = [],
  currentDistrict,
  onDistrictChange,
  compact = false,
  hideHeader = false,
}: ActionSelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState<ActionCategory | 'all'>('all');
  const [now, setNow] = useState<number>(() => Date.now());

  // Check if any cooldowns are active
  const hasActiveCooldowns = Object.keys(cooldowns).length > 0;

  // Only run interval when there are active cooldowns to save resources
  useEffect(() => {
    if (!hasActiveCooldowns) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [hasActiveCooldowns]);

  const availableActions = getAvailableActions(playerLevel, playerAttributes, playerPowers, playerEnergy);

  const filteredActions =
    selectedCategory === 'all' ? actions : actions.filter((a) => a.category === selectedCategory);

  const isActionAvailable = (action: Action) => {
    return availableActions.some((a) => a.id === action.id);
  };

  const getCooldownRemaining = (actionId: string): string | null => {
    const cooldownEnd = cooldowns[actionId];
    if (!cooldownEnd) return null;

    const endMs = new Date(cooldownEnd).getTime();
    if (Number.isNaN(endMs)) return null;

    const remaining = endMs - now;
    if (remaining <= 0) return null;

    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const isOnCooldown = (actionId: string) => getCooldownRemaining(actionId) !== null;

  const isNotInDistrict = (action: Action): boolean => {
    if (!currentDistrict) return false;
    if (isActionGlobal(action.id, action.category)) return false;
    return !isActionAvailableInDistrict(action.locationTypes, currentDistrict);
  };

  const getActionDisabledReason = (action: Action): string | null => {
    if (isNotInDistrict(action)) return 'Not available here';

    const cd = getCooldownRemaining(action.id);
    if (cd) return `Cooldown: ${cd}`;

    if (action.energyCost > playerEnergy && action.energyCost > 0) {
      return 'Not enough energy';
    }
    if (action.minLevel && playerLevel < action.minLevel) {
      return `Requires Level ${action.minLevel}`;
    }
    if (action.requiredAttributes?.length) {
      const unmet = action.requiredAttributes.find(
        (req) => (playerAttributes[req.attributeId] || 0) < req.minValue
      );
      if (unmet) return `Requires ${unmet.attributeId} ${unmet.minValue}`;
    }
    if (action.requiredPowers?.length) {
      const hasPower = action.requiredPowers.some((p) => playerPowers.includes(p));
      if (!hasPower) return 'Missing required power';
    }
    return null;
  };

  const categories: (ActionCategory | 'all')[] = ['all', 'heroic', 'criminal', 'neutral', 'training', 'social'];

  const content = (
    <div className={`grid grid-cols-1 ${compact ? 'gap-2.5' : 'gap-2'}`}>
      {filteredActions.map((action) => {
        const available = isActionAvailable(action);
        const disabledReason = getActionDisabledReason(action);
        const info = categoryInfo[action.category];
        const advancesGoal = doesActionAdvanceGoal(action, activeGoals);

        if (compact) {
          // Compact mobile view — card-style with comfortable tap targets
          return (
            <button
              key={action.id}
              onClick={() => onSelectAction(action)}
              disabled={disabled || !available || !!disabledReason}
              className={`group text-left px-4 py-3.5 rounded-xl border transition-colors min-h-14 ${
                !available || disabledReason
                  ? 'bg-white/5 border-white/10 opacity-50 cursor-not-allowed'
                  : advancesGoal
                  ? 'bg-yellow-500/10 border-yellow-500/30 active:bg-yellow-500/20'
                  : 'bg-white/10 border-white/10 active:bg-white/15'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`p-1.5 rounded-lg ${info.color} text-white shrink-0`}>
                  {info.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-sm text-white/90 truncate">
                      {action.name}
                    </span>
                    {advancesGoal && (
                      <Star className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400 shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-white/50 mt-0.5 line-clamp-1">{action.description}</p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    action.energyCost <= 0 ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300'
                  }`}>
                    <Zap className="h-3 w-3 inline -mt-0.5 mr-0.5" />
                    {action.energyCost <= 0 ? `+${Math.abs(action.energyCost)}` : action.energyCost}
                  </span>
                  {isOnCooldown(action.id) && (
                    <span className="text-[10px] text-white/40 flex items-center gap-0.5">
                      <Clock className="h-2.5 w-2.5" />
                      {getCooldownRemaining(action.id)}
                    </span>
                  )}
                </div>
              </div>
              {disabledReason && (
                <div className={`mt-2 flex items-center gap-1.5 text-xs rounded-lg px-2.5 py-1.5 ${
                  disabledReason === 'Not available here'
                    ? 'text-amber-400 bg-amber-500/15'
                    : 'text-red-400 bg-red-500/15'
                }`}>
                  {disabledReason === 'Not available here'
                    ? <MapPinOff className="h-3 w-3 shrink-0" />
                    : <AlertCircle className="h-3 w-3 flex-shrink-0" />
                  }
                  {disabledReason}
                </div>
              )}
            </button>
          );
        }

        // Full desktop view
        return (
          <button
            key={action.id}
            onClick={() => onSelectAction(action)}
            disabled={disabled || !available || !!disabledReason}
            className={`group text-left p-4 rounded-xl border transition-all duration-200 ${
              !available || disabledReason
                ? 'bg-white/5 border-white/10 opacity-60 cursor-not-allowed'
                : advancesGoal
                ? 'bg-yellow-500/10 border-yellow-500/30 hover:border-yellow-400/50 hover:bg-yellow-500/15 hover:-translate-y-0.5 cursor-pointer active:translate-y-0'
                : 'bg-white/10 border-white/10 hover:border-blue-400/40 hover:bg-white/15 hover:-translate-y-0.5 cursor-pointer active:translate-y-0'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={`p-1.5 rounded-lg ${info.color} text-white shadow-sm group-hover:scale-110 transition-transform`}>
                    {info.icon}
                  </span>
                  <span className="font-semibold text-sm text-white/90 group-hover:text-blue-300 transition-colors">
                    {action.name}
                  </span>
                  {advancesGoal && (
                    <span className="flex items-center gap-1 text-xs text-yellow-400 bg-yellow-500/20 px-1.5 py-0.5 rounded-full">
                      <Star className="h-3 w-3 fill-yellow-400" />
                      Goal
                    </span>
                  )}
                </div>
                <p className="text-xs text-white/50 mt-1.5 line-clamp-2 leading-relaxed">
                  {action.description}
                </p>
              </div>

              <div className="flex flex-col items-end gap-1.5">
                {/* Energy Cost */}
                <Badge
                  variant={action.energyCost <= 0 ? 'success' : 'warning'}
                  className="text-xs font-medium"
                >
                  <Zap className="h-3 w-3 mr-1" />
                  {action.energyCost <= 0 ? `+${Math.abs(action.energyCost)}` : action.energyCost}
                </Badge>

                {/* Cooldown indicator (static per action definition) */}
                {action.cooldownHours && (
                  <span className="text-xs text-white/40 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {action.cooldownHours}h
                  </span>
                )}
              </div>
            </div>

            {/* Disabled reason */}
            {disabledReason && (
              <div className={`mt-2.5 flex items-center gap-1.5 text-xs rounded-lg px-2 py-1.5 ${
                disabledReason === 'Not available here'
                  ? 'text-amber-400 bg-amber-500/15'
                  : 'text-red-400 bg-red-500/15'
              }`}>
                {disabledReason === 'Not available here'
                  ? <MapPinOff className="h-3.5 w-3.5 flex-shrink-0" />
                  : <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                }
                <span>{disabledReason}</span>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );

  const districtSelector = currentDistrict && onDistrictChange ? (
    <DistrictSelector
      currentDistrict={currentDistrict}
      onDistrictChange={onDistrictChange}
      disabled={disabled}
    />
  ) : null;

  // If hideHeader, return content only (for mobile tab)
  if (hideHeader) {
    return (
      <div className="space-y-4">
        {districtSelector}
        {/* Category filter pills */}
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors min-h-[32px] ${
                selectedCategory === cat
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'bg-white/10 text-white/60 active:bg-white/20'
              }`}
            >
              {cat === 'all' ? 'All' : categoryInfo[cat].label}
            </button>
          ))}
        </div>
        {content}
      </div>
    );
  }

  return (
    <div className="panel-glass rounded-2xl">
      <div className="p-4 pb-3 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white/90">Actions</h3>
          <div className="flex items-center gap-1 text-sm font-normal text-white/50">
            <Zap className="h-4 w-4 text-yellow-400" />
            {playerEnergy}
          </div>
        </div>
        {districtSelector && <div className="mt-2">{districtSelector}</div>}

        {/* Category Tabs */}
        <div className="mt-2 flex flex-wrap gap-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                selectedCategory === cat
                  ? 'bg-blue-500 text-white'
                  : 'bg-white/10 text-white/60 hover:bg-white/15'
              }`}
            >
              {cat === 'all' ? 'All' : categoryInfo[cat].label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pb-4">
        {content}
      </div>
    </div>
  );
}
