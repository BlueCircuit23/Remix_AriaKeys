import React from 'react';
import { TabType } from '../types';

interface BottomNavProps {
  currentTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onTabChange }) => {
  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'home', label: 'Home', icon: 'cottage' },
    { id: 'play', label: 'Play', icon: 'piano' },
    { id: 'library', label: 'Library', icon: 'queue_music' },
    { id: 'stats', label: 'Stats', icon: 'bar_chart_4_bars' },
  ];

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 pb-safe bg-[#0b0e13]/90 backdrop-blur-xl border-t border-[#232e42]/60 shadow-[0_-4px_24px_rgba(0,0,0,0.6)]">
      <div className="flex items-center justify-around h-20 px-2 max-w-md mx-auto">
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`group relative flex flex-col items-center justify-center min-w-[64px] min-h-[48px] py-1 transition-all select-none ${
                isActive ? 'text-[#00d2ff] font-semibold' : 'text-[#bbc9cf] hover:text-[#e1e2ea]'
              }`}
              type="button"
            >
              <div
                className={`flex items-center justify-center w-10 h-7 rounded-full transition-all duration-300 ${
                  isActive
                    ? 'bg-[#00d2ff]/20 shadow-[0_0_16px_rgba(0,210,255,0.45)] text-[#00d2ff]'
                    : 'group-hover:bg-[#1d2025]'
                }`}
              >
                <span className="material-symbols-outlined text-[22px] leading-none">
                  {tab.icon}
                </span>
              </div>
              <span className="font-headline text-[12px] tracking-tight mt-1">
                {tab.label}
              </span>
              {isActive && (
                <span className="absolute bottom-1 w-5 h-0.5 rounded-full bg-[#00d2ff] shadow-[0_0_8px_rgba(0,210,255,0.85)] animate-pulse" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
