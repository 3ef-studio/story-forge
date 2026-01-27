'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Progress } from '@/app/components/ui/progress';
import { Badge } from '@/app/components/ui/badge';
import { getOriginById } from '@/app/data/origins';
import { getPowerById, calculateXPForLevel } from '@/app/data/powers';
import { getFactionById } from '@/app/data/factions';
import { getFactionState, getFactionStateLabel, getFactionStateColor, type FactionState } from '@/app/lib/world/faction-state';
import { getAttributeById } from '@/app/data/attributes';
import { Heart, Zap, Star, Shield, Brain, Eye, Footprints, Sparkles, AlertTriangle, ChevronDown } from 'lucide-react';

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
    activeThread?: {
      id: string;
      type: string;
      title: string;
      summary: string;
      expiresIn: number;
    } | null;
  };
}

const attributeIcons: Record<string, React.ReactNode> = {
  strength: <Shield className="h-3.5 w-3.5" />,
  agility: <Footprints className="h-3.5 w-3.5" />,
  intelligence: <Brain className="h-3.5 w-3.5" />,
  perception: <Eye className="h-3.5 w-3.5" />,
  endurance: <Heart className="h-3.5 w-3.5" />,
  willpower: <Sparkles className="h-3.5 w-3.5" />,
};

// Collapsible section header
function SectionHeader({
  title,
  icon,
  open,
  onToggle,
}: {
  title: string;
  icon: React.ReactNode;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center justify-between w-full px-4 py-3"
    >
      <span className="text-base font-semibold flex items-center gap-2 text-gray-800">
        {icon}
        {title}
      </span>
      <ChevronDown
        className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${
          open ? 'rotate-180' : ''
        }`}
      />
    </button>
  );
}

export function CharacterSheet({ character }: CharacterSheetProps) {
  const origin = getOriginById(character.originId);

  // Accordion state — powers open by default, rest collapsed
  const [powersOpen, setPowersOpen] = useState(true);
  const [attributesOpen, setAttributesOpen] = useState(false);
  const [factionsOpen, setFactionsOpen] = useState(false);

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
      <Card className="overflow-hidden rounded-2xl">
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
              <span className="text-green-600 font-semibold">$</span>
              Money
            </span>
            <span className="font-bold text-green-600 text-base">${character.money}</span>
          </div>
        </CardContent>
      </Card>

      {/* Powers (shown first) */}
      <Card className="rounded-2xl overflow-hidden">
        <SectionHeader
          title="Powers"
          icon={<Zap className="h-5 w-5 text-purple-500" />}
          open={powersOpen}
          onToggle={() => setPowersOpen(!powersOpen)}
        />
        {powersOpen && (
          <CardContent className="pt-0 pb-4">
            {character.powers.length === 0 ? (
              <p className="text-sm text-gray-500">No powers unlocked yet</p>
            ) : (
              <div className="space-y-2.5">
                {character.powers.map((power) => {
                  const powerData = getPowerById(power.powerId);
                  const xpToNext = powerData ? calculateXPForLevel(powerData, power.level + 1) : 100;
                  const xpPercent = Math.min(100, Math.round((power.xp / xpToNext) * 100));
                  const isMaxLevel = powerData && power.level >= powerData.maxLevel;
                  return (
                    <div
                      key={power.powerId}
                      className="p-3 bg-gray-50 rounded-xl"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-semibold text-sm text-gray-900">
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
                        <div className="mt-2">
                          <div className="flex justify-between text-xs text-gray-500 mb-0.5">
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
                        <div className="mt-1.5 text-xs text-purple-600 font-semibold">MAX LEVEL</div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Attributes */}
      <Card className="rounded-2xl overflow-hidden">
        <SectionHeader
          title="Attributes"
          icon={<Star className="h-5 w-5 text-yellow-500" />}
          open={attributesOpen}
          onToggle={() => setAttributesOpen(!attributesOpen)}
        />
        {attributesOpen && (
          <CardContent className="pt-0 pb-4">
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(character.attributes)
                .filter(([id]) => !['reputation', 'notoriety'].includes(id))
                .map(([id, value]) => {
                  const attr = getAttributeById(id);
                  return (
                    <div
                      key={id}
                      className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl"
                    >
                      <span className="flex items-center gap-1.5 text-xs text-gray-500 capitalize">
                        {attributeIcons[id]}
                        {attr?.name || id}
                      </span>
                      <span className="font-bold text-lg text-gray-900">{value}</span>
                    </div>
                  );
                })}
            </div>

            {/* Reputation & Notoriety */}
            <div className="mt-3 pt-3 border-t grid grid-cols-2 gap-2">
              <div className="flex justify-between items-center p-2.5 bg-blue-50 rounded-xl">
                <span className="text-xs text-blue-700">Reputation</span>
                <span className="font-bold text-lg text-blue-700">
                  {character.attributes.reputation || 0}
                </span>
              </div>
              <div className="flex justify-between items-center p-2.5 bg-red-50 rounded-xl">
                <span className="text-xs text-red-700">Notoriety</span>
                <span className="font-bold text-lg text-red-700">
                  {character.attributes.notoriety || 0}
                </span>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Factions */}
      <Card className="rounded-2xl overflow-hidden">
        <SectionHeader
          title="Factions"
          icon={<span className="text-base">🏛</span>}
          open={factionsOpen}
          onToggle={() => setFactionsOpen(!factionsOpen)}
        />
        {factionsOpen && (
          <CardContent className="pt-0 pb-4">
            <div className="space-y-2.5">
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
                      className="flex items-center justify-between py-1"
                    >
                      <span className="text-sm text-gray-700 font-medium">
                        {faction.shortName}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">
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
        )}
      </Card>

      {/* Active Consequence Thread */}
      {character.activeThread && (
        <Card className="border-amber-200 bg-amber-50/50 rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-amber-700">
              <AlertTriangle className="h-5 w-5" />
              Consequence Thread
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-amber-800">
                  {character.activeThread.title}
                </span>
                <Badge variant="outline" className="text-amber-600 border-amber-300">
                  {character.activeThread.expiresIn} actions
                </Badge>
              </div>
              <p className="text-sm text-amber-700">
                {character.activeThread.summary}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
