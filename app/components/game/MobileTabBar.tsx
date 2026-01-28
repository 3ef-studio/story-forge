'use client';

import { Swords, BookOpen, ScrollText } from 'lucide-react';

export type MobileTab = 'scene' | 'actions' | 'log';

interface MobileTabBarProps {
  activeTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
  hasActiveEncounter?: boolean;
}

export function MobileTabBar({ activeTab, onTabChange, hasActiveEncounter }: MobileTabBarProps) {
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

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-950/95 border-t border-white/10 z-50 sm:hidden backdrop-blur-md">
      <div className="flex items-center justify-around h-16">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const showIndicator = tab.id === 'scene' && hasActiveEncounter;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center flex-1 h-full relative transition-colors min-w-[64px] ${
                isActive
                  ? 'text-blue-400'
                  : 'text-white/40 active:text-white/60'
              }`}
            >
              <div className="relative">
                {tab.icon}
                {showIndicator && (
                  <span className="absolute -top-1 -right-1 h-2.5 w-2.5 bg-red-500 rounded-full animate-pulse border-2 border-gray-950" />
                )}
              </div>
              <span className={`text-[11px] mt-1 ${isActive ? 'font-semibold' : 'font-medium'}`}>{tab.label}</span>
            </button>
          );
        })}
      </div>
      {/* Safe area padding for phones with home indicator */}
      <div className="pb-safe bg-gray-950/95" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }} />
    </div>
  );
}

export default MobileTabBar;
