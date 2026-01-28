'use client';

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
    <div className="panel-glass rounded-2xl">
      <div className="p-4 pb-3">
        <h3 className="text-lg font-semibold text-white/90 flex items-center gap-2">
          <span className="text-yellow-400">&#9733;</span>
          Active Goals
        </h3>
      </div>
      <div className="px-4 pb-4 space-y-4">
        {goals.length === 0 ? (
          <p className="text-sm text-white/50">No active goals</p>
        ) : (
          goals.map((goal) => (
            <GoalItem key={goal.id} goal={goal} />
          ))
        )}

        {completedGoals.length > 0 && (
          <div className="pt-2 border-t border-white/10">
            <p className="text-xs text-green-400 font-medium mb-2">Just Completed!</p>
            {completedGoals.map((goal) => (
              <div
                key={goal.id}
                className="flex items-center gap-2 text-sm text-green-300 bg-green-500/15 px-3 py-2 rounded-md border border-green-500/20"
              >
                <span>&#10003;</span>
                <span>{goal.title}</span>
                <span className="ml-auto text-xs">+{goal.xpReward} XP</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function GoalItem({ goal }: { goal: GoalRecord }) {
  const progress = Math.min(goal.currentProgress, goal.targetValue);
  const percentage = Math.round((progress / goal.targetValue) * 100);

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-start">
        <div>
          <h4 className="text-sm font-medium text-white/90">{goal.title}</h4>
          <p className="text-xs text-white/50">{goal.description}</p>
        </div>
        <span className="text-xs text-white/40 whitespace-nowrap ml-2">
          +{goal.xpReward} XP
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-400 rounded-full transition-all duration-300"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="text-xs text-white/60 whitespace-nowrap">
          {progress}/{goal.targetValue}
        </span>
      </div>
    </div>
  );
}

export default ActiveGoalsPanel;
