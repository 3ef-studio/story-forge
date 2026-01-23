import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/app/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-blue-500 text-white',
        secondary: 'border-transparent bg-gray-100 text-gray-900',
        destructive: 'border-transparent bg-red-500 text-white',
        success: 'border-transparent bg-green-500 text-white',
        warning: 'border-transparent bg-yellow-500 text-white',
        outline: 'text-gray-950 border-gray-200',
        heroic: 'border-transparent bg-blue-500 text-white',
        criminal: 'border-transparent bg-red-500 text-white',
        neutral: 'border-transparent bg-gray-500 text-white',
        training: 'border-transparent bg-green-500 text-white',
        social: 'border-transparent bg-purple-500 text-white',
        hostile: 'border-transparent bg-red-600 text-white',
        suspicious: 'border-transparent bg-yellow-600 text-white',
        friendly: 'border-transparent bg-green-600 text-white',
        allied: 'border-transparent bg-blue-600 text-white',
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
