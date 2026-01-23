import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/app/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-blue-600 text-white',
        secondary: 'border-transparent bg-slate-100 text-slate-800',
        destructive: 'border-transparent bg-red-600 text-white',
        success: 'border-transparent bg-green-600 text-white',
        warning: 'border-transparent bg-amber-500 text-white',
        outline: 'text-slate-700 border-slate-300 bg-white',
        heroic: 'border-transparent bg-blue-600 text-white',
        criminal: 'border-transparent bg-red-600 text-white',
        neutral: 'border-transparent bg-slate-500 text-white',
        training: 'border-transparent bg-green-600 text-white',
        social: 'border-transparent bg-purple-600 text-white',
        hostile: 'border-transparent bg-red-700 text-white',
        suspicious: 'border-transparent bg-amber-600 text-white',
        friendly: 'border-transparent bg-green-600 text-white',
        allied: 'border-transparent bg-blue-700 text-white',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
