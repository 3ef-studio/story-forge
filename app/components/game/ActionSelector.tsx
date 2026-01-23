'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { actions, type Action, type ActionCategory, getAvailableActions } from '@/app/data/actions';
import { AlertCircle, Circle, Clock, Dumbbell, Shield, Skull, Users, Zap } from 'lucide-react';

interface ActionSelectorProps {
  playerLevel: number;
  playerAttributes: Record<string, number>;
  playerPowers: string[];
  playerEnergy: number;
  // actionId -> ISO date string (or any Date-parsable string)
  cooldowns: Record<string, string>;
  onSelectAction: (action: Action) => void;
  disabled?: boolean;
}

const categoryInfo: Record<ActionCategory, { label: string; icon: ReactNode; color: string }> = {
  heroic: { label: 'Heroic', icon: <Shield className="h-4 w-4" />, color: 'bg-blue-500' },
  criminal: { label: 'Criminal', icon: <Skull className="h-4 w-4" />, color: 'bg-red-500' },
  neutral: { label: 'Neutral', icon: <Circle className="h-4 w-4" />, color: 'bg-gray-500' },
  training: { label: 'Training', icon: <Dumbbell className="h-4 w-4" />, color: 'bg-green-500' },
  social: { label: 'Social', icon: <Users className="h-4 w-4" />, color: 'bg-purple-500' },
};

export function ActionSelector({
  playerLevel,
  playerAttributes,
  playerPowers,
  playerEnergy,
  cooldowns,
  onSelectAction,
  disabled = false,
}: ActionSelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState<ActionCategory | 'all'>('all');
  const [now, setNow] = useState<number>(() => Date.now());

  // Stable "now" value updated on an interval (avoid calling Date.now() in render)
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
}, []);

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

  const getActionDisabledReason = (action: Action): string | null => {
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
        <div className="grid grid-cols-1 gap-2">
          {filteredActions.map((action) => {
            const available = isActionAvailable(action);
            const disabledReason = getActionDisabledReason(action);
            const info = categoryInfo[action.category];

            return (
              <button
                key={action.id}
                onClick={() => onSelectAction(action)}
                disabled={disabled || !available || !!disabledReason}
                className={`text-left p-3 rounded-lg border transition-all ${
                  !available || disabledReason
                    ? 'bg-gray-50 border-gray-200 opacity-60 cursor-not-allowed'
                    : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-sm cursor-pointer'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`p-1 rounded ${info.color} text-white`}>{info.icon}</span>
                      <span className="font-medium text-sm">{action.name}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{action.description}</p>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    {/* Energy Cost */}
                    <Badge variant={action.energyCost <= 0 ? 'success' : 'warning'} className="text-xs">
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
                  <div className="mt-2 flex items-center gap-1 text-xs text-red-500">
                    <AlertCircle className="h-3 w-3" />
                    {disabledReason}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
