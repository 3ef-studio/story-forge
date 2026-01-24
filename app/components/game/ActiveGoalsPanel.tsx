'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';

export type GoalRecord = {
  id: string;
  goalType: string;
  title: string;
  description: string;
  targetValue: number;
  currentProgress: number;
  xpReward: number;
  isActive: boolean;
  metadata: {
    actionId?: string;
    category?: string;
    location?: string;
    factionId?: string;
    powerId?: string;
  } | null;
};

type ActiveGoalsPanelProps = {
  goals: GoalRecord[];
  completedGoals?: GoalRecord[];
};

export function ActiveGoalsPanel({ goals, completedGoals = [] }: ActiveGoalsPanelProps) {
  return (
    <Card className="bg-white border-gray-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <span className="text-yellow-500">&#9733;</span>
          Active Goals
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {goals.length === 0 ? (
          <p className="text-sm text-gray-500">No active goals</p>
        ) : (
          goals.map((goal) => (
            <GoalItem key={goal.id} goal={goal} />
          ))
        )}

        {completedGoals.length > 0 && (
          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs text-green-600 font-medium mb-2">Just Completed!</p>
            {completedGoals.map((goal) => (
              <div
                key={goal.id}
                className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-3 py-2 rounded-md"
              >
                <span>&#10003;</span>
                <span>{goal.title}</span>
                <span className="ml-auto text-xs">+{goal.xpReward} XP</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function GoalItem({ goal }: { goal: GoalRecord }) {
  const progress = Math.min(goal.currentProgress, goal.targetValue);
  const percentage = Math.round((progress / goal.targetValue) * 100);

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-start">
        <div>
          <h4 className="text-sm font-medium text-gray-900">{goal.title}</h4>
          <p className="text-xs text-gray-500">{goal.description}</p>
        </div>
        <span className="text-xs text-gray-400 whitespace-nowrap ml-2">
          +{goal.xpReward} XP
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-300"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="text-xs text-gray-600 whitespace-nowrap">
          {progress}/{goal.targetValue}
        </span>
      </div>
    </div>
  );
}

export default ActiveGoalsPanel;
