'use client';

import { useState } from 'react';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';

export type GoalChoice = {
  id: string;
  titleTemplate: string;
  descriptionTemplate: string;
  targetValue: number;
  xpReward: number;
};

type GoalChoiceModalProps = {
  choices: GoalChoice[];
  onAccept: (goalTemplateId: string) => Promise<void>;
  onClose?: () => void;
};

export function GoalChoiceModal({ choices, onAccept, onClose }: GoalChoiceModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleAccept = async (goalId: string) => {
    setIsLoading(true);
    setSelectedId(goalId);
    try {
      await onAccept(goalId);
    } finally {
      setIsLoading(false);
      setSelectedId(null);
    }
  };

  if (choices.length === 0) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-lg bg-white shadow-xl">
        <CardHeader className="border-b border-gray-100">
          <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <span className="text-yellow-500">&#9733;</span>
            Choose Your Next Goal
          </CardTitle>
          <p className="text-sm text-gray-500">
            Select a new objective to work towards
          </p>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          {choices.map((choice) => (
            <div
              key={choice.id}
              className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50/50 transition-colors"
            >
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-medium text-gray-900">{choice.titleTemplate}</h4>
                <span className="text-xs text-green-600 font-medium">
                  +{choice.xpReward} XP
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-3">{choice.descriptionTemplate}</p>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-400">
                  Target: {choice.targetValue}
                </span>
                <Button
                  size="sm"
                  onClick={() => handleAccept(choice.id)}
                  disabled={isLoading}
                  isLoading={isLoading && selectedId === choice.id}
                >
                  Accept
                </Button>
              </div>
            </div>
          ))}

          {onClose && (
            <div className="pt-2 border-t border-gray-100">
              <Button
                variant="ghost"
                onClick={onClose}
                disabled={isLoading}
                className="w-full"
              >
                Decide Later
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default GoalChoiceModal;
