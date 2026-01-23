'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Progress } from '@/app/components/ui/progress';
import { Badge } from '@/app/components/ui/badge';
import { getOriginById } from '@/app/data/origins';
import { getPowerById } from '@/app/data/powers';
import { getFactionById, getAttitudeLevel } from '@/app/data/factions';
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

  const attitudeColors: Record<string, 'hostile' | 'suspicious' | 'neutral' | 'friendly' | 'allied'> = {
    hostile: 'hostile',
    suspicious: 'suspicious',
    neutral: 'neutral',
    friendly: 'friendly',
    allied: 'allied',
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between">
            <span>{character.name}</span>
            <Badge variant="outline">Lv. {character.level}</Badge>
          </CardTitle>
          <p className="text-sm text-gray-500">{origin?.name}</p>
        </CardHeader>
        <CardContent className="space-y-3">
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
          <div className="flex justify-between text-sm pt-2">
            <span className="text-gray-600">Money</span>
            <span className="font-medium">${character.money}</span>
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
                return (
                  <div
                    key={power.powerId}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded"
                  >
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
                const attitude = getAttitudeLevel(faction, reputation);
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
                        variant={attitudeColors[attitude] || 'neutral'}
                        className="text-xs"
                      >
                        {attitude}
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
