'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/app/components/ui/badge';
import { getFactionById } from '@/app/data/factions';
import { ResolutionBreakdownCard } from './ResolutionBreakdownCard';
import { CheckCircle, XCircle, TrendingUp, TrendingDown, Star, Heart, Zap, Sparkles, AlertTriangle } from 'lucide-react';
import { AnimatedCard } from '@/app/components/ui/AnimatedCard';
import { motion, useReducedMotion } from 'framer-motion';

interface OutcomeResult {
  success: boolean;
  partial?: boolean;
  description: string;
  xpGained: number;
  hpChange?: number;
  energyChange?: number;
  moneyGained?: number;
  factionChanges: { factionId: string; change: number }[];
  attributeGrowth: { attributeId: string; amount: number }[];
}

interface ResolutionData {
  outcome: 'success' | 'partial' | 'failure';
  roll: number;
  target: number;
  modifiers: { label: string; value: number }[];
  summary: string;
  isRetreat?: boolean;
}

interface PowerProgressionData {
  powerId: string;
  powerName: string;
  powerCategory: string;
  levelBefore: number;
  xpBefore: number;
  levelAfter: number;
  xpAfter: number;
  xpGained: number;
  leveledUp: boolean;
  powerBonusApplied: number;
  xpToNextLevel: number;
}

interface OutcomeDisplayProps {
  outcome: OutcomeResult;
  resolution?: ResolutionData;
  powerProgression?: PowerProgressionData;
  onContinue: () => void;
}

const POWER_CATEGORY_COLORS: Record<string, string> = {
  physical: 'text-red-400 border-red-500/30 bg-red-500/10',
  mental: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
  energy: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
  utility: 'text-green-400 border-green-500/30 bg-green-500/10',
  defensive: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10',
};

const POWER_BAR_COLORS: Record<string, string> = {
  physical: 'bg-red-500',
  mental: 'bg-purple-500',
  energy: 'bg-blue-500',
  utility: 'bg-green-500',
  defensive: 'bg-cyan-500',
};

