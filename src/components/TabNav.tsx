import {
  Mic,
  CalendarDays,
  StickyNote,
  FileClock,
  BarChart3,
} from 'lucide-react';
import { tabs } from '@/data/mock';
import { useWorkbenchStore } from '@/store/useWorkbenchStore';
import type { TabKey } from '@/types';
import { cn } from '@/lib/utils';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Mic,
  CalendarDays,
  StickyNote,
  FileClock,
  BarChart3,
};

export default function TabNav() {
  const { activeTab, setActiveTab } = useWorkbenchStore();

  return (
    <div
      className="flex items-center gap-1 p-1 bg-cream-100 rounded-2xl shadow-soft mb-6 animate-slide-up overflow-x-auto"
      style={{ animationDelay: '0.2s' }}
    >
      {tabs.map((tab) => {
        const Icon = iconMap[tab.icon];
        const isActive = activeTab === tab.key;

        return (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as TabKey)}
            className={cn(
              'flex items-center gap-1.5 px-2 md:px-4 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-medium transition-all duration-200 flex-1 justify-center whitespace-nowrap',
              isActive
                ? 'bg-white text-cream-800 shadow-sm'
                : 'text-cream-600 hover:text-cream-800 hover:bg-cream-50'
            )}
          >
            {Icon && <Icon className={cn('w-4 h-4', isActive ? 'text-cream-700' : 'text-cream-500')} />}
            <span>{tab.label}</span>
            {typeof tab.badge === 'number' && (
              <span className="ml-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-xs font-semibold text-white bg-alert rounded-full">
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
