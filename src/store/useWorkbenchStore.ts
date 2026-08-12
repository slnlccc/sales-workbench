import { create } from 'zustand';
import type { WorkbenchRecord, RecordType, TabKey, MemoKnowledge } from '@/types';
import { mockRecords, mockUser } from '@/data/mock';

// localStorage 持久化辅助
const STORAGE_KEY = 'sw_workbench_data';

const loadFromStorage = (): Partial<WorkbenchState> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const data = JSON.parse(raw);
    return {
      records: data.records || mockRecords,
      memos: data.memos || [],
      memoKnowledge: data.memoKnowledge || [],
    };
  } catch {
    return {};
  }
};

const saveToStorage = (state: WorkbenchState) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      records: state.records,
      memos: state.memos,
      memoKnowledge: state.memoKnowledge,
    }));
  } catch {
    // 存储空间不足时静默失败
  }
};

interface WorkbenchState {
  records: WorkbenchRecord[];
  memos: WorkbenchRecord[];
  memoKnowledge: MemoKnowledge[];
  user: typeof mockUser;
  activeTab: TabKey;
  inputText: string;
  isRecording: boolean;
  setActiveTab: (tab: TabKey) => void;
  setInputText: (text: string) => void;
  setIsRecording: (recording: boolean) => void;
  addRecord: (content: string, type?: RecordType, customer?: string) => void;
  addMemo: (content: string) => void;
  toggleMemoClosed: (id: string) => void;
  promoteMemoToSchedule: (id: string) => void;
  toggleRecordDone: (id: string) => void;
  addScheduleFromTodo: (content: string, date: string, customer?: string) => void;
  addManualSchedule: (content: string, dateStr: string, timeStr: string, customer?: string) => void;
  addVoiceTask: (content: string) => void;
  addMemoWithVoice: (content: string) => void;
  addMemoKnowledge: (knowledge: MemoKnowledge) => void;
  setJoinDate: (dateStr: string) => void;
  closeScheduleTask: (id: string) => void;
  deleteRecord: (id: string) => void;
  deleteExpiredRecords: () => void;
  checkExpiredSchedules: () => void;
  requestNotificationPermission: () => void;
  deleteMemo: (id: string) => void;
  clearInput: () => void;
  // 云同步：导出/导入前端数据
  exportLocalData: () => { records: WorkbenchRecord[]; memos: WorkbenchRecord[]; memoKnowledge: MemoKnowledge[] };
  importLocalData: (data: { records: WorkbenchRecord[]; memos: WorkbenchRecord[]; memoKnowledge: MemoKnowledge[] }) => void;
}

const detectType = (content: string): RecordType => {
  const text = content.toLowerCase();
  // 报告/周报/汇报类 → meeting 或 task（不要变成日程提醒）
  if (text.includes('周报') || text.includes('日报') || text.includes('月报') || text.includes('周报总结')
      || text.includes('总结') && (text.includes('工作') || text.includes('周'))) return 'task';
  if (text.includes('报告') || text.includes('汇报')) return 'meeting';
  if (text.includes('订单')) return 'order';
  if (text.includes('拜访') || text.includes('访问')) return 'visit';
  if (text.includes('报价')) return 'quote';
  if (text.includes('电话') || text.includes('致电')) return 'call';
  if (text.includes('备忘') || text.includes('记') || text.includes('感受')) return 'memo';
  // 日程：只有真正的时间提醒类词语才算 schedule
  if (text.includes('提醒') || text.includes('交') || text.includes('提交') || text.includes('完成')
      || text.includes('明天') || text.includes('后天') || text.includes('下周')
      || text.includes('点') && /\d[点:]/.test(text) || /\d{1,2}[日号]/.test(text)) return 'schedule';
  return 'task';
};

// 解析时间关键词，生成提醒时间
const parseTimeKeyword = (text: string): Date => {
  const now = new Date();
  const result = new Date(now);
  let hasDate = false;
  let hasTime = false;

  // 日期解析
  if (text.includes('后天')) {
    result.setDate(result.getDate() + 2);
    hasDate = true;
  } else if (text.includes('大后天')) {
    result.setDate(result.getDate() + 3);
    hasDate = true;
  } else if (text.includes('下周')) {
    result.setDate(result.getDate() + 7);
    hasDate = true;
  } else if (text.includes('明天')) {
    result.setDate(result.getDate() + 1);
    hasDate = true;
  } else if (text.includes('今天')) {
    hasDate = true;
  }

  // 周几：周三、星期五
  const weekDayMatch = text.match(/周([一二三四五六日天])|星期([一二三四五六日天])/);
  if (weekDayMatch) {
    const dayChar = weekDayMatch[1] || weekDayMatch[2];
    const dayMap: Record<string, number> = {
      '日': 0, '天': 0, '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6,
    };
    const targetDay = dayMap[dayChar];
    if (targetDay !== undefined) {
      const currentDay = result.getDay();
      let diff = targetDay - currentDay;
      if (diff <= 0) diff += 7;
      result.setDate(result.getDate() + diff);
      hasDate = true;
    }
  }

  // 几号 / 几日
  const dayMatch = text.match(/(\d{1,2})[日号]/);
  if (dayMatch) {
    const day = parseInt(dayMatch[1], 10);
    if (day >= 1 && day <= 31) {
      result.setDate(day);
      hasDate = true;
    }
  }

  // 时间解析
  const timeMatch = text.match(/(\d{1,2})[点时:：](\d{1,2})?/);
  if (timeMatch) {
    let hour = parseInt(timeMatch[1], 10);
    const minute = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    if (text.includes('下午') || text.includes('傍晚') || text.includes('晚上')) {
      if (hour < 12) hour += 12;
    }
    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      result.setHours(hour, minute, 0, 0);
      hasTime = true;
    }
  }

  if (!hasDate && !hasTime) {
    result.setDate(result.getDate() + 1);
    result.setHours(9, 0, 0, 0);
  } else if (!hasTime) {
    result.setHours(9, 0, 0, 0);
  } else if (!hasDate) {
    if (result.getTime() < now.getTime()) {
      result.setDate(result.getDate() + 1);
    }
  }

  return result;
};

