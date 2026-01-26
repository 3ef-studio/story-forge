'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Progress } from '@/app/components/ui/progress';
import { Badge } from '@/app/components/ui/badge';
import { getOriginById } from '@/app/data/origins';
import { getPowerById, calculateXPForLevel } from '@/app/data/powers';
import { getFactionById } from '@/app/data/factions';
import { getFactionState, getFactionStateLabel, getFactionStateColor, type FactionState } from '@/app/lib/world/faction-state';
import { getAttributeById } from '@/app/data/attributes';
import { Heart, Zap, Star, Shield, Brain, Eye, Footprints, Sparkles } from 'lucide-react';

interface CharacterSheetProps {
  character: {
    name: string;
    originId: string;
    level: number;
    currentXp: number;
    xpToNextLevel: number;
    currentHp: number;
    maxHp: number;
    currentEnergy: number;
    maxEnergy: number;
    money: number;
    attributes: Record<string, number>;
    powers: Array<{ powerId: string; level: number; xp: number }>;
    factions: Record<string, number>;
  };
}

const attributeIcons: Record<string, React.ReactNode> = {
  strength: <Shield className="h-4 w-4" />,
  agility: <Footprints className="h-4 w-4" />,
  intelligence: <Brain className="h-4 w-4" />,
  perception: <Eye className="h-4 w-4" />,
  endurance: <Heart className="h-4 w-4" />,
  willpower: <Sparkles className="h-4 w-4" />,
};

export function CharacterSheet({ character }: CharacterSheetProps) {
  const origin = getOriginById(character.originId);

  // Map faction states to Badge variants
  const stateToVariant: Record<FactionState, 'hostile' | 'suspicious' | 'neutral' | 'friendly' | 'allied'> = {
    hostile: 'hostile',
    aggressive: 'suspicious',
    wary: 'neutral',
    cooperative: 'friendly',
    allied: 'allied',
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="overflow-hidden">
        <div className="bg-linear-to-r from-blue-500 to-purple-600 px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">{character.name}</h2>
              <p className="text-blue-100 text-sm">{origin?.name}</p>
            </div>
            <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm">
              Level {character.level}
            </Badge>
          </div>
        </div>
        <CardContent className="space-y-3 pt-4">
          {/* HP Bar */}
          <Progress
            value={character.currentHp}
            max={character.maxHp}
            variant="hp"
            showLabel
            label="HP"
          />

          {/* Energy Bar */}
          <Progress
            value={character.currentEnergy}
            max={character.maxEnergy}
            variant="energy"
            showLabel
            label="Energy"
          />

          {/* XP Bar */}
          <Progress
            value={character.currentXp}
            max={character.xpToNextLevel}
            variant="xp"
            showLabel
            label="XP"
          />

          {/* Money */}
          <div className="flex justify-between items-center text-sm pt-2 px-1">
            <span className="text-gray-600 flex items-center gap-1">
              <span className="text-green-600 font-medium">$</span>
              Money
            </span>
            <span className="font-bold text-green-600">${character.money}</span>
          </div>
        </CardContent>
      </Card>

      {/* Attributes */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Star className="h-5 w-5" />
            Attributes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(character.attributes)
              .filter(([id]) => !['reputation', 'notoriety'].includes(id))
              .map(([id, value]) => {
                const attr = getAttributeById(id);
                return (
                  <div
                    key={id}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded"
                  >
                    <span className="flex items-center gap-1 text-sm text-gray-600 capitalize">
                      {attributeIcons[id]}
                      {attr?.name || id}
                    </span>
                    <span className="font-medium">{value}</span>
                  </div>
                );
              })}
          </div>

          {/* Reputation & Notoriety */}
          <div className="mt-3 pt-3 border-t grid grid-cols-2 gap-2">
            <div className="flex justify-between p-2 bg-blue-50 rounded">
              <span className="text-sm text-blue-700">Reputation</span>
              <span className="font-medium text-blue-700">
                {character.attributes.reputation || 0}
              </span>
            </div>
            <div className="flex justify-between p-2 bg-red-50 rounded">
              <span className="text-sm text-red-700">Notoriety</span>
              <span className="font-medium text-red-700">
                {character.attributes.notoriety || 0}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Powers */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Powers
          </CardTitle>
        </CardHeader>
        <CardContent>
          {character.powers.length === 0 ? (
            <p className="text-sm text-gray-500">No powers unlocked yet</p>
          ) : (
            <div className="space-y-2">
              {character.powers.map((power) => {
                const powerData = getPowerById(power.powerId);
                const xpToNext = powerData ? calculateXPForLevel(powerData, power.level + 1) : 100;
                const xpPercent = Math.min(100, Math.round((power.xp / xpToNext) * 100));
                const isMaxLevel = powerData && power.level >= powerData.maxLevel;
                return (
                  <div
                    key={power.powerId}
                    className="p-2 bg-gray-50 rounded"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium text-sm">
                          {powerData?.name || power.powerId}
                        </span>
                        <p className="text-xs text-gray-500">
                          {powerData?.category}
                        </p>
                      </div>
                      <Badge variant="outline">Lv. {power.level}</Badge>
                    </div>
                    {/* XP Progress Bar */}
                    {!isMaxLevel && (
                      <div className="mt-1.5">
                        <div className="flex justify-between text-xs text-gray-400 mb-0.5">
                          <span>XP</span>
                          <span>{power.xp}/{xpToNext}</span>
                        </div>
                        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-purple-500 transition-all duration-300"
                            style={{ width: `${xpPercent}%` }}
                          />
                        </div>
                      </div>
                    )}
                    {isMaxLevel && (
                      <div className="mt-1 text-xs text-purple-600 font-medium">MAX LEVEL</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Factions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Factions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(character.factions)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 6)
              .map(([factionId, reputation]) => {
                const faction = getFactionById(factionId);
                if (!faction) return null;
                const state = getFactionState(reputation);
                const stateLabel = getFactionStateLabel(state);
                return (
                  <div
                    key={factionId}
                    className="flex items-center justify-between"
                  >
                    <span className="text-sm text-gray-600">
                      {faction.shortName}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">
                        {reputation > 0 ? '+' : ''}
                        {reputation}
                      </span>
                      <Badge
                        variant={stateToVariant[state]}
                        className="text-xs"
                      >
                        {stateLabel}
                      </Badge>
                    </div>
                  </div>
                );
              })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
