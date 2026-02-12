'use client';

import { motion } from 'framer-motion';
import { Swords, BookOpen, ScrollText } from 'lucide-react';
import { useReducedMotion } from '@/app/hooks/useReducedMotion';

export type MobileTab = 'scene' | 'actions' | 'log';

interface MobileTabBarProps {
  activeTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
  hasActiveEncounter?: boolean;
}

const tabs: { id: MobileTab; label: string; icon: React.ReactNode }[] = [
  {
    id: 'scene',
    label: 'Scene',
    icon: <BookOpen className="h-5 w-5" />,
  },
  {
    id: 'actions',
    label: 'Actions',
    icon: <Swords className="h-5 w-5" />,
  },
  {
    id: 'log',
    label: 'Log',
    icon: <ScrollText className="h-5 w-5" />,
  },
];

export function MobileTabBar({ activeTab, onTabChange, hasActiveEncounter }: MobileTabBarProps) {
  const prefersReducedMotion = useReducedMotion();
  const activeIndex = tabs.findIndex((t) => t.id === activeTab);

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-950/95 border-t border-white/10 z-50 sm:hidden backdrop-blur-md">
      <div className="flex items-center justify-around h-16 relative">
        {/* Animated pill indicator */}
        <motion.div
          className="absolute top-1 h-14 bg-blue-500/10 border border-blue-500/20 rounded-xl"
          initial={false}
          animate={{
            x: `calc(${activeIndex * 100}% + ${activeIndex * 0}px)`,
            width: `${100 / tabs.length}%`,
          }}
          transition={
            prefersReducedMotion
              ? { duration: 0 }
              : { type: 'spring', stiffness: 500, damping: 35 }
          }
          style={{ left: 0 }}
        />

        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const showIndicator = tab.id === 'scene' && hasActiveEncounter;

          return (
            <motion.button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center flex-1 h-full relative z-10 min-w-[64px] ${
                isActive
                  ? 'text-blue-400'
                  : 'text-white/40 active:text-white/60'
              }`}
              whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
              transition={{ duration: 0.1 }}
            >
              <motion.div
                className="relative"
                animate={isActive && !prefersReducedMotion ? { y: -2 } : { y: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              >
                {tab.icon}
                {showIndicator && (
                  <span className="absolute -top-1 -right-1 h-2.5 w-2.5 bg-red-500 rounded-full animate-pulse border-2 border-gray-950" />
                )}
              </motion.div>
              <motion.span
                className={`text-[11px] mt-1 ${isActive ? 'font-semibold' : 'font-medium'}`}
                animate={isActive && !prefersReducedMotion ? { scale: 1.05 } : { scale: 1 }}
                transition={{ duration: 0.15 }}
              >
                {tab.label}
              </motion.span>
            </motion.button>
          );
        })}
      </div>
      {/* Safe area padding for phones with home indicator */}
      <div className="pb-safe bg-gray-950/95" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }} />
    </div>
  );
}

export default MobileTabBar;
