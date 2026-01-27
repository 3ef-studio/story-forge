'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { getFactionById } from '@/app/data/factions';
import { ResolutionBreakdownCard } from './ResolutionBreakdownCard';
import { CheckCircle, XCircle, TrendingUp, TrendingDown, Star, Heart, Zap, Sparkles, AlertTriangle } from 'lucide-react';

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

export function OutcomeDisplay({ outcome, resolution, powerProgression, onContinue }: OutcomeDisplayProps) {
  const [showContent, setShowContent] = useState(false);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    // Stagger animations
    const timer1 = setTimeout(() => setShowContent(true), 300);
    const timer2 = setTimeout(() => setShowResults(true), 600);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  // Determine visual state: success, partial, or failure
  const isPartial = outcome.partial;
  const isSuccess = outcome.success && !isPartial;
  const isFailure = !outcome.success && !isPartial;

  // Card styles based on outcome
  const cardStyles = isSuccess
    ? 'border-green-300 bg-gradient-to-br from-green-50 to-emerald-50/50 shadow-lg shadow-green-100'
    : isPartial
    ? 'border-yellow-300 bg-gradient-to-br from-yellow-50 to-amber-50/50 shadow-lg shadow-yellow-100'
    : 'border-red-300 bg-gradient-to-br from-red-50 to-orange-50/50 shadow-lg shadow-red-100';

  return (
    <Card className={`border-2 overflow-hidden transition-all duration-500 rounded-2xl ${cardStyles}`}>
      <CardHeader className="pb-2 px-4 sm:px-6">
        <CardTitle className="flex items-center gap-3">
          {isSuccess ? (
            <div className="flex items-center gap-3 animate-bounce-in">
              <div className="relative">
                <CheckCircle className="h-8 w-8 text-green-500" />
                <Sparkles className="h-4 w-4 text-yellow-400 absolute -top-1 -right-1 animate-pulse" />
              </div>
              <span className="text-2xl font-bold text-green-700">Success!</span>
            </div>
          ) : isPartial ? (
            <div className="flex items-center gap-3 animate-scale-in">
              <div className="relative">
                <AlertTriangle className="h-8 w-8 text-yellow-500" />
              </div>
              <span className="text-2xl font-bold text-yellow-700">Partial Success</span>
            </div>
          ) : (
            <div className="flex items-center gap-3 animate-scale-in">
              <XCircle className="h-8 w-8 text-red-500" />
              <span className="text-2xl font-bold text-red-700">Failed</span>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 px-4 sm:px-6">
        {/* Section 1: Outcome Description */}
        <div
          className={`bg-white/80 backdrop-blur-sm rounded-xl p-4 sm:p-5 border shadow-sm transition-all duration-500 ${
            showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <p className="text-base sm:text-lg text-gray-800 leading-relaxed max-w-prose">
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
          <h4 className="font-semibold text-gray-700 flex items-center gap-2 text-sm uppercase tracking-wide">
            <Star className="h-4 w-4 text-yellow-500" />
            Rewards
          </h4>
          <div className="grid grid-cols-2 gap-2.5">
            {/* XP */}
            <div className="flex items-center gap-2 p-3 bg-white rounded-xl border shadow-sm">
              <Star className="h-4 w-4 text-yellow-500 flex-shrink-0" />
              <span className="text-sm text-gray-700">XP</span>
              <Badge variant="success" className="ml-auto">
                +{outcome.xpGained}
              </Badge>
            </div>

            {/* HP Change */}
            {outcome.hpChange && outcome.hpChange !== 0 && (
              <div className="flex items-center gap-2 p-3 bg-white rounded-xl border shadow-sm">
                <Heart className="h-4 w-4 text-red-500 flex-shrink-0" />
                <span className="text-sm text-gray-700">HP</span>
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
              <div className="flex items-center gap-2 p-3 bg-white rounded-xl border shadow-sm">
                <Zap className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                <span className="text-sm text-gray-700">Energy</span>
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
              <div className="flex items-center gap-2 p-3 bg-white rounded-xl border shadow-sm">
                <span className="text-sm font-medium text-green-600">$</span>
                <span className="text-sm text-gray-700">Money</span>
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
            <h4 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Faction Reputation</h4>
            <div className="grid gap-2">
              {outcome.factionChanges.map(({ factionId, change }) => {
                const faction = getFactionById(factionId);
                return (
                  <div
                    key={factionId}
                    className="flex items-center justify-between p-3 bg-white rounded-xl border shadow-sm"
                  >
                    <span className="text-sm text-gray-700 font-medium">
                      {faction?.shortName || factionId}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {change > 0 ? (
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-500" />
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
            <h4 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Attribute Growth</h4>
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
          <div className="space-y-2.5">
            <h4 className="font-semibold text-gray-700 flex items-center gap-2 text-sm uppercase tracking-wide">
              <Zap className="h-4 w-4 text-purple-500" />
              Power Used
            </h4>
            <div className="p-4 bg-white rounded-xl border shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="font-semibold text-gray-900">{powerProgression.powerName}</span>
                  <span className="text-xs text-gray-500 ml-2 capitalize">({powerProgression.powerCategory})</span>
                </div>
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
                <span className="text-purple-600 font-medium">+{powerProgression.xpGained} Power XP</span>
                {powerProgression.powerBonusApplied > 0 && (
                  <span className="text-gray-500">• Applied +{powerProgression.powerBonusApplied} bonus</span>
                )}
              </div>
              {/* XP Progress */}
              <div className="mt-2.5">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Progress to Lv.{powerProgression.levelAfter + 1}</span>
                  <span>{powerProgression.xpAfter}/{powerProgression.xpToNextLevel}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500 transition-all duration-500"
                    style={{ width: `${Math.min(100, (powerProgression.xpAfter / powerProgression.xpToNextLevel) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Continue Button */}
        <div className="pt-2 pb-1">
          <Button onClick={onContinue} className="w-full min-h-[48px] text-base font-semibold rounded-xl" size="lg">
            Continue
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
