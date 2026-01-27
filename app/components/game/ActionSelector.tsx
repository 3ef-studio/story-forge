'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
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
              className={`group text-left px-4 py-3.5 rounded-xl border shadow-sm transition-colors min-h-[56px] ${
                !available || disabledReason
                  ? 'bg-gray-50 border-gray-200 opacity-50 cursor-not-allowed'
                  : advancesGoal
                  ? 'bg-yellow-50 border-yellow-200 active:bg-yellow-100'
                  : 'bg-white border-gray-200 active:bg-gray-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`p-1.5 rounded-lg ${info.color} text-white flex-shrink-0`}>
                  {info.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-sm text-gray-900 truncate">
                      {action.name}
                    </span>
                    {advancesGoal && (
                      <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{action.description}</p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    action.energyCost <= 0 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    <Zap className="h-3 w-3 inline -mt-0.5 mr-0.5" />
                    {action.energyCost <= 0 ? `+${Math.abs(action.energyCost)}` : action.energyCost}
                  </span>
                  {isOnCooldown(action.id) && (
                    <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                      <Clock className="h-2.5 w-2.5" />
                      {getCooldownRemaining(action.id)}
                    </span>
                  )}
                </div>
              </div>
              {disabledReason && (
                <div className={`mt-2 flex items-center gap-1.5 text-xs rounded-lg px-2.5 py-1.5 ${
                  disabledReason === 'Not available here'
                    ? 'text-amber-600 bg-amber-50'
                    : 'text-red-500 bg-red-50'
                }`}>
                  {disabledReason === 'Not available here'
                    ? <MapPinOff className="h-3 w-3 flex-shrink-0" />
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
            className={`group text-left p-4 rounded-xl border-2 transition-all duration-200 ${
              !available || disabledReason
                ? 'bg-gray-50 border-gray-200 opacity-60 cursor-not-allowed'
                : advancesGoal
                ? 'bg-yellow-50 border-yellow-300 hover:border-yellow-400 hover:shadow-md hover:shadow-yellow-100 hover:-translate-y-0.5 cursor-pointer active:translate-y-0 active:shadow-sm'
                : 'bg-white border-gray-200 hover:border-blue-400 hover:shadow-md hover:shadow-blue-100 hover:-translate-y-0.5 cursor-pointer active:translate-y-0 active:shadow-sm'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={`p-1.5 rounded-lg ${info.color} text-white shadow-sm group-hover:scale-110 transition-transform`}>
                    {info.icon}
                  </span>
                  <span className="font-semibold text-sm text-gray-800 group-hover:text-blue-600 transition-colors">
                    {action.name}
                  </span>
                  {advancesGoal && (
                    <span className="flex items-center gap-1 text-xs text-yellow-600 bg-yellow-100 px-1.5 py-0.5 rounded-full">
                      <Star className="h-3 w-3 fill-yellow-500" />
                      Goal
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1.5 line-clamp-2 leading-relaxed">
                  {action.description}
                </p>
              </div>

              <div className="flex flex-col items-end gap-1.5">
                {/* Energy Cost */}
                <Badge
                  variant={action.energyCost <= 0 ? 'success' : 'warning'}
                  className="text-xs font-medium shadow-sm"
                >
                  <Zap className="h-3 w-3 mr-1" />
                  {action.energyCost <= 0 ? `+${Math.abs(action.energyCost)}` : action.energyCost}
                </Badge>

                {/* Cooldown indicator (static per action definition) */}
                {action.cooldownHours && (
                  <span className="text-xs text-gray-400 flex items-center gap-1">
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
                  ? 'text-amber-600 bg-amber-50'
                  : 'text-red-500 bg-red-50'
              }`}>
                {disabledReason === 'Not available here'
                  ? <MapPinOff className="h-3.5 w-3.5 flex-shrink-0" />
                  : <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
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
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 active:bg-gray-200'
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
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span>Actions</span>
          <div className="flex items-center gap-1 text-sm font-normal text-gray-500">
            <Zap className="h-4 w-4 text-yellow-500" />
            {playerEnergy}
          </div>
        </CardTitle>
        {districtSelector && <div className="mt-2">{districtSelector}</div>}

        {/* Category Tabs */}
        <div className="mt-2 flex flex-wrap gap-1">
          {categories.map((cat) => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(cat)}
              className="text-xs"
            >
              {cat === 'all' ? 'All' : categoryInfo[cat].label}
            </Button>
          ))}
        </div>
      </CardHeader>

      <CardContent>
        {content}
      </CardContent>
    </Card>
  );
}
