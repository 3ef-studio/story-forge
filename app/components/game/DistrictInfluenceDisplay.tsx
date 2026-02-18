'use client';

import {
  type DistrictInfluence,
  getDominantIdeology,
  getIdeologyInfo,
} from '@/app/lib/game-logic/district-influence';
import type { Ideology } from '@/app/data/new-origins';

interface DistrictInfluenceDisplayProps {
  influence: DistrictInfluence;
  districtName?: string;
  compact?: boolean;
}

const IDEOLOGY_ORDER: Ideology[] = ['radiance', 'stability', 'entropy', 'doubt'];

export function DistrictInfluenceDisplay({
  influence,
  districtName,
  compact = false,
}: DistrictInfluenceDisplayProps) {
  const dominant = getDominantIdeology(influence);

  if (compact) {
    // Compact view for map tooltips
    return (
      <div className="space-y-1">
        {districtName && (
          <div className="text-xs text-white/60 mb-1">{districtName} Ideology</div>
        )}
        <div className="flex gap-1">
          {IDEOLOGY_ORDER.map((ideology) => {
            const info = getIdeologyInfo(ideology);
            const value = influence[ideology];
            const isDominant = dominant === ideology;
            return (
              <div
                key={ideology}
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-xs ${
                  isDominant ? info.bgColor : 'bg-white/5'
                }`}
                title={`${info.name}: ${value}/100`}
              >
                <span>{info.icon}</span>
                <span className={isDominant ? info.color : 'text-white/40'}>{value}</span>
              </div>
            );
          })}
        </div>
        {dominant && (
          <div className="text-xs text-white/60">
            Dominant: {getIdeologyInfo(dominant).name}
          </div>
        )}
      </div>
    );
  }

  // Full view for district panel
  return (
    <div className="space-y-3">
      {districtName && (
        <div className="text-sm font-medium text-white/80">{districtName} Ideological Influence</div>
      )}

      <div className="space-y-2">
        {IDEOLOGY_ORDER.map((ideology) => {
          const info = getIdeologyInfo(ideology);
          const value = influence[ideology];
          const isDominant = dominant === ideology;

          return (
            <div key={ideology} className="space-y-1">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span>{info.icon}</span>
                  <span className={`text-xs ${isDominant ? info.color : 'text-white/60'}`}>
                    {info.name}
                  </span>
                </div>
                <span className={`text-xs ${isDominant ? info.color : 'text-white/40'}`}>
                  {value}
                </span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    isDominant ? info.color.replace('text-', 'bg-') : 'bg-white/20'
                  }`}
                  style={{ width: `${value}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {dominant && (
        <div className={`text-xs p-2 rounded ${getIdeologyInfo(dominant).bgColor}`}>
          <span className={getIdeologyInfo(dominant).color}>
            {getIdeologyInfo(dominant).name} dominates this district.
          </span>
          <span className="text-white/50 ml-1">{getIdeologyInfo(dominant).description}</span>
        </div>
      )}
    </div>
  );
}
