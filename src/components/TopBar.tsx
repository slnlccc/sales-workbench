import { useState } from 'react';
import { CalendarDays, User, Clock, Edit2, Check, X, Menu } from 'lucide-react';
import { useWorkbenchStore } from '@/store/useWorkbenchStore';

export default function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  const { user, setJoinDate } = useWorkbenchStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editDate, setEditDate] = useState(user.joinDate);

  const today = new Date();
  const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const dateStr = `${today.getMonth() + 1}月${today.getDate()}日 ${weekDays[today.getDay()]}`;

  const joinDateObj = new Date(user.joinDate);
  const diffTime = today.getTime() - joinDateObj.getTime();
  const joinDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  const handleSave = () => {
    if (editDate) {
      setJoinDate(editDate);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditDate(user.joinDate);
    setIsEditing(false);
  };

  return (
    <header className="flex items-center justify-between py-3 px-4 md:px-6 md:py-4 bg-cream-50/80 backdrop-blur-sm animate-fade-in">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="md:hidden p-1.5 rounded-lg hover:bg-cream-200 transition-colors"
        >
          <Menu className="w-5 h-5 text-cream-700" />
        </button>
        <h1 className="text-base md:text-xl font-semibold text-cream-900 font-display">之欧的工作台</h1>
      </div>

      <div className="flex items-center gap-3 md:gap-6 text-xs md:text-sm text-cream-600">
        <div className="hidden sm:flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-cream-500" />
          <span>{dateStr}</span>
        </div>

        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-cream-500" />
          {isEditing ? (
            <div className="flex items-center gap-1">
              <input
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                className="px-2 py-1 rounded-lg bg-cream-100 text-sm text-cream-800 focus:outline-none focus:ring-2 focus:ring-cream-400"
              />
              <button
                onClick={handleSave}
                className="p-1 hover:bg-cream-200 rounded-lg text-cream-600"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleCancel}
                className="p-1 hover:bg-cream-200 rounded-lg text-cream-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <span className="flex items-center gap-1">
              <span className="hidden sm:inline">加入派克 </span>
              <span className="font-semibold text-cream-700">{joinDays}</span>
              <span>天</span>
              <button
                onClick={() => setIsEditing(true)}
                className="p-1 hover:bg-cream-200 rounded-lg text-cream-500 hover:text-cream-700"
                title="编辑入职日期"
              >
                <Edit2 className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>

        <div className="hidden lg:flex items-center gap-2">
          <Clock className="w-4 h-4 text-cream-500" />
          <span>
            数据更新：<span className="font-medium text-cream-700">{user.lastUpdated}</span>
          </span>
        </div>
      </div>
    </header>
  );
}
