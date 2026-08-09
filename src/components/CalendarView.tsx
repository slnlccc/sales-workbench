import { useState } from 'react';
import {
  ChevronLeft, ChevronRight, Plus, CalendarClock, Sparkles, Phone, FileText, Check, X, Clock, User, Pencil, Save
} from 'lucide-react';
import { useWorkbenchStore } from '@/store/useWorkbenchStore';
import type { WorkbenchRecord } from '@/types';
import { cn } from '@/lib/utils';

// 来源标记
const sourceMarker = (record: WorkbenchRecord): string => {
  if (record.source === 'voice') return '🎤';
  if (record.source === 'memo') return '📝';
  return '✋';
};

const sourceLabel = (record: WorkbenchRecord): string => {
  if (record.source === 'voice') return '语音录入';
  if (record.source === 'memo') return '备忘录';
  return '手动添加';
};

// 把记录对应到某一天的日期字符串
const recordDateStr = (record: WorkbenchRecord): string => {
  const date = new Date(record.reminderAt || record.createdAt);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

export default function CalendarView() {
  const { records, closeScheduleTask, addManualSchedule, deleteRecord, updateRecord } = useWorkbenchStore();
  const today = new Date();
  const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const [viewDate, setViewDate] = useState(currentMonth);
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate());

  // 手动添加弹窗状态
  const [showAddModal, setShowAddModal] = useState(false);
  const [newScheduleContent, setNewScheduleContent] = useState('');
  const [newScheduleDate, setNewScheduleDate] = useState('');
  const [newScheduleTime, setNewScheduleTime] = useState('09:00');
  const [newScheduleCustomer, setNewScheduleCustomer] = useState('');

  // 编辑日程弹窗状态
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('09:00');
  const [editCustomer, setEditCustomer] = useState('');

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = viewDate.toLocaleString('zh-CN', { month: 'long' });

  const prevMonth = () => {
    setViewDate(new Date(year, month - 1, 1));
    setSelectedDay(null);
  };
  const nextMonth = () => {
    setViewDate(new Date(year, month + 1, 1));
    setSelectedDay(null);
  };

  const isToday = (d: number) =>
    today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;

  // 计算每天的日程记录数（仅 schedule / task 类型）
  const scheduleRecords = records.filter((r) => r.type === 'schedule' || r.type === 'task');
  const dayRecordCount = (d: number): number => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    return scheduleRecords.filter((r) => recordDateStr(r) === dateStr).length;
  };

  // 选中的某天的日程
  const selectedDateStr =
    selectedDay !== null
      ? `${year}-${String(month + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`
      : '';
  const selectedRecords = selectedDay !== null
    ? scheduleRecords.filter((r) => recordDateStr(r) === selectedDateStr)
    : [];

  const weeks: (number | null)[][] = [];
  let week: (number | null)[] = new Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    week.push(d);
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }

  // 打开添加弹窗时，默认填充选中的日期
  const openAddModal = () => {
    const dateStr = selectedDay !== null
      ? `${year}-${String(month + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`
      : today.toISOString().slice(0, 10);
    setNewScheduleDate(dateStr);
    setNewScheduleTime('09:00');
    setNewScheduleContent('');
    setNewScheduleCustomer('');
    setShowAddModal(true);
  };

  const handleAddSchedule = () => {
    if (!newScheduleContent.trim() || !newScheduleDate) return;
    addManualSchedule(
      newScheduleContent.trim(),
      newScheduleDate,
      newScheduleTime,
      newScheduleCustomer.trim() || undefined
    );
    setShowAddModal(false);
    // 如果添加的日期在当前月份，自动选中该日期
    const [y, m] = newScheduleDate.split('-').map(Number);
    if (y === year && m - 1 === month) {
      setSelectedDay(Number(newScheduleDate.split('-')[2]));
    }
  };

  const openEditModal = (r: WorkbenchRecord) => {
    const time = new Date(r.reminderAt || r.createdAt);
    const dateStr = `${time.getFullYear()}-${String(time.getMonth() + 1).padStart(2, '0')}-${String(time.getDate()).padStart(2, '0')}`;
    const timeStr = `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`;
    setEditingId(r.id);
    setEditContent(r.content);
    setEditDate(dateStr);
    setEditTime(timeStr);
    setEditCustomer(r.customer || '');
  };

  const handleEditSchedule = () => {
    if (!editingId || !editContent.trim() || !editDate) return;
    const [y, m, d] = editDate.split('-').map(Number);
    const [h, min] = editTime.split(':').map(Number);
    const reminderAt = new Date(y, m - 1, d, h || 9, min || 0);
    updateRecord(editingId, {
      content: editContent.trim(),
      reminderAt: reminderAt.toISOString(),
      customer: editCustomer.trim() || undefined,
    });
    setEditingId(null);
    const [ny, nm] = editDate.split('-').map(Number);
    if (ny === year && nm - 1 === month) {
      setSelectedDay(Number(editDate.split('-')[2]));
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
      <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-soft">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-coffee-900">{year}年 {monthName}</h3>
          <div className="flex items-center gap-1">
            <button onClick={prevMonth} className="p-1.5 hover:bg-coffee-50 rounded-lg">
              <ChevronLeft className="w-4 h-4 text-coffee-600" />
            </button>
            <button onClick={nextMonth} className="p-1.5 hover:bg-coffee-50 rounded-lg">
              <ChevronRight className="w-4 h-4 text-coffee-600" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {['日', '一', '二', '三', '四', '五', '六'].map((d) => (
            <div key={d} className="text-center text-xs text-coffee-400 py-2">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {weeks.flat().map((d, i) => {
            const isCurrent = d !== null && isToday(d);
            const isSelected = d !== null && d === selectedDay;
            const count = d !== null ? dayRecordCount(d) : 0;
            return (
              <div
                key={i}
                onClick={() => d !== null && setSelectedDay(d)}
                className={cn(
                  'aspect-square flex flex-col items-center justify-center text-sm rounded-xl relative cursor-pointer transition-all',
                  d === null ? 'cursor-default' : 'hover:bg-coffee-50',
                  isCurrent
                    ? 'bg-coffee-700 text-black font-semibold shadow-md'
                    : isSelected
                      ? 'bg-coffee-100 text-coffee-900 font-semibold ring-2 ring-coffee-300'
                      : 'text-coffee-800'
                )}
              >
                {d}
                {count > 0 && !isCurrent && (
                  <span className="absolute bottom-1 flex items-center gap-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-caramel" />
                  </span>
                )}
                {count > 0 && isCurrent && (
                  <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-white/80" />
                )}
              </div>
            );
          })}
        </div>

        {/* 来源图例 */}
        <div className="mt-4 flex items-center gap-4 text-xs text-coffee-500 flex-wrap">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-caramel" />
            <span>有日程</span>
          </span>
          <span className="flex items-center gap-1">🎤 语音录入</span>
          <span className="flex items-center gap-1">📝 备忘录</span>
          <span className="flex items-center gap-1">✋ 手动添加</span>
        </div>

        {/* 选中日期的日程列表 */}
        <div className="mt-6 pt-4 border-t border-coffee-100">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-coffee-900">
              {selectedDay !== null
                ? `${selectedDateStr} 的日程`
                : '请选择日期查看日程'}
            </h4>
            <button
              onClick={openAddModal}
              className="text-xs text-coffee-600 hover:text-coffee-800 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-coffee-50 transition-colors"
            >
              <Plus className="w-3 h-3" />
              <span>添加日程</span>
            </button>
          </div>

          <div className="space-y-2">
            {selectedDay === null && (
              <div className="text-center text-sm text-coffee-400 py-6">点击日历中的某天查看日程</div>
            )}
            {selectedDay !== null && selectedRecords.length === 0 && (
              <div className="text-center text-sm text-coffee-400 py-6">
                这一天暂无日程安排
                <button
                  onClick={openAddModal}
                  className="block mx-auto mt-2 text-xs text-coffee-500 hover:text-coffee-700 underline"
                >
                  点击添加日程
                </button>
              </div>
            )}
            {selectedRecords.map((r) => {
              const Icon = r.type === 'call' ? Phone : r.type === 'task' ? FileText : CalendarClock;
              const time = new Date(r.reminderAt || r.createdAt);
              const timeStr = `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`;
              return (
                <div
                  key={r.id}
                  onClick={() => closeScheduleTask(r.id)}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-2xl transition-all cursor-pointer select-none',
                    r.done
                      ? 'bg-emerald-50/60 hover:bg-emerald-100'
                      : 'bg-coffee-50/40 hover:bg-coffee-100 hover:shadow-sm'
                  )}
                >
                  <div
                    className={cn(
                      'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors flex-shrink-0',
                      r.done
                        ? 'bg-emerald-500 border-emerald-500'
                        : 'border-coffee-300'
                    )}
                  >
                    {r.done && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <Icon className={cn('w-4 h-4 flex-shrink-0', r.done ? 'text-emerald-500' : 'text-coffee-500')} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs text-coffee-400 font-mono">{timeStr}</span>
                      {r.customer && (
                        <span className="text-xs text-coffee-400 flex items-center gap-0.5">
                          <User className="w-3 h-3" />
                          {r.customer}
                        </span>
                      )}
                    </div>
                    <span className={cn('text-sm block', r.done ? 'line-through text-emerald-700' : 'text-coffee-800')}>
                      {r.content}
                    </span>
                  </div>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                    title={sourceLabel(r)}
                  >
                    {sourceMarker(r)}
                  </span>
                  <span className={cn(
                    'text-xs px-2 py-1 rounded-lg',
                    r.done
                      ? 'bg-amber-50 text-amber-700'
                      : 'bg-emerald-50 text-emerald-700'
                  )}>
                    {r.done ? '点击取消' : '点击完成'}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditModal(r);
                    }}
                    className="w-6 h-6 rounded-lg text-coffee-300 hover:text-coffee-600 hover:bg-coffee-50 flex items-center justify-center transition-colors flex-shrink-0"
                    title="编辑"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteRecord(r.id);
                    }}
                    className="w-6 h-6 rounded-lg text-coffee-300 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors flex-shrink-0"
                    title="删除"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {/* 即将到来的日程 */}
        {scheduleRecords.filter((r) => !r.done).slice(0, 3).map((r) => {
          const time = new Date(r.reminderAt || r.createdAt);
          return (
            <div key={r.id} className="bg-white rounded-2xl p-4 shadow-soft">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-coffee-400" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-coffee-800 truncate">{r.content}</p>
                  <p className="text-xs text-coffee-400">
                    {time.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <span className="text-xs" title={sourceLabel(r)}>{sourceMarker(r)}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteRecord(r.id);
                  }}
                  className="w-6 h-6 rounded-lg text-coffee-300 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors"
                  title="删除"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}

        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-amber-600" />
            <h4 className="text-sm font-semibold text-amber-900">小技巧</h4>
          </div>
          <p className="text-sm text-amber-800 font-medium mb-1">直接在语音录入里说</p>
          <p className="text-xs text-amber-700 leading-relaxed">
            「明天早上8点交交工作报告」，AI会自动设置提醒并生成报告！
          </p>
        </div>
      </div>

      {/* 手动添加日程弹窗 */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-coffee-900/40 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-md w-full shadow-card overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-coffee-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-coffee-100 flex items-center justify-center">
                  <Plus className="w-4 h-4 text-coffee-700" />
                </div>
                <h3 className="text-base font-semibold text-coffee-900">添加日程</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 hover:bg-coffee-50 rounded-lg text-coffee-400 hover:text-coffee-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs text-coffee-500 mb-1.5 block">日程内容</label>
                <textarea
                  value={newScheduleContent}
                  onChange={(e) => setNewScheduleContent(e.target.value)}
                  placeholder="例如：拜访中国航发项目组"
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl bg-cream text-sm text-coffee-800 focus:outline-none focus:ring-2 focus:ring-coffee-300 resize-none placeholder:text-coffee-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-coffee-500 mb-1.5 block flex items-center gap-1">
                    <CalendarClock className="w-3 h-3" />
                    日期
                  </label>
                  <input
                    type="date"
                    value={newScheduleDate}
                    onChange={(e) => setNewScheduleDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-cream text-sm text-coffee-800 focus:outline-none focus:ring-2 focus:ring-coffee-300"
                  />
                </div>
                <div>
                  <label className="text-xs text-coffee-500 mb-1.5 block flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    时间
                  </label>
                  <input
                    type="time"
                    value={newScheduleTime}
                    onChange={(e) => setNewScheduleTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-cream text-sm text-coffee-800 focus:outline-none focus:ring-2 focus:ring-coffee-300"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-coffee-500 mb-1.5 block flex items-center gap-1">
                  <User className="w-3 h-3" />
                  关联客户（可选）
                </label>
                <input
                  type="text"
                  value={newScheduleCustomer}
                  onChange={(e) => setNewScheduleCustomer(e.target.value)}
                  placeholder="例如：中国航发"
                  className="w-full px-3 py-2 rounded-xl bg-cream text-sm text-coffee-800 focus:outline-none focus:ring-2 focus:ring-coffee-300 placeholder:text-coffee-300"
                />
              </div>
            </div>

            <div className="p-5 border-t border-coffee-100 flex gap-2">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-2.5 bg-white text-coffee-600 rounded-xl text-sm font-medium border border-coffee-200 hover:bg-coffee-50"
              >
                取消
              </button>
              <button
                onClick={handleAddSchedule}
                disabled={!newScheduleContent.trim() || !newScheduleDate}
                className="flex-1 py-2.5 bg-gradient-to-r from-coffee-600 to-caramel text-white rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-40"
              >
                确认添加
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 编辑日程弹窗 */}
      {editingId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-coffee-900/40 backdrop-blur-sm animate-fade-in"
          onClick={() => setEditingId(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-md w-full shadow-card overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-coffee-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-coffee-100 flex items-center justify-center">
                  <Pencil className="w-4 h-4 text-coffee-700" />
                </div>
                <h3 className="text-base font-semibold text-coffee-900">编辑日程</h3>
              </div>
              <button
                onClick={() => setEditingId(null)}
                className="p-1.5 hover:bg-coffee-50 rounded-lg text-coffee-400 hover:text-coffee-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs text-coffee-500 mb-1.5 block">日程内容</label>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl bg-cream text-sm text-coffee-800 focus:outline-none focus:ring-2 focus:ring-coffee-300 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-coffee-500 mb-1.5 block flex items-center gap-1">
                    <CalendarClock className="w-3 h-3" />
                    日期
                  </label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-cream text-sm text-coffee-800 focus:outline-none focus:ring-2 focus:ring-coffee-300"
                  />
                </div>
                <div>
                  <label className="text-xs text-coffee-500 mb-1.5 block flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    时间
                  </label>
                  <input
                    type="time"
                    value={editTime}
                    onChange={(e) => setEditTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-cream text-sm text-coffee-800 focus:outline-none focus:ring-2 focus:ring-coffee-300"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-coffee-500 mb-1.5 block flex items-center gap-1">
                  <User className="w-3 h-3" />
                  关联客户（可选）
                </label>
                <input
                  type="text"
                  value={editCustomer}
                  onChange={(e) => setEditCustomer(e.target.value)}
                  placeholder="例如：中国航发"
                  className="w-full px-3 py-2 rounded-xl bg-cream text-sm text-coffee-800 focus:outline-none focus:ring-2 focus:ring-coffee-300 placeholder:text-coffee-300"
                />
              </div>
            </div>

            <div className="p-5 border-t border-coffee-100 flex gap-2">
              <button
                onClick={() => setEditingId(null)}
                className="flex-1 py-2.5 bg-white text-coffee-600 rounded-xl text-sm font-medium border border-coffee-200 hover:bg-coffee-50"
              >
                取消
              </button>
              <button
                onClick={handleEditSchedule}
                disabled={!editContent.trim() || !editDate}
                className="flex-1 py-2.5 bg-gradient-to-r from-coffee-600 to-caramel text-white rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-1"
              >
                <Save className="w-4 h-4" />
                保存修改
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
