'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { getFactionById } from '@/app/data/factions';
import { CheckCircle, XCircle, TrendingUp, TrendingDown, Star, Heart, Zap } from 'lucide-react';

interface OutcomeResult {
  success: boolean;
  description: string;
  xpGained: number;
  hpChange?: number;
  energyChange?: number;
  moneyGained?: number;
  factionChanges: { factionId: string; change: number }[];
  attributeGrowth: { attributeId: string; amount: number }[];
}

interface OutcomeDisplayProps {
  outcome: OutcomeResult;
  onContinue: () => void;
}

export function OutcomeDisplay({ outcome, onContinue }: OutcomeDisplayProps) {
  return (
    <Card
      className={`border-2 ${
        outcome.success
          ? 'border-green-200 bg-green-50/50'
          : 'border-red-200 bg-red-50/50'
      }`}
    >
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          {outcome.success ? (
            <>
              <CheckCircle className="h-6 w-6 text-green-500" />
              <span className="text-green-700">Success!</span>
            </>
          ) : (
            <>
              <XCircle className="h-6 w-6 text-red-500" />
              <span className="text-red-700">Failed</span>
            </>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Outcome Description */}
        <div className="bg-white rounded-lg p-4 border">
          <p className="text-lg text-gray-800 leading-relaxed">
            {outcome.description}
          </p>
        </div>

        {/* Rewards/Penalties */}
        <div className="space-y-2">
          <h4 className="font-semibold text-gray-700">Results</h4>
          <div className="grid grid-cols-2 gap-2">
            {/* XP */}
            <div className="flex items-center gap-2 p-2 bg-white rounded border">
              <Star className="h-4 w-4 text-yellow-500" />
              <span className="text-sm">XP</span>
              <Badge variant="success" className="ml-auto">
                +{outcome.xpGained}
              </Badge>
            </div>

            {/* HP Change */}
            {outcome.hpChange && outcome.hpChange !== 0 && (
              <div className="flex items-center gap-2 p-2 bg-white rounded border">
                <Heart className="h-4 w-4 text-red-500" />
                <span className="text-sm">HP</span>
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
              <div className="flex items-center gap-2 p-2 bg-white rounded border">
                <Zap className="h-4 w-4 text-yellow-500" />
                <span className="text-sm">Energy</span>
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
              <div className="flex items-center gap-2 p-2 bg-white rounded border">
                <span className="text-sm">$</span>
                <span className="text-sm">Money</span>
                <Badge variant="success" className="ml-auto">
                  +${outcome.moneyGained}
                </Badge>
              </div>
            )}
          </div>
        </div>

        {/* Faction Changes */}
        {outcome.factionChanges.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold text-gray-700">Faction Reputation</h4>
            <div className="grid gap-1">
              {outcome.factionChanges.map(({ factionId, change }) => {
                const faction = getFactionById(factionId);
                return (
                  <div
                    key={factionId}
                    className="flex items-center justify-between p-2 bg-white rounded border"
                  >
                    <span className="text-sm text-gray-600">
                      {faction?.shortName || factionId}
                    </span>
                    <div className="flex items-center gap-1">
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
            <h4 className="font-semibold text-gray-700">Attribute Growth</h4>
            <div className="flex flex-wrap gap-2">
              {outcome.attributeGrowth.map(({ attributeId, amount }) => (
                <Badge key={attributeId} variant="success" className="capitalize">
                  {attributeId} +{amount}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Continue Button */}
        <Button onClick={onContinue} className="w-full" size="lg">
          Continue
        </Button>
      </CardContent>
    </Card>
  );
}
