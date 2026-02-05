'use client';

import { useState, useEffect } from 'react';
import { Progress } from '@/app/components/ui/progress';
import { Badge } from '@/app/components/ui/badge';
import { getOriginById } from '@/app/data/origins';
import { getPowerById, calculateXPForLevel } from '@/app/data/powers';
import { getFactionById } from '@/app/data/factions';
import { getFactionState, getFactionStateLabel, getFactionStateColor, type FactionState } from '@/app/lib/world/faction-state';
import { getAttributeById } from '@/app/data/attributes';
import { Heart, Zap, Star, Shield, Brain, Eye, Footprints, Sparkles, AlertTriangle, ChevronDown, Swords } from 'lucide-react';

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
    nextEnergyRegenAt?: string;
    energyRegenTickAmount?: number;
    leverage?: { control: number; stability: number; position: number };
    heat?: number;
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
    rival?: {
      id: string;
      name: string;
      role: string;
      personality: string;
      personalityLabel: string;
      personalityDescription: string;
      level: number;
      hostility: number;
      notoriety: number;
      lastEncounterAt: string | null;
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
      <span className="text-base font-semibold flex items-center gap-2 text-white/90">
        {icon}
        {title}
      </span>
      <ChevronDown
        className={`h-4 w-4 text-white/40 transition-transform duration-200 ${
          open ? 'rotate-180' : ''
        }`}
      />
    </button>
  );
}

