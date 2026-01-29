'use client';

import { motion, useReducedMotion } from 'framer-motion';

interface LoadingSigilProps {
  label?: string;
}

export function LoadingSigil({ label = 'Generating encounter' }: LoadingSigilProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div
      className="flex flex-col items-center gap-3"
      role="status"
      aria-label={label}
    >
      {/* Animated ring */}
      <div className="relative w-12 h-12">
        {shouldReduceMotion ? (
          /* Static indicator for reduced motion */
          <div className="w-12 h-12 rounded-full border-2 border-blue-400/60 border-t-blue-400 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-blue-400" />
          </div>
        ) : (
          <>
            {/* Outer ring — slow rotation */}
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-blue-500/20 border-t-blue-400"
              animate={{ rotate: 360 }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
            />
            {/* Inner ring — counter-rotation */}
            <motion.div
              className="absolute inset-2 rounded-full border-2 border-purple-500/20 border-b-purple-400"
              animate={{ rotate: -360 }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
            />
            {/* Center pulse dot */}
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              animate={{ scale: [1, 1.3, 1], opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <div className="w-2 h-2 rounded-full bg-blue-400" />
            </motion.div>
          </>
        )}
      </div>
      <span className="sr-only">{label}</span>
    </div>
  );
}