export function OutcomeDisplay({ outcome, resolution, powerProgression, onContinue }: OutcomeDisplayProps) {
  const [showContent, setShowContent] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const timer1 = setTimeout(() => setShowContent(true), 300);
    const timer2 = setTimeout(() => setShowResults(true), 600);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  const isPartial = outcome.partial;
  const isSuccess = outcome.success && !isPartial;
  const isFailure = !outcome.success && !isPartial;

  const borderColor = isSuccess
    ? 'border-green-500/40'
    : isPartial
    ? 'border-yellow-500/40'
    : 'border-red-500/40';

  return (
    <AnimatedCard variant="panel" className={`panel-solid border-2 overflow-hidden transition-all duration-500 rounded-2xl ${borderColor}`}>
      <div className="pb-2 px-4 sm:px-6 pt-4">
        <div className="flex items-center gap-3">
          {isSuccess ? (
            <div className="flex items-center gap-3 animate-bounce-in">
              <div className="relative">
                <CheckCircle className="h-8 w-8 text-green-400" />
                <Sparkles className="h-4 w-4 text-yellow-400 absolute -top-1 -right-1 animate-pulse" />
              </div>
              <span className="text-2xl font-bold text-green-400">Success!</span>
            </div>
          ) : isPartial ? (
            <div className="flex items-center gap-3 animate-scale-in">
              <div className="relative">
                <AlertTriangle className="h-8 w-8 text-yellow-400" />
              </div>
              <span className="text-2xl font-bold text-yellow-400">Partial Success</span>
            </div>
          ) : (
            <div className="flex items-center gap-3 animate-scale-in">
              <XCircle className="h-8 w-8 text-red-400" />
              <span className="text-2xl font-bold text-red-400">Failed</span>
            </div>
          )}
        </div>
      </div>
      <div className="space-y-5 px-4 sm:px-6 pb-5">
        {/* Section 1: Outcome Description */}
        <div
          className={`bg-white/10 rounded-xl p-4 sm:p-5 border border-white/10 transition-all duration-500 ${
            showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <p className="text-base sm:text-lg text-white/90 leading-relaxed max-w-prose">
            {outcome.description}
          </p>
        </div>

        {/* Section 2: Combat Breakdown */}
        {resolution && (
          <div
            className={`transition-all duration-500 delay-100 ${
              showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            <ResolutionBreakdownCard
              outcome={resolution.outcome}
              roll={resolution.roll}
              target={resolution.target}
              modifiers={resolution.modifiers}
              summary={resolution.summary}
              isRetreat={resolution.isRetreat}
            />
          </div>
        )}

        {/* Section 3: Rewards */}
        <div
          className={`space-y-3 transition-all duration-500 delay-200 ${
            showResults ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <h4 className="font-semibold text-white/70 flex items-center gap-2 text-sm uppercase tracking-wide">
            <Star className="h-4 w-4 text-yellow-400" />
            Rewards
          </h4>
          <div className="grid grid-cols-2 gap-2.5">
            {/* XP */}
            <div className="flex items-center gap-2 p-3 bg-white/10 rounded-xl border border-white/10">
              <Star className="h-4 w-4 text-yellow-400 flex-shrink-0" />
              <span className="text-sm text-white/70">XP</span>
              <Badge variant="success" className="ml-auto">
                +{outcome.xpGained}
              </Badge>
            </div>

            {/* HP Change */}
            {outcome.hpChange && outcome.hpChange !== 0 && (
              <div className="flex items-center gap-2 p-3 bg-white/10 rounded-xl border border-white/10">
                <Heart className="h-4 w-4 text-red-400 flex-shrink-0" />
                <span className="text-sm text-white/70">HP</span>
                <Badge
                  variant={outcome.hpChange > 0 ? 'success' : 'destructive'}
                  className="ml-auto"
                >
                  {outcome.hpChange > 0 ? '+' : ''}
                  {outcome.hpChange}
                </Badge>
              </div>
            )}

            {/* Energy Change */}
            {outcome.energyChange && outcome.energyChange !== 0 && (
              <div className="flex items-center gap-2 p-3 bg-white/10 rounded-xl border border-white/10">
                <Zap className="h-4 w-4 text-yellow-400 flex-shrink-0" />
                <span className="text-sm text-white/70">Energy</span>
                <Badge
                  variant={outcome.energyChange > 0 ? 'success' : 'warning'}
                  className="ml-auto"
                >
                  {outcome.energyChange > 0 ? '+' : ''}
                  {outcome.energyChange}
                </Badge>
              </div>
            )}

            {/* Money */}
            {outcome.moneyGained && outcome.moneyGained > 0 && (
              <div className="flex items-center gap-2 p-3 bg-white/10 rounded-xl border border-white/10">
                <span className="text-sm font-medium text-green-400">$</span>
                <span className="text-sm text-white/70">Money</span>
                <Badge variant="success" className="ml-auto">
                  +${outcome.moneyGained}
                </Badge>
              </div>
            )}
          </div>
        </div>

        {/* Section 4: Faction Changes */}
        {outcome.factionChanges.length > 0 && (
          <div className="space-y-2.5">
            <h4 className="font-semibold text-white/70 text-sm uppercase tracking-wide">Faction Reputation</h4>
            <div className="grid gap-2">
              {outcome.factionChanges.map(({ factionId, change }) => {
                const faction = getFactionById(factionId);
                return (
                  <div
                    key={factionId}
                    className="flex items-center justify-between p-3 bg-white/10 rounded-xl border border-white/10"
                  >
                    <span className="text-sm text-white/80 font-medium">
                      {faction?.shortName || factionId}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {change > 0 ? (
                        <TrendingUp className="h-4 w-4 text-green-400" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-400" />
                      )}
                      <Badge variant={change > 0 ? 'success' : 'destructive'}>
                        {change > 0 ? '+' : ''}
                        {change}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Attribute Growth */}
        {outcome.attributeGrowth.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold text-white/70 text-sm uppercase tracking-wide">Attribute Growth</h4>
            <div className="flex flex-wrap gap-2">
              {outcome.attributeGrowth.map(({ attributeId, amount }) => (
                <Badge key={attributeId} variant="success" className="capitalize text-sm py-1 px-2.5">
                  {attributeId} +{amount}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Power Progression */}
        {powerProgression && (
          <motion.div
            className="space-y-2.5"
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
            animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
            transition={{ duration: shouldReduceMotion ? 0.1 : 0.35, delay: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <h4 className="font-semibold text-white/70 flex items-center gap-2 text-sm uppercase tracking-wide">
              <Zap className={`h-4 w-4 ${POWER_CATEGORY_COLORS[powerProgression.powerCategory]?.split(' ')[0] || 'text-purple-400'}`} />
              Power Used
            </h4>
            <div className={`p-4 bg-white/10 rounded-xl border ${POWER_CATEGORY_COLORS[powerProgression.powerCategory]?.split(' ').slice(1).join(' ') || 'border-white/10'}`}>
              <div className="flex items-center justify-between mb-2">
                <motion.div
                  initial={shouldReduceMotion ? undefined : { scale: 1 }}
                  animate={shouldReduceMotion ? undefined : { scale: [1, 1.04, 1] }}
                  transition={{ duration: 0.6, delay: 0.6, ease: 'easeInOut' }}
                >
                  <span className="font-semibold text-white/90">{powerProgression.powerName}</span>
                  <span className={`text-xs ml-2 capitalize ${POWER_CATEGORY_COLORS[powerProgression.powerCategory]?.split(' ')[0] || 'text-white/50'}`}>
                    ({powerProgression.powerCategory})
                  </span>
                </motion.div>
                <div className="flex items-center gap-2">
                  {powerProgression.leveledUp ? (
                    <Badge variant="success" className="animate-pulse">
                      Level Up! Lv.{powerProgression.levelAfter}
                    </Badge>
                  ) : (
                    <Badge variant="outline">Lv.{powerProgression.levelAfter}</Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className={`font-medium ${POWER_CATEGORY_COLORS[powerProgression.powerCategory]?.split(' ')[0] || 'text-purple-300'}`}>
                  +{powerProgression.xpGained} Power XP
                </span>
                {powerProgression.powerBonusApplied > 0 && (
                  <span className="text-white/50">• Applied +{powerProgression.powerBonusApplied} bonus</span>
                )}
              </div>
              {/* XP Progress */}
              <div className="mt-2.5">
                <div className="flex justify-between text-xs text-white/50 mb-1">
                  <span>Progress to Lv.{powerProgression.levelAfter + 1}</span>
                  <span>{powerProgression.xpAfter}/{powerProgression.xpToNextLevel}</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full ${POWER_BAR_COLORS[powerProgression.powerCategory] || 'bg-purple-500'}`}
                    initial={{ width: '0%' }}
                    animate={{ width: `${Math.min(100, (powerProgression.xpAfter / powerProgression.xpToNextLevel) * 100)}%` }}
                    transition={{ duration: shouldReduceMotion ? 0.1 : 0.8, delay: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Continue Button */}
        <div className="pt-2 pb-1">
          <button
            onClick={onContinue}
            className="w-full min-h-[48px] text-base font-semibold rounded-xl bg-blue-500 hover:bg-blue-600 text-white transition-colors"
          >
            Continue
          </button>
        </div>
      </div>
    </AnimatedCard>
  );
}
