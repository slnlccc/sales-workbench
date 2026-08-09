import { useState } from 'react';
import { DollarSign, Users, FileText, CheckCircle, Phone, Calendar, X, Check, Clock, Mic, StickyNote, Hand, Pencil, Save } from 'lucide-react';
import { useWorkbenchStore } from '@/store/useWorkbenchStore';
import type { RecordType, RecordSource, WorkbenchRecord } from '@/types';
import { cn } from '@/lib/utils';

const typeConfig: Record<string, { label: string; color: string; bgColor: string; icon: React.ComponentType<{ className?: string }> }> = {
  all: { label: '全部', color: 'text-coffee-700', bgColor: 'bg-coffee-700', icon: Calendar },
  order: { label: '订单', color: 'text-emerald-700', bgColor: 'bg-emerald-500', icon: DollarSign },
  visit: { label: '拜访', color: 'text-blue-700', bgColor: 'bg-blue-500', icon: Users },
  quote: { label: '报价', color: 'text-violet-700', bgColor: 'bg-violet-500', icon: FileText },
  task: { label: '任务', color: 'text-amber-700', bgColor: 'bg-amber-500', icon: CheckCircle },
  call: { label: '电话', color: 'text-teal-700', bgColor: 'bg-teal-500', icon: Phone },
  meeting: { label: '会议', color: 'text-pink-700', bgColor: 'bg-pink-500', icon: Calendar },
  memo: { label: '备忘', color: 'text-coffee-700', bgColor: 'bg-caramel', icon: StickyNote },
  schedule: { label: '日程', color: 'text-coffee-700', bgColor: 'bg-coffee-500', icon: Calendar },
};

const typeFilterOrder: (RecordType | 'all')[] = ['all', 'order', 'visit', 'quote', 'task', 'call', 'meeting'];

const sourceConfig: Record<RecordSource, { label: string; icon: React.ComponentType<{ className?: string }>; chipClass: string }> = {
  voice: { label: '语音录入', icon: Mic, chipClass: 'bg-caramel/15 text-caramel' },
  memo: { label: '备忘录', icon: StickyNote, chipClass: 'bg-coffee-100 text-coffee-700' },
  manual: { label: '手动', icon: Hand, chipClass: 'bg-coffee-50 text-coffee-500' },
};

const sourceFilterOrder: (RecordSource | 'all')[] = ['all', 'voice', 'memo', 'manual'];

// 统一获取记录来源：未指定 source 的 memo 类型记录视为 memo 来源
const resolveSource = (r: WorkbenchRecord): RecordSource => {
  if (r.source === 'voice') return 'voice';
  if (r.source === 'memo' || r.type === 'memo') return 'memo';
  return 'manual';
};

