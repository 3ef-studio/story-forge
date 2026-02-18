'use client';

import {
  getAlignmentTier,
  getAlignmentLabel,
  getAlignmentColor,
  getAlignmentBgColor,
  getAlignmentModifiers,
} from '@/app/lib/game-logic/alignment';
import { getDeityById, type DeityId } from '@/app/data/new-origins';
import { Sun, Shield, Flame, Eye, AlertTriangle } from 'lucide-react';

const DEITY_ICONS: Record<DeityId, typeof Sun> = {
  aurelion: Sun,
  thal_vara: Shield,
  typhos: Flame,
  nyx_mora: Eye,
};

interface AlignmentBadgeProps {
  alignmentValue: number | null;
  patronDeityId: string | null;
  showDetails?: boolean;
}

export function AlignmentBadge({
  alignmentValue,
  patronDeityId,
  showDetails = false,
}: AlignmentBadgeProps) {
  // No patron means no alignment system
  if (alignmentValue === null || !patronDeityId) {
    return null;
  }

  const deityId = patronDeityId as DeityId;
  const deity = getDeityById(deityId);
  const tier = getAlignmentTier(alignmentValue);
  const label = getAlignmentLabel(alignmentValue, deityId);
  const colorClass = getAlignmentColor(alignmentValue);
  const bgColorClass = getAlignmentBgColor(alignmentValue);
  const modifiers = getAlignmentModifiers(alignmentValue);

  const Icon = DEITY_ICONS[deityId] ?? Sun;

  if (!showDetails) {
    // Compact badge for sidebar
    return (
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${bgColorClass}`}
        title={`${label} (${alignmentValue}/100)\n${modifiers.description}`}
      >
        <Icon className={`w-4 h-4 ${colorClass}`} />
        <div className="flex-1 min-w-0">
          <div className={`text-xs font-medium ${colorClass} truncate`}>
            {deity?.name ?? 'Unknown'}
          </div>
          <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                tier === 'aligned'
                  ? 'bg-green-400'
                  : tier === 'neutral'
                  ? 'bg-blue-400'
                  : tier === 'drifting'
                  ? 'bg-yellow-400'
                  : 'bg-red-400'
              }`}
              style={{ width: `${alignmentValue}%` }}
            />
          </div>
        </div>
        <span className={`text-xs ${colorClass}`}>{alignmentValue}</span>
      </div>
    );
  }

  // Detailed view
  return (
    <div className={`rounded-lg border ${bgColorClass} p-3 space-y-2`}>
      <div className="flex items-center gap-2">
        <Icon className={`w-5 h-5 ${colorClass}`} />
        <div className="flex-1">
          <div className={`text-sm font-medium ${colorClass}`}>{label}</div>
          <div className="text-xs text-white/60">{deity?.title}</div>
        </div>
        <div className={`text-lg font-bold ${colorClass}`}>{alignmentValue}</div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${
            tier === 'aligned'
              ? 'bg-green-400'
              : tier === 'neutral'
              ? 'bg-blue-400'
              : tier === 'drifting'
              ? 'bg-yellow-400'
              : 'bg-red-400'
          }`}
          style={{ width: `${alignmentValue}%` }}
        />
      </div>

      {/* Status description */}
      <p className="text-xs text-white/60">{modifiers.description}</p>

      {/* Active modifiers */}
      {(modifiers.energyCostMod !== 0 || modifiers.successMod !== 0) && (
        <div className="flex gap-2 text-xs">
          {modifiers.energyCostMod !== 0 && (
            <span className={modifiers.energyCostMod < 0 ? 'text-green-400' : 'text-red-400'}>
              {modifiers.energyCostMod > 0 ? '+' : ''}{modifiers.energyCostMod} Energy Cost
            </span>
          )}
          {modifiers.successMod !== 0 && (
            <span className={modifiers.successMod > 0 ? 'text-green-400' : 'text-red-400'}>
              {modifiers.successMod > 0 ? '+' : ''}{modifiers.successMod} Success
            </span>
          )}
        </div>
      )}

      {/* Severed warning */}
      {modifiers.advancedPowersDisabled && (
        <div className="flex items-center gap-1 text-xs text-red-400">
          <AlertTriangle className="w-3 h-3" />
          Advanced powers disabled
        </div>
      )}
    </div>
  );
}
