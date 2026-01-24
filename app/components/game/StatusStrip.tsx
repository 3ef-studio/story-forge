'use client';

import { Heart, Zap, Star, TrendingUp } from 'lucide-react';

interface StatusStripProps {
  hp: number;
  maxHp: number;
  energy: number;
  maxEnergy: number;
  xp: number;
  xpToNextLevel: number;
  level: number;
  activeGoalTitle?: string;
}

export function StatusStrip({
  hp,
  maxHp,
  energy,
  maxEnergy,
  xp,
  xpToNextLevel,
  level,
  activeGoalTitle,
}: StatusStripProps) {
  const hpPercent = Math.round((hp / maxHp) * 100);
  const energyPercent = Math.round((energy / maxEnergy) * 100);
  const xpPercent = Math.round((xp / xpToNextLevel) * 100);

  return (
    <div className="bg-white border-b border-gray-200 px-3 py-2 sticky top-14 z-40 sm:hidden">
      {/* Top row: HP, Energy, Level */}
      <div className="flex items-center justify-between gap-2 text-xs">
        {/* HP */}
        <div className="flex items-center gap-1 flex-1">
          <Heart className="h-3.5 w-3.5 text-red-500 shrink-0" />
          <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-red-500 rounded-full transition-all"
              style={{ width: `${hpPercent}%` }}
            />
          </div>
          <span className="text-gray-600 w-8 text-right">{hp}</span>
        </div>

        {/* Energy */}
        <div className="flex items-center gap-1 flex-1">
          <Zap className="h-3.5 w-3.5 text-yellow-500 shrink-0" />
          <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-yellow-500 rounded-full transition-all"
              style={{ width: `${energyPercent}%` }}
            />
          </div>
          <span className="text-gray-600 w-8 text-right">{energy}</span>
        </div>

        {/* Level + XP */}
        <div className="flex items-center gap-1">
          <TrendingUp className="h-3.5 w-3.5 text-blue-500 shrink-0" />
          <span className="font-semibold text-gray-800">Lv{level}</span>
          <div className="w-10 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all"
              style={{ width: `${xpPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Bottom row: Active goal (if any) */}
      {activeGoalTitle && (
        <div className="flex items-center gap-1.5 mt-1.5 text-xs text-gray-600">
          <Star className="h-3 w-3 text-yellow-500 shrink-0" />
          <span className="truncate">{activeGoalTitle}</span>
        </div>
      )}
    </div>
  );
}

export default StatusStrip;