export default function RecordsList() {
  const { records, memos, toggleRecordDone, deleteRecord, deleteMemo, updateRecord, updateMemo } = useWorkbenchStore();
  const [activeFilter, setActiveFilter] = useState<RecordType | 'all'>('all');
  const [activeSource, setActiveSource] = useState<RecordSource | 'all'>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  // 合并 records 与 memos，备忘录自动汇入工作记录列表
  const allRecords: WorkbenchRecord[] = [
    ...records,
    ...memos.map((m) => ({ ...m, source: resolveSource(m) as RecordSource })),
  ];

  const filtered = allRecords.filter((r) => {
    const typeMatch = activeFilter === 'all' || r.type === activeFilter;
    const sourceMatch = activeSource === 'all' || resolveSource(r) === activeSource;
    return typeMatch && sourceMatch;
  });

  const counts: Record<string, number> = { all: allRecords.length };
  allRecords.forEach((r) => {
    counts[r.type] = (counts[r.type] || 0) + 1;
  });

  const sourceCounts: Record<string, number> = { all: allRecords.length };
  allRecords.forEach((r) => {
    const s = resolveSource(r);
    sourceCounts[s] = (sourceCounts[s] || 0) + 1;
  });

  return (
    <div className="animate-fade-in">
      {/* 来源筛选 */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className="text-xs text-coffee-400 mr-1">来源：</span>
        {sourceFilterOrder.map((key) => {
          const isActive = activeSource === key;
          const label = key === 'all' ? '全部' : sourceConfig[key].label;
          const Icon = key === 'all' ? Calendar : sourceConfig[key].icon;
          const count = sourceCounts[key] || 0;
          return (
            <button
              key={key}
              onClick={() => setActiveSource(key)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200',
                isActive
                  ? 'bg-caramel text-white shadow-md'
                  : 'bg-white text-coffee-600 hover:bg-coffee-50'
              )}
            >
              <Icon className="w-3 h-3" />
              <span>{label}</span>
              <span className={cn('text-xs', isActive ? 'text-white/80' : 'text-coffee-400')}>
                ({count})
              </span>
            </button>
          );
        })}
      </div>

      {/* 类型筛选 */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {typeFilterOrder.map((key) => {
          const config = typeConfig[key];
          const Icon = config.icon;
          const isActive = activeFilter === key;
          const count = counts[key] || 0;
          return (
            <button
              key={key}
              onClick={() => setActiveFilter(key)}
              className={cn(
                'flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-coffee-700 text-white shadow-md'
                  : 'bg-white text-coffee-600 hover:bg-coffee-50'
              )}
            >
              <span className={cn('w-1.5 h-1.5 rounded-full', isActive ? 'bg-white' : config.bgColor)} />
              <span>{config.label}</span>
              <span className={cn('text-xs', isActive ? 'text-white/80' : 'text-coffee-400')}>
                ({count})
              </span>
            </button>
          );
        })}
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="bg-white rounded-2xl p-8 text-center text-sm text-coffee-400">
            暂无匹配的工作记录
          </div>
        )}
        {filtered.map((record) => {
          const config = typeConfig[record.type];
          const Icon = config?.icon || Calendar;
          const colorClass = config?.color || 'text-coffee-700';
          const source = resolveSource(record);
          const SourceIcon = sourceConfig[source].icon;
          return (
            <div
              key={record.id}
              className={cn(
                'bg-white rounded-2xl p-4 shadow-soft border-l-4 transition-all hover:shadow-card',
                record.done && 'opacity-60',
                record.type === 'task' && !record.done ? 'border-l-amber-500' : 'border-l-transparent'
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', config?.bgColor || 'bg-coffee-500')}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={cn('text-sm font-semibold', colorClass)}>
                      {config?.label}
                    </span>
                    <span className="text-xs text-coffee-400">·</span>
                    <span className="text-xs text-coffee-500">{record.customer || '其他'}</span>
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full',
                        sourceConfig[source].chipClass
                      )}
                    >
                      <SourceIcon className="w-2.5 h-2.5" />
                      <span>{sourceConfig[source].label}</span>
                    </span>
                    <span className="ml-auto text-xs text-coffee-400">
                      {new Date(record.createdAt).toLocaleDateString('zh-CN')}
                    </span>
                  </div>
                  {editingId === record.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 rounded-xl bg-coffee-50 text-sm text-coffee-800 focus:outline-none focus:ring-2 focus:ring-coffee-300 resize-none"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-3 py-1 text-xs text-coffee-500 hover:text-coffee-700 rounded-lg transition-colors"
                        >
                          取消
                        </button>
                        <button
                          onClick={() => {
                            if (editContent.trim()) {
                              if (record.type === 'memo') {
                                updateMemo(record.id, { content: editContent.trim() });
                              } else {
                                updateRecord(record.id, { content: editContent.trim() });
                              }
                              setEditingId(null);
                            }
                          }}
                          className="flex items-center gap-1 px-3 py-1 text-xs text-white bg-coffee-600 hover:bg-coffee-700 rounded-lg transition-colors"
                        >
                          <Save className="w-3 h-3" />
                          保存
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className={cn('text-sm text-coffee-800', record.done && 'line-through text-coffee-400')}>
                        {record.content}
                      </p>
                      {record.customer && (
                        <p className="text-xs text-coffee-400 mt-1">{record.customer}</p>
                      )}
                    </>
                  )}
                </div>
                {editingId !== record.id && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        setEditingId(record.id);
                        setEditContent(record.content);
                      }}
                      className="w-7 h-7 rounded-lg text-coffee-300 hover:text-coffee-600 hover:bg-coffee-50 flex items-center justify-center transition-colors"
                      title="编辑"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => toggleRecordDone(record.id)}
                      className={cn(
                        'w-7 h-7 rounded-lg flex items-center justify-center transition-colors',
                        record.done
                          ? 'bg-coffee-100 text-coffee-600'
                          : 'text-coffee-300 hover:text-coffee-600 hover:bg-coffee-50'
                      )}
                    >
                      {record.done ? <Check className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => {
                        if (record.type === 'memo') {
                          deleteMemo(record.id);
                        } else {
                          deleteRecord(record.id);
                        }
                      }}
                      className="w-7 h-7 rounded-lg text-coffee-300 hover:text-alert hover:bg-red-50 flex items-center justify-center transition-colors"
                      title="删除"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