// 从备忘录内容生成知识库条目
const generateKnowledgeFromMemo = (content: string): MemoKnowledge => {
  const title = content.length > 18 ? content.slice(0, 18) + '…' : content;
  const summary = content.length > 60
    ? content.slice(0, 60) + '…'
    : content;
  return {
    id: `kb-${Date.now()}`,
    title,
    summary,
    source: '备忘录',
    createdAt: new Date().toISOString(),
  };
};

export const useWorkbenchStore = create<WorkbenchState>((set, get) => {
  const persisted = loadFromStorage();

  const persistSet = (updater: (state: WorkbenchState) => Partial<WorkbenchState>) => {
    set(updater);
    saveToStorage(get());
  };

  return {
  records: persisted.records || mockRecords,
  memos: persisted.memos || [
    {
      id: 'memo-001',
      type: 'memo',
      content: '今天拜访中国航发时，张总特别提到要关注航空发动机小型化趋势，这可能是接下来的市场机会。',
      createdAt: '2026-07-08T10:00:00Z',
      closed: false,
    },
    {
      id: 'memo-002',
      type: 'memo',
      content: '客户反馈 GH4169 锻件的热处理工艺还有优化空间，可以和研究院讨论一下工艺改进方案。',
      createdAt: '2026-07-07T15:30:00Z',
      closed: true,
    },
  ],
  memoKnowledge: persisted.memoKnowledge || [
    {
      id: 'kb-init-001',
      title: '航空发动机小型化趋势',
      summary: '中国航发张总提到航空发动机小型化是接下来的市场机会，需要重点关注相关产品研发与客户需求匹配。',
      source: '备忘录',
      createdAt: '2026-07-08T10:05:00Z',
    },
    {
      id: 'kb-init-002',
      title: 'GH4169 锻件热处理工艺优化',
      summary: '客户反馈 GH4169 锻件热处理工艺有优化空间，建议与研究院共同讨论工艺改进方案以提升产品竞争力。',
      source: '备忘录',
      createdAt: '2026-07-07T15:35:00Z',
    },
  ],
  user: mockUser,
  activeTab: 'voice',
  inputText: '',
  isRecording: false,

  setActiveTab: (tab) => set({ activeTab: tab }),
  setInputText: (text) => set({ inputText: text }),
  setIsRecording: (recording) => set({ isRecording: recording }),

  addRecord: (content, type, customer) => {
    const recordType = type || detectType(content);
    const newRecord: WorkbenchRecord = {
      id: `rec-${Date.now()}`,
      type: recordType,
      content,
      customer,
      createdAt: new Date().toISOString(),
      source: 'manual',
    };
    if (recordType === 'schedule') {
      newRecord.reminderAt = parseTimeKeyword(content).toISOString();
    }
    persistSet((state) => ({ records: [newRecord, ...state.records] }));
  },

  addMemo: (content) => {
    const newMemo: WorkbenchRecord = {
      id: `memo-${Date.now()}`,
      type: 'memo',
      content,
      createdAt: new Date().toISOString(),
      closed: false,
      source: 'manual',
    };
    persistSet((state) => ({ memos: [newMemo, ...state.memos] }));
  },

  toggleMemoClosed: (id) => {
    persistSet((state) => ({
      memos: state.memos.map((memo) =>
        memo.id === id ? { ...memo, closed: !memo.closed } : memo
      ),
    }));
  },

  promoteMemoToSchedule: (id) => {
    persistSet((state) => {
      const memo = state.memos.find((m) => m.id === id);
      if (!memo) return state;
      const newRecord: WorkbenchRecord = {
        id: `rec-${Date.now()}`,
        type: 'schedule',
        content: memo.content,
        createdAt: new Date().toISOString(),
        reminderAt: new Date(Date.now() + 86400000).toISOString(),
        closed: false,
        source: 'memo',
      };
      return {
        records: [newRecord, ...state.records],
        memos: state.memos.filter((m) => m.id !== id),
      };
    });
  },

  toggleRecordDone: (id) => {
    persistSet((state) => ({
      records: state.records.map((record) =>
        record.id === id ? { ...record, done: !record.done } : record
      ),
    }));
  },

  addScheduleFromTodo: (content, _date, customer) => {
    const newRecord: WorkbenchRecord = {
      id: `rec-${Date.now()}`,
      type: 'schedule',
      content,
      customer,
      createdAt: new Date().toISOString(),
      reminderAt: new Date(Date.now() + 86400000).toISOString(),
      source: 'manual',
    };
    persistSet((state) => ({ records: [newRecord, ...state.records] }));
  },

  addManualSchedule: (content: string, dateStr: string, timeStr: string, customer?: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const [hour, minute] = timeStr.split(':').map(Number);
    const reminderAt = new Date(year, month - 1, day, hour || 9, minute || 0);
    const newRecord: WorkbenchRecord = {
      id: `rec-${Date.now()}`,
      type: 'schedule',
      content,
      customer,
      createdAt: new Date().toISOString(),
      reminderAt: reminderAt.toISOString(),
      source: 'manual',
    };
    persistSet((state) => ({ records: [newRecord, ...state.records] }));
  },

  // 语音任务：解析时间关键词，生成 schedule 类型记录并附带 reminderAt
  addVoiceTask: (content) => {
    const reminderAt = parseTimeKeyword(content);
    const newRecord: WorkbenchRecord = {
      id: `rec-${Date.now()}`,
      type: 'schedule',
      content,
      createdAt: new Date().toISOString(),
      reminderAt: reminderAt.toISOString(),
      source: 'voice',
    };
    persistSet((state) => ({ records: [newRecord, ...state.records] }));
  },

  // 备忘录语音输入：写入备忘，同时沉淀知识库条目
  addMemoWithVoice: (content) => {
    const newMemo: WorkbenchRecord = {
      id: `memo-${Date.now()}`,
      type: 'memo',
      content,
      createdAt: new Date().toISOString(),
      closed: false,
      source: 'voice',
    };
    const knowledge = generateKnowledgeFromMemo(content);
    persistSet((state) => ({
      memos: [newMemo, ...state.memos],
      memoKnowledge: [knowledge, ...state.memoKnowledge],
    }));
  },

  addMemoKnowledge: (knowledge) => {
    persistSet((state) => ({ memoKnowledge: [knowledge, ...state.memoKnowledge] }));
  },

  setJoinDate: (dateStr: string) => {
    set((state) => ({ user: { ...state.user, joinDate: dateStr } }));
  },

  // 日历事项闭环：toggle 切换完成状态
  closeScheduleTask: (id) => {
    persistSet((state) => ({
      records: state.records.map((record) =>
        record.id === id ? { ...record, done: !record.done } : record
      ),
    }));
  },

  // 删除工作记录
  deleteRecord: (id) => {
    persistSet((state) => ({
      records: state.records.filter((r) => r.id !== id),
    }));
  },

  // 检测并标记过期日程 + 触发浏览器通知
  checkExpiredSchedules: () => {
    const state = get();
    const now = Date.now();
    let changed = false;
    let expiredCount = 0;
    const newRecords = state.records.map((r) => {
      if ((r.type === 'schedule' || r.type === 'task') && !r.done && r.reminderAt) {
        const reminderTime = new Date(r.reminderAt).getTime();
        // 过期：提醒时间已过（超过 1 分钟）且未完成
        if (!r.expired && reminderTime < now - 60000) {
          changed = true;
          expiredCount++;
          return { ...r, expired: true };
        }
      }
      return r;
    });
    if (changed) {
      persistSet(() => ({ records: newRecords }));
      // 触发浏览器通知
      if (expiredCount > 0 && 'Notification' in window) {
        try {
          if (Notification.permission === 'granted') {
            new Notification('销售工作台 · 日程提醒', {
              body: `有 ${expiredCount} 条日程已过期，请及时处理`,
              tag: 'schedule-expired',
            });
          } else if (Notification.permission !== 'denied') {
            Notification.requestPermission();
          }
        } catch {
          // 通知失败静默忽略
        }
      }
    }
  },

  // 请求通知权限
  requestNotificationPermission: () => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  },

  // 快速删除过期日程
  deleteExpiredRecords: () => {
    const state = get();
    persistSet((s) => ({
      records: s.records.filter((r) => !(r.expired && (r.type === 'schedule' || r.type === 'task'))),
    }));
  },

  // 删除备忘录
  deleteMemo: (id) => {
    persistSet((state) => ({
      memos: state.memos.filter((m) => m.id !== id),
    }));
  },

  clearInput: () => set({ inputText: '' }),

  // 云同步：导出前端数据
  exportLocalData: () => {
    const state = get();
    return {
      records: state.records,
      memos: state.memos,
      memoKnowledge: state.memoKnowledge,
    };
  },

  // 云同步：导入数据到前端
  importLocalData: (data) => {
    persistSet(() => ({
      records: data.records || [],
      memos: data.memos || [],
      memoKnowledge: data.memoKnowledge || [],
    }));
  },
  };
});
