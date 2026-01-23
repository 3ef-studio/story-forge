'use client';

import * as React from 'react';
import { cn } from '@/app/lib/utils';

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  variant?: 'default' | 'hp' | 'energy' | 'xp';
  showLabel?: boolean;
  label?: string;
}

const variantStyles = {
  default: 'bg-blue-500',
  hp: 'bg-red-500',
  energy: 'bg-yellow-500',
  xp: 'bg-green-500',
};

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value, max = 100, variant = 'default', showLabel = false, label, ...props }, ref) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

    return (
      <div className={cn('w-full', className)} {...props} ref={ref}>
        {(showLabel || label) && (
          <div className="flex justify-between mb-1 text-sm">
            <span className="text-gray-600">{label}</span>
            <span className="text-gray-500">
              {value}/{max}
            </span>
          </div>
        )}
        <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200">
          <div
            className={cn(
              'h-full transition-all duration-300 ease-in-out',
              variantStyles[variant]
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  }
);
Progress.displayName = 'Progress';

export { Progress };
