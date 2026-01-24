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
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 sm:hidden">
      <div className="flex items-center justify-around h-14">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const showIndicator = tab.id === 'scene' && hasActiveEncounter;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center flex-1 h-full relative transition-colors ${
                isActive
                  ? 'text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="relative">
                {tab.icon}
                {showIndicator && (
                  <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full animate-pulse" />
                )}
              </div>
              <span className="text-xs mt-0.5 font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
      {/* Safe area padding for phones with home indicator */}
      <div className="h-safe-area-inset-bottom bg-white" />
    </div>
  );
}

export default MobileTabBar;
