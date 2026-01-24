'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import type { EncounterTemplate } from '@/app/data/encounter-templates';
import { getPowerById } from '@/app/data/powers';
import { AlertTriangle, CheckCircle, XCircle, Star, Zap } from 'lucide-react';

interface EncounterChoice {
  id: string;
  text: string;
  available: boolean;
  reason?: string;
  requiredPowers?: string[];
}

interface EncounterDisplayProps {
  encounter: EncounterTemplate;
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
    <Card className="border-2 border-blue-200 bg-blue-50/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{encounter.name}</CardTitle>
          <Badge variant="outline" className="flex items-center gap-1">
            <Star className="h-3 w-3" />
            Difficulty {encounter.difficulty}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Description */}
        <div className="bg-white rounded-lg p-4 border">
          <p className="text-lg text-gray-800 leading-relaxed">
            {encounter.description}
          </p>
          {encounter.flavorText && (
            <p className="mt-3 text-sm text-gray-500 italic border-l-2 border-gray-300 pl-3">
              {encounter.flavorText}
            </p>
          )}
        </div>

        {/* Choices */}
        <div className="space-y-2">
          <h4 className="font-semibold text-gray-700">What do you do?</h4>
          <div className="grid gap-2">
            {choices.map((choice) => (
              <Button
                key={choice.id}
                variant={choice.available ? 'outline' : 'ghost'}
                className={`w-full justify-start h-auto py-3 px-4 text-left ${
                  choice.available
                    ? 'hover:bg-blue-50 hover:border-blue-300'
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
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{choice.text}</span>
                      {choice.requiredPowers && choice.requiredPowers.length > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                          <Zap className="h-3 w-3" />
                          {choice.requiredPowers
                            .map((powerId) => getPowerById(powerId)?.name || powerId)
                            .join(', ')}
                        </span>
                      )}
                    </div>
                    {!choice.available && choice.reason && (
                      <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {choice.reason}
                      </p>
                    )}
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </div>

        {isResolving && (
          <div className="flex items-center justify-center py-4">
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
