'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';

interface AnimatedChoiceCardProps {
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
  delay?: number;
}

export function AnimatedChoiceCard({
  children,
  className = '',
  disabled = false,
  onClick,
  delay = 0,
}: AnimatedChoiceCardProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.button
      type="button"
      className={className}
      disabled={disabled}
      onClick={onClick}
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
      animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
      transition={{
        duration: shouldReduceMotion ? 0.1 : 0.25,
        delay,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      whileHover={
        disabled || shouldReduceMotion
          ? undefined
          : {
              y: -2,
              boxShadow: '0 0 16px rgba(96, 165, 250, 0.2)',
              transition: { duration: 0.15 },
            }
      }
      whileTap={
        disabled || shouldReduceMotion
          ? undefined
          : {
              scale: 0.98,
              transition: { duration: 0.08 },
            }
      }
    >
      {children}
    </motion.button>
  );
}
