import { useLocation, useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  Mic,
  Newspaper,
  Target,
  Sparkles,
  FileText,
  Heart,
  TrendingUp,
  BookOpen,
  Kanban,
  Terminal,
  AlertCircle,
  Briefcase,
  Users,
  FileCheck,
  X,
} from 'lucide-react';
import { navGroups } from '@/data/mock';
import { cn } from '@/lib/utils';
import CloudSyncPanel from './CloudSyncPanel';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Mic,
  Newspaper,
  Target,
  Sparkles,
  FileText,
  Heart,
  TrendingUp,
  BookOpen,
  Kanban,
  Briefcase,
  Users,
  FileCheck,
};

export default function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();

  const handleNavigate = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <>
      {/* 移动端遮罩 */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'w-64 h-screen bg-cream-50 border-r border-cream-300 flex flex-col animate-fade-in',
          'fixed md:relative top-0 left-0 z-50 transition-transform duration-300',
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        <div className="p-5 flex items-center gap-3">
          <button className="p-1.5 rounded-lg hover:bg-cream-200 transition-colors">
            <ChevronLeft className="w-5 h-5 text-cream-700" />
          </button>
          <span className="text-lg font-semibold text-cream-900 font-display">之欧</span>
          <button
            onClick={onClose}
            className="ml-auto md:hidden p-1.5 rounded-lg hover:bg-cream-200"
          >
            <X className="w-5 h-5 text-cream-700" />
          </button>
        </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4 space-y-6">
        {navGroups.map((group) => (
          <div key={group.title}>
            <h3 className="px-3 mb-2 text-xs font-medium text-cream-500 tracking-wider">
              {group.title}
            </h3>
            <ul className="space-y-1">
              {group.items.map((item) => {
                const Icon = iconMap[item.icon];
                const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');

                return (
                  <li key={item.id}>
                    <button
                      onClick={() => handleNavigate(item.path)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group',
                        isActive
                          ? 'bg-gradient-to-r from-cream-700 to-cream-500 text-white shadow-soft'
                          : 'text-cream-800 hover:bg-cream-100'
                      )}
                    >
                      {Icon && (
                        <Icon
                          className={cn(
                            'w-[18px] h-[18px] flex-shrink-0',
                            isActive ? 'text-white' : 'text-cream-600 group-hover:text-cream-700'
                          )}
                        />
                      )}
                      <div className="flex items-center gap-1.5 text-sm min-w-0">
                        <span className={cn('font-medium truncate', isActive && 'text-white')}>
                          {item.label}
                        </span>
                        <span className={cn('opacity-60', isActive && 'text-white/80')}>|</span>
                        <span className={cn('truncate opacity-80', isActive && 'text-white/90')}>
                          {item.subLabel}
                        </span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-cream-300 space-y-3">
        <CloudSyncPanel compact />
        <div className="flex items-center gap-2 text-xs text-cream-600 px-3">
          <Terminal className="w-4 h-4" />
          <span>销售工作台 v2.0</span>
        </div>
        <button className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-cream-700 hover:bg-cream-100 transition-colors">
          <span className="text-sm font-medium">控制台日志</span>
          <div className="flex items-center gap-1 ml-auto">
            <AlertCircle className="w-4 h-4 text-alert" />
            <span className="text-sm font-medium text-alert">1</span>
          </div>
        </button>
      </div>
    </aside>
    </>
  );
}