export function CharacterSheet({ character }: CharacterSheetProps) {
  const origin = getOriginById(character.originId);

  // Energy regen countdown
  const [regenCountdown, setRegenCountdown] = useState('');
  const isEnergyFull = character.currentEnergy >= character.maxEnergy;

  useEffect(() => {
    if (!character.nextEnergyRegenAt || isEnergyFull) {
      setRegenCountdown('');
      return;
    }

    const targetTime = new Date(character.nextEnergyRegenAt).getTime();

    function update() {
      const remaining = targetTime - Date.now();
      if (remaining <= 0) {
        setRegenCountdown('soon');
        return;
      }
      const hours = Math.floor(remaining / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
      setRegenCountdown(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    }

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [character.nextEnergyRegenAt, isEnergyFull]);

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
      <div className="panel-glass overflow-hidden rounded-2xl">
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
        <div className="space-y-3 p-4">
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
          {regenCountdown && (
            <div className="flex items-center justify-between text-xs px-1 -mt-1.5">
              <span className="text-white/40">Next energy in</span>
              <span className="text-yellow-400 font-mono">
                {regenCountdown === 'soon' ? 'any moment' : regenCountdown}
                {character.energyRegenTickAmount ? ` (+${character.energyRegenTickAmount})` : ''}
              </span>
            </div>
          )}

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
            <span className="text-white/60 flex items-center gap-1">
              <span className="text-green-400 font-semibold">$</span>
              Money
            </span>
            <span className="font-bold text-green-400 text-base">${character.money}</span>
          </div>

          {/* Leverage */}
          {character.leverage && (character.leverage.control > 0 || character.leverage.stability > 0 || character.leverage.position > 0) && (
            <div className="flex items-center justify-between text-xs pt-2 px-1 border-t border-white/10 mt-2">
              <span className="text-white/50 font-medium">Leverage</span>
              <div className="flex gap-2">
                {character.leverage.control > 0 && (
                  <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    Ctrl {character.leverage.control}
                  </span>
                )}
                {character.leverage.stability > 0 && (
                  <span className="px-1.5 py-0.5 rounded bg-green-500/20 text-green-300 border border-green-500/30">
                    Stab {character.leverage.stability}
                  </span>
                )}
                {character.leverage.position > 0 && (
                  <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Pos {character.leverage.position}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Heat */}
          {character.heat !== undefined && character.heat > 0 && (
            <div className="flex items-center justify-between text-xs pt-2 px-1 border-t border-white/10 mt-2">
              <span className="text-white/50 font-medium">Heat</span>
              <span className={`px-2 py-0.5 rounded font-medium ${
                character.heat >= 3
                  ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                  : 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
              }`}>
                {character.heat}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Powers (shown first) */}
      <div className="panel-glass rounded-2xl overflow-hidden">
        <SectionHeader
          title="Powers"
          icon={<Zap className="h-5 w-5 text-purple-400" />}
          open={powersOpen}
          onToggle={() => setPowersOpen(!powersOpen)}
        />
        {powersOpen && (
          <div className="px-4 pb-4">
            {character.powers.length === 0 ? (
              <p className="text-sm text-white/50">No powers unlocked yet</p>
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
                      className="p-3 bg-white/5 rounded-xl border border-white/10"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-semibold text-sm text-white/90">
                            {powerData?.name || power.powerId}
                          </span>
                          <p className="text-xs text-white/50">
                            {powerData?.category}
                          </p>
                        </div>
                        <Badge variant="outline" className="border-white/20 text-black/70">Lv. {power.level}</Badge>
                      </div>
                      {/* XP Progress Bar */}
                      {!isMaxLevel && (
                        <div className="mt-2">
                          <div className="flex justify-between text-xs text-white/50 mb-0.5">
                            <span>XP</span>
                            <span>{power.xp}/{xpToNext}</span>
                          </div>
                          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-purple-400 transition-all duration-300"
                              style={{ width: `${xpPercent}%` }}
                            />
                          </div>
                        </div>
                      )}
                      {isMaxLevel && (
                        <div className="mt-1.5 text-xs text-purple-400 font-semibold">MAX LEVEL</div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Attributes */}
      <div className="panel-glass rounded-2xl overflow-hidden">
        <SectionHeader
          title="Attributes"
          icon={<Star className="h-5 w-5 text-yellow-400" />}
          open={attributesOpen}
          onToggle={() => setAttributesOpen(!attributesOpen)}
        />
        {attributesOpen && (
          <div className="px-4 pb-4">
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(character.attributes)
                .filter(([id]) => !['reputation', 'notoriety'].includes(id))
                .map(([id, value]) => {
                  const attr = getAttributeById(id);
                  return (
                    <div
                      key={id}
                      className="flex items-center justify-between p-2.5 bg-white/5 rounded-xl border border-white/10"
                    >
                      <span className="flex items-center gap-1.5 text-xs text-white/50 capitalize">
                        {attributeIcons[id]}
                        {attr?.name || id}
                      </span>
                      <span className="font-bold text-lg text-white">{value}</span>
                    </div>
                  );
                })}
            </div>

            {/* Reputation & Notoriety */}
            <div className="mt-3 pt-3 border-t border-white/10 grid grid-cols-2 gap-2">
              <div className="flex justify-between items-center p-2.5 bg-blue-500/15 rounded-xl border border-blue-500/20">
                <span className="text-xs text-blue-300">Reputation</span>
                <span className="font-bold text-lg text-blue-300">
                  {character.attributes.reputation || 0}
                </span>
              </div>
              <div className="flex justify-between items-center p-2.5 bg-red-500/15 rounded-xl border border-red-500/20">
                <span className="text-xs text-red-300">Notoriety</span>
                <span className="font-bold text-lg text-red-300">
                  {character.attributes.notoriety || 0}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Factions */}
      <div className="panel-glass rounded-2xl overflow-hidden">
        <SectionHeader
          title="Factions"
          icon={<span className="text-base">🏛</span>}
          open={factionsOpen}
          onToggle={() => setFactionsOpen(!factionsOpen)}
        />
        {factionsOpen && (
          <div className="px-4 pb-4">
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
                      <span className="text-sm text-white/80 font-medium">
                        {faction.shortName}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-white/50">
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
          </div>
        )}
      </div>

      {/* Active Consequence Thread */}
      {character.activeThread && (
        <div className="panel-solid rounded-2xl p-4">
          <h3 className="text-base font-semibold flex items-center gap-2 text-amber-400 mb-3">
            <AlertTriangle className="h-5 w-5" />
            Consequence Thread
          </h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-amber-300">
                {character.activeThread.title}
              </span>
              <Badge variant="outline" className="text-amber-400 border-amber-500/50">
                {character.activeThread.expiresIn} actions
              </Badge>
            </div>
            <p className="text-sm text-white/70">
              {character.activeThread.summary}
            </p>
          </div>
        </div>
      )}

      {/* Rival */}
      {character.rival && (
        <div className="panel-glass rounded-2xl overflow-hidden">
          <div className="px-4 py-3 flex items-center justify-between">
            <span className="text-base font-semibold flex items-center gap-2 text-red-400">
              <Swords className="h-5 w-5" />
              Nemesis
            </span>
            <Badge
              variant={character.rival.role === 'hero' ? 'friendly' : 'hostile'}
              className="text-xs"
            >
              {character.rival.role === 'hero' ? 'Hero' : 'Villain'}
            </Badge>
          </div>
          <div className="px-4 pb-4 space-y-3">
            <div>
              <div className="font-bold text-white text-lg">{character.rival.name}</div>
              <div className="text-xs text-white/50">
                {character.rival.personalityLabel} — {character.rival.personalityDescription}
              </div>
            </div>

            {/* Hostility bar */}
            <div>
              <div className="flex justify-between text-xs text-white/50 mb-1">
                <span>Hostility</span>
                <span>{character.rival.hostility}/100</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-500 transition-all duration-300"
                  style={{ width: `${character.rival.hostility}%` }}
                />
              </div>
            </div>

            {/* Notoriety bar */}
            <div>
              <div className="flex justify-between text-xs text-white/50 mb-1">
                <span>Notoriety</span>
                <span>{character.rival.notoriety}/100</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500 transition-all duration-300"
                  style={{ width: `${character.rival.notoriety}%` }}
                />
              </div>
            </div>

            {/* Last seen */}
            {character.rival.lastEncounterAt && (
              <div className="text-xs text-white/40">
                Last seen: {new Date(character.rival.lastEncounterAt).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
