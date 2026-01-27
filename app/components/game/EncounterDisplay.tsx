'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import type { EncounterTemplate } from '@/app/data/encounter-templates';
import { getPowerById } from '@/app/data/powers';
import { AlertTriangle, CheckCircle, XCircle, Star, Zap, LogOut, Link } from 'lucide-react';
import { ChoicePreviewChips } from './ChoicePreviewChips';
import type { ResolutionPreview } from '@/app/lib/game-logic/combat/types';

interface EncounterChoice {
  id: string;
  text: string;
  available: boolean;
  reason?: string;
  requiredPowers?: string[];
  preview?: ResolutionPreview;
}

type EncounterWithThread = EncounterTemplate & {
  threadId?: string;
  threadTitle?: string;
};

interface EncounterDisplayProps {
  encounter: EncounterWithThread;
  choices: EncounterChoice[];
  onSelectChoice: (choiceId: string) => void;
  isResolving?: boolean;
}

export function EncounterDisplay({
  encounter,
  choices,
  onSelectChoice,
  isResolving = false,
}: EncounterDisplayProps) {
  return (
    <Card className="border-2 border-blue-200 bg-blue-50/50 rounded-2xl shadow-sm">
      <CardHeader className="pb-2 px-4 sm:px-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-xl sm:text-lg font-bold">{encounter.name}</CardTitle>
          <div className="flex items-center gap-2">
            {encounter.threadTitle && (
              <Badge variant="suspicious" className="flex items-center gap-1">
                <Link className="h-3 w-3" />
                {encounter.threadTitle}
              </Badge>
            )}
            <Badge variant="outline" className="flex items-center gap-1">
              <Star className="h-3 w-3" />
              Difficulty {encounter.difficulty}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 px-4 sm:px-6">
        {/* Main Description */}
        <div className="bg-white rounded-xl p-4 sm:p-5 border shadow-sm">
          <p className="text-base sm:text-lg text-gray-800 leading-relaxed max-w-prose">
            {encounter.description}
          </p>
          {encounter.flavorText && (
            <p className="mt-3 text-sm text-gray-500 italic border-l-2 border-gray-300 pl-3">
              {encounter.flavorText}
            </p>
          )}
        </div>

        {/* Choices */}
        <div className="space-y-3">
          <h4 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">What do you do?</h4>
          <div className="grid gap-3">
            {choices.map((choice) => (
              <Button
                key={choice.id}
                variant={choice.available ? 'outline' : 'ghost'}
                className={`w-full justify-start h-auto py-4 px-4 text-left rounded-xl min-h-[56px] ${
                  choice.available
                    ? 'hover:bg-blue-50 hover:border-blue-300 active:bg-blue-100 border-gray-300 shadow-sm'
                    : 'opacity-50 cursor-not-allowed'
                }`}
                onClick={() => choice.available && onSelectChoice(choice.id)}
                disabled={!choice.available || isResolving}
              >
                <div className="flex items-start gap-3 w-full">
                  <div className="mt-0.5">
                    {choice.available ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900">{choice.text}</span>
                      {choice.requiredPowers && choice.requiredPowers.length > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                          <Zap className="h-3 w-3" />
                          {choice.requiredPowers
                            .map((powerId) => getPowerById(powerId)?.name || powerId)
                            .join(', ')}
                        </span>
                      )}
                    </div>
                    {/* Preview chips for available choices */}
                    {choice.available && choice.preview && (
                      <ChoicePreviewChips
                        riskTier={choice.preview.riskTier}
                        estimatedChance={choice.preview.estimatedChance}
                        displayChips={choice.preview.displayChips}
                      />
                    )}
                    {!choice.available && choice.reason && (
                      <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {choice.reason}
                      </p>
                    )}
                  </div>
                </div>
              </Button>
            ))}
          </div>

          {/* Retreat Option */}
          <div className="pt-3 border-t border-gray-200 mt-4">
            <Button
              variant="ghost"
              className="w-full justify-start h-auto py-3.5 px-4 text-left text-gray-600 hover:bg-gray-100 hover:text-gray-800 rounded-xl min-h-[48px]"
              onClick={() => onSelectChoice('retreat')}
              disabled={isResolving}
            >
              <div className="flex items-center gap-3 w-full">
                <LogOut className="h-5 w-5 text-gray-400" />
                <div>
                  <span className="font-semibold">Retreat</span>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Attempt to escape. Success depends on agility and mobility powers.
                  </p>
                </div>
              </div>
            </Button>
          </div>
        </div>

        {isResolving && (
          <div className="flex items-center justify-center py-6">
            <div className="flex items-center gap-2 text-gray-500">
              <svg
                className="h-5 w-5 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span>Resolving...</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
