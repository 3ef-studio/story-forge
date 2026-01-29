'use client';

import { motion, type HTMLMotionProps } from 'framer-motion';
import { useReducedMotion } from 'framer-motion';

type AnimatedCardVariant = 'panel' | 'toast' | 'event';

interface AnimatedCardProps extends HTMLMotionProps<'div'> {
  variant?: AnimatedCardVariant;
  delay?: number;
}

const variantConfig: Record<AnimatedCardVariant, {
  initial: Record<string, number>;
  animate: Record<string, number>;
  exit: Record<string, number>;
  duration: number;
}> = {
  panel: {
    initial: { opacity: 0, y: 8, scale: 0.985 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: 6 },
    duration: 0.35,
  },
  toast: {
    initial: { opacity: 0, y: -12, scale: 0.96 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -8 },
    duration: 0.3,
  },
  event: {
    initial: { opacity: 0, x: -8 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 8 },
    duration: 0.25,
  },
};

export function AnimatedCard({
  variant = 'panel',
  delay = 0,
  children,
  className,
  ...rest
}: AnimatedCardProps) {
  const shouldReduceMotion = useReducedMotion();
  const config = variantConfig[variant];

  const initial = shouldReduceMotion
    ? { opacity: 0 }
    : config.initial;

  const animate = shouldReduceMotion
    ? { opacity: 1 }
    : config.animate;

  const exit = shouldReduceMotion
    ? { opacity: 0 }
    : config.exit;

  return (
    <motion.div
      initial={initial}
      animate={animate}
      exit={exit}
      transition={{
        duration: shouldReduceMotion ? 0.15 : config.duration,
        delay,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
