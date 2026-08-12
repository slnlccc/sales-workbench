import { useState } from 'react';
import { MessageSquare, Mic, Sparkles, CalendarClock, User, Tag, Check, X, ArrowLeft, Plus, Pencil, Save } from 'lucide-react';
import { useWorkbenchStore } from '@/store/useWorkbenchStore';
import { cn } from '@/lib/utils';

interface ExtractedTask {
  id: string;
  content: string;
  dateStr: string;
  timeStr: string;
  customer: string;
  types: string[];
  typeLabels: string[];
}

const CUSTOMER_KEYWORDS = ['中国航发', '航天科工', '中航工业', '润和', '润和机械', '派克', '派克新材', '中国商飞'];

const TYPE_OPTIONS = [
  { value: 'schedule', label: '日程提醒' },
  { value: 'meeting', label: '会议' },
  { value: 'order', label: '订单' },
  { value: 'visit', label: '客户拜访' },
  { value: 'quote', label: '报价跟进' },
  { value: 'call', label: '电话跟进' },
  { value: 'contract', label: '合同跟进' },
  { value: 'report', label: '报告汇报' },
  { value: 'memo', label: '备忘录' },
  { value: 'task', label: '待办事项' },
];

const SPLIT_PATTERNS = [
  /[，；;。、]/g,
  /\s*(?:另外|还有|还|再|然后|接着|同时|以及|和|并且|而且)\s*/g,
  /\s*(?:，|；|;|。|、)\s*/g,
];

const splitTasks = (text: string): string[] => {
  let segments = [text];

  for (const pattern of SPLIT_PATTERNS) {
    const newSegments: string[] = [];
    for (const seg of segments) {
      const parts = seg.split(pattern).filter(s => s.trim().length > 0);
      newSegments.push(...parts);
    }
    segments = newSegments;
  }

  segments = segments.map(s => s.trim()).filter(s => s.length > 1);

  if (segments.length <= 1) return [text];

  const results: string[] = [];

  for (const seg of segments) {
    const hasOwnDate = /(明天|后天|大后天|今天|下周|本周|周[一二三四五六日天]|星期[一二三四五六日天]|\d{1,2}[日号]|早上|下午|晚上|傍晚|中午|上午)/.test(seg);
    const hasOwnTime = /\d{1,2}[点时:：]/.test(seg);

    if ((hasOwnDate || hasOwnTime) && results.length > 0) {
      results.push(seg);
    } else if (results.length > 0) {
      const last = results[results.length - 1];
      results[results.length - 1] = last + '，' + seg;
    } else {
      results.push(seg);
    }
  }

  return results.length > 0 ? results : [text];
};

const extractCustomer = (text: string): string => {
  for (const c of CUSTOMER_KEYWORDS) {
    if (text.includes(c)) {
      if (c === '润和') return '润和机械';
      if (c === '派克') return '派克新材';
      return c;
    }
  }
  const match = text.match(/(给|和|与|跟|客户|拜访|致电|跟进)\s*([\u4e00-\u9fa5]{2,8}(?:机械|新材|工业|科技|公司|集团)?)/);
  if (match && match[2]) {
    const name = match[2];
    if (name.length <= 10) return name;
  }
  return '';
};

const extractCoreContent = (text: string): string => {
  let content = text;

  content = content.replace(/^(明天|后天|大后天|今天|下周|本周)(早上|上午|下午|晚上|傍晚|中午)?\s*\d{1,2}[点:：]\d{0,2}\s*(左右|前后|钟)?\s*/, '');
  content = content.replace(/^(明天|后天|大后天|今天|下周|本周)\s*/, '');
  content = content.replace(/^(早上|上午|下午|晚上|傍晚|中午)\s*\d{1,2}[点:：]\d{0,2}\s*(左右|前后|钟)?\s*/, '');
  content = content.replace(/\d{1,2}[月日号]\s*\d{1,2}[点:：]\d{0,2}\s*(左右|前后|钟)?\s*/, '');
  content = content.replace(/^周[一二三四五六日天]\s*/, '');
  content = content.replace(/^星期[一二三四五六日天]\s*/, '');

  content = content.replace(/^(给|和|与|跟)[\u4e00-\u9fa5]{2,10}\s*/, '');

  content = content.replace(/^(提醒我|记得|要|需要|得|应该|必须|准备|完成|提交|交|做|处理|弄|搞定)\s*/, '');
  content = content.replace(/一下/g, '');

  content = content.replace(/^[，。；、\s]+/, '').replace(/[，。；、\s]+$/, '');

  return content.trim() || text;
};

const parseTimeKeyword = (text: string, baseDate?: Date): { date: Date; dateStr: string; timeStr: string; hasDate: boolean; hasTime: boolean } => {
  const now = new Date();
  const result = baseDate ? new Date(baseDate) : new Date(now);
  let hasDate = false;
  let hasTime = false;

  if (text.includes('大后天')) {
    result.setDate(result.getDate() + 3);
    hasDate = true;
  } else if (text.includes('后天')) {
    result.setDate(result.getDate() + 2);
    hasDate = true;
  } else if (text.includes('下周')) {
    result.setDate(result.getDate() + 7);
    hasDate = true;
  } else if (text.includes('明天')) {
    result.setDate(result.getDate() + 1);
    hasDate = true;
  } else if (text.includes('今天') || text.includes('今日')) {
    hasDate = true;
  }

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

  const dayMatch = text.match(/(\d{1,2})[日号]/);
  if (dayMatch) {
    const day = parseInt(dayMatch[1], 10);
    if (day >= 1 && day <= 31) {
      result.setDate(day);
      hasDate = true;
    }
  }

  const timeMatch = text.match(/(\d{1,2})[点时:：](\d{1,2})?\s*(半|刻|左右|前后|钟)?/);
  if (timeMatch) {
    let hour = parseInt(timeMatch[1], 10);
    const minute = timeMatch[2] ? parseInt(timeMatch[2], 10) : (timeMatch[3] === '半' ? 30 : 0);

    const isMorning = text.includes('早上') || text.includes('上午');
    const isAfternoon = text.includes('下午') || text.includes('傍晚') || text.includes('黄昏');
    const isEvening = text.includes('晚上') || text.includes('夜里') || text.includes('深夜');
    const isNoon = text.includes('中午') || text.includes('正午');

    if (isAfternoon || isEvening) {
      if (hour < 12) {
        hour += 12;
      }
    } else if (isMorning && hour === 12) {
      hour = 0;
    } else if (isNoon) {
      if (hour < 6) hour += 12;
    } else if (!isMorning && hour >= 1 && hour <= 6) {
      hour += 12;
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

  const dateStr = `${result.getFullYear()}-${String(result.getMonth() + 1).padStart(2, '0')}-${String(result.getDate()).padStart(2, '0')}`;
  const timeStr = `${String(result.getHours()).padStart(2, '0')}:${String(result.getMinutes()).padStart(2, '0')}`;

  return { date: result, dateStr, timeStr, hasDate, hasTime };
};

const detectTypes = (text: string): { types: string[]; labels: string[] } => {
  const t = text.toLowerCase();
  const types: string[] = [];
  const labels: string[] = [];

  // 周报/日报/月报 → 待办 task，不要生成日程
  if (t.includes('周报') || t.includes('日报') || t.includes('月报')
      || t.includes('周报总结')
      || (t.includes('总结') && (t.includes('工作') || t.includes('周'))
         && !/(明天|后天|下周|今天|\d{1,2}[日号])/.test(t))) {
    types.push('task');
    labels.push('待办事项');
    return { types, labels };
  }

  // 检测具体业务类型
  if (t.includes('报价')) { types.push('quote'); labels.push('报价跟进'); }
  if (t.includes('订单') || t.includes('下单')) { types.push('order'); labels.push('订单'); }
  if (t.includes('拜访') || t.includes('访问') || t.includes('见面')) { types.push('visit'); labels.push('客户拜访'); }
  if (t.includes('电话') || t.includes('致电') || t.includes('联系') || t.includes('沟通')) { types.push('call'); labels.push('电话跟进'); }
  if (t.includes('会议') || t.includes('开会')) { types.push('meeting'); labels.push('会议'); }
  if (t.includes('合同')) { types.push('contract'); labels.push('合同跟进'); }
  if (t.includes('备忘') || t.includes('记一下') || t.includes('记录') || t.includes('感受')) { types.push('memo'); labels.push('备忘录'); }
  // 报告/汇报 → meeting（不要自动带日程，除非用户明确说了时间+提醒词）
  if (t.includes('报告') || t.includes('汇报')) { types.push('meeting'); labels.push('报告汇报'); }

  // 日程提醒：只有明确的时间 + 提醒词组合时才标为 schedule
  const hasTimeKeyword = /(明天|后天|大后天|今天|下周|本周|周[一二三四五六日天]|星期[一二三四五六日天]|\d{1,2}[日号])/.test(text);
  const hasReminderWord = /(提醒|记得|交|提交|完成|跟进|开项目|开会|拜访|联系|致电|沟通|准备)/.test(text);
  if (hasTimeKeyword && hasReminderWord && !types.includes('schedule')) {
    types.unshift('schedule');
    labels.unshift('日程提醒');
  }

  // 如果没有匹配到任何类型，默认为待办事项
  if (types.length === 0) {
    types.push('task');
    labels.push('待办事项');
  }

  return { types, labels };
};

const extractTasks = (text: string): ExtractedTask[] => {
  const segments = splitTasks(text);
  const tasks: ExtractedTask[] = [];
  let sharedDate: Date | undefined = undefined;
  let hasSharedDate = false;

  const firstParse = parseTimeKeyword(segments[0]);
  if (firstParse.hasDate && segments.length > 1) {
    sharedDate = firstParse.date;
    hasSharedDate = true;
  }

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    let parseResult;

    if (hasSharedDate && i > 0) {
      const segHasDate = /(明天|后天|大后天|今天|下周|本周|周[一二三四五六日天]|星期[一二三四五六日天]|\d{1,2}[日号])/.test(seg);
      if (!segHasDate && sharedDate) {
        parseResult = parseTimeKeyword(seg, sharedDate);
      } else {
        parseResult = parseTimeKeyword(seg);
      }
    } else {
      parseResult = parseTimeKeyword(seg);
    }

    const customer = extractCustomer(seg);
    const coreContent = extractCoreContent(seg);
    const { types, labels: typeLabels } = detectTypes(seg);

    tasks.push({
      id: `task-${i}-${Date.now()}`,
      content: coreContent,
      dateStr: parseResult.dateStr,
      timeStr: parseResult.timeStr,
      customer,
      types,
      typeLabels,
    });
  }

  return tasks;
};

export default function TextInputArea() {
  const { inputText, setInputText, addRecord, addVoiceTask, addMemoWithVoice, isRecording, clearInput, setActiveTab } = useWorkbenchStore();
  const [analyzing, setAnalyzing] = useState(false);
  const [extractedTasks, setExtractedTasks] = useState<ExtractedTask[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editTypes, setEditTypes] = useState<string[]>([]);

  const handleAnalyze = () => {
    if (!inputText.trim()) return;
    setAnalyzing(true);
    setTimeout(() => {
      const text = inputText.trim();
      const tasks = extractTasks(text);
      setExtractedTasks(tasks);
      setAnalyzing(false);
    }, 800);
  };

  const handleConfirm = () => {
    if (extractedTasks.length === 0) return;

    let hasSchedule = false;
    let hasMemo = false;

    for (const task of extractedTasks) {
      const isMemo = task.types.includes('memo');
      const hasScheduleType = task.types.some(t => t !== 'memo');

      if (isMemo) {
        addMemoWithVoice(task.content);
        hasMemo = true;
      }
      if (hasScheduleType) {
        const fullText = `${task.dateStr} ${task.timeStr} ${task.content}`;
        addVoiceTask(fullText);
        hasSchedule = true;
      }
      // 如果只有 memo 类型，上面已处理；如果同时有日程和备忘，两边都存
    }

    setExtractedTasks([]);
    clearInput();
    setEditingId(null);

    if (hasSchedule) {
      setActiveTab('calendar');
    } else if (hasMemo) {
      setActiveTab('memo');
    }
  };

  const handleCancel = () => {
    setExtractedTasks([]);
    setEditingId(null);
  };

  const handleReedit = () => {
    setExtractedTasks([]);
    setEditingId(null);
  };

  const handleDeleteTask = (id: string) => {
    setExtractedTasks(prev => prev.filter(t => t.id !== id));
    if (editingId === id) {
      setEditingId(null);
    }
  };

  const handleAddTask = () => {
    setExtractedTasks(prev => [
      ...prev,
      {
        id: `task-new-${Date.now()}`,
        content: '',
        dateStr: new Date().toISOString().split('T')[0],
        timeStr: '09:00',
        customer: '',
        types: ['task'],
        typeLabels: ['待办事项'],
      },
    ]);
  };

  const handleStartEdit = (task: ExtractedTask) => {
    setEditingId(task.id);
    setEditContent(task.content);
    setEditDate(task.dateStr);
    setEditTime(task.timeStr);
    setEditTypes([...task.types]);
  };

  const handleToggleEditType = (typeValue: string) => {
    setEditTypes(prev =>
      prev.includes(typeValue)
        ? prev.filter(t => t !== typeValue)
        : [...prev, typeValue]
    );
  };

  const handleSaveEdit = () => {
    if (!editingId) return;

    const typeLabels = editTypes
      .map(tv => TYPE_OPTIONS.find(t => t.value === tv)?.label || tv)
      .filter(Boolean);

    const finalTypes = editTypes.length > 0 ? editTypes : ['task'];
    const finalLabels = typeLabels.length > 0 ? typeLabels : ['待办事项'];

    setExtractedTasks(prev => prev.map(t =>
      t.id === editingId
        ? { ...t, content: editContent, dateStr: editDate, timeStr: editTime, types: finalTypes, typeLabels: finalLabels }
        : t
    ));
    setEditingId(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  return (
    <div
      className="bg-white rounded-3xl p-6 shadow-soft animate-slide-up"
      style={{ animationDelay: '0.4s' }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-coffee-100 flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-coffee-700" />
          </div>
          <h3 className="text-base font-semibold text-coffee-900">告诉我你做了什么 / 要做什么</h3>
        </div>
        {isRecording && (
          <span className="flex items-center gap-1.5 text-xs text-alert">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-alert animate-pulse" />
            <span>语音模式 · 将自动解析时间并生成日程</span>
          </span>
        )}
      </div>

      {extractedTasks.length === 0 && (
        <>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="例如：明天早上8点交出差报告，下午4点给润和报价... 也可以点击麦克风直接说话"
            className={cn(
              'w-full min-h-[120px] p-4 rounded-2xl bg-coffee-50 border-2 border-transparent text-coffee-800 placeholder:text-coffee-400 resize-none focus:outline-none focus:border-coffee-300 focus:bg-white transition-all duration-200 text-sm leading-relaxed',
              isRecording && 'border-coffee-300 bg-coffee-50/50'
            )}
          />

          <div className="flex items-center justify-end gap-3 mt-4">
            <button
              onClick={clearInput}
              className="px-4 py-2 text-sm text-coffee-500 hover:text-coffee-700 hover:bg-coffee-50 rounded-xl transition-colors"
            >
              清除
            </button>
            <button
              onClick={handleAnalyze}
              disabled={!inputText.trim() || analyzing}
              className={cn(
                'flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium rounded-full shadow-sm hover:shadow-md disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200',
                isRecording
                  ? 'bg-caramel text-white hover:bg-coffee-600'
                  : 'bg-gradient-to-r from-coffee-600 to-caramel text-white hover:opacity-90'
              )}
            >
              {analyzing ? (
                <>
                  <Sparkles className="w-4 h-4 animate-spin" />
                  <span>AI分析中...</span>
                </>
              ) : isRecording ? (
                <>
                  <Mic className="w-4 h-4" />
                  <span>提交语音任务</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>AI分析提取</span>
                </>
              )}
            </button>
          </div>
        </>
      )}

      {extractedTasks.length > 0 && (
        <div className="animate-fade-in">
          <div className="mb-4 p-3 bg-coffee-50 rounded-xl">
            <p className="text-xs text-coffee-400 mb-1">原文</p>
            <p className="text-sm text-coffee-600">{inputText}</p>
          </div>

          <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-5 mb-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-coffee-900">AI提取结果</h4>
                  <p className="text-xs text-coffee-500">共提取 {extractedTasks.length} 条事项，可编辑可删除</p>
                </div>
              </div>
              <button
                onClick={handleAddTask}
                className="flex items-center gap-1 px-3 py-1.5 text-xs text-amber-700 bg-amber-100 rounded-full hover:bg-amber-200 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>新增</span>
              </button>
            </div>

            <div className="space-y-4">
              {extractedTasks.map((task, index) => (
                <div
                  key={task.id}
                  className="relative bg-white rounded-xl p-4 border border-amber-100"
                >
                  <div className="absolute -left-2 -top-2 w-5 h-5 rounded-full bg-amber-500 text-white text-xs flex items-center justify-center font-medium">
                    {index + 1}
                  </div>
                  <button
                    onClick={() => handleDeleteTask(task.id)}
                    className="absolute -right-2 -top-2 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
                    title="删除"
                  >
                    <X className="w-3 h-3" />
                  </button>

                  {editingId === task.id ? (
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-coffee-400 block mb-1">事项内容</label>
                        <input
                          type="text"
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-amber-200 rounded-lg focus:outline-none focus:border-amber-400 text-coffee-900"
                        />
                      </div>
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <label className="text-xs text-coffee-400 block mb-1">日期</label>
                          <input
                            type="date"
                            value={editDate}
                            onChange={(e) => setEditDate(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-amber-200 rounded-lg focus:outline-none focus:border-amber-400 text-coffee-900"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-xs text-coffee-400 block mb-1">时间</label>
                          <input
                            type="time"
                            value={editTime}
                            onChange={(e) => setEditTime(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-amber-200 rounded-lg focus:outline-none focus:border-amber-400 text-coffee-900"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-coffee-400 block mb-1">事项类型（可多选）</label>
                        <div className="flex flex-wrap gap-1.5">
                          {TYPE_OPTIONS.map(opt => {
                            const selected = editTypes.includes(opt.value);
                            return (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => handleToggleEditType(opt.value)}
                                className={cn(
                                  'px-2.5 py-1 text-xs rounded-full border transition-all',
                                  selected
                                    ? 'bg-amber-500 text-white border-amber-500'
                                    : 'bg-white text-coffee-500 border-coffee-200 hover:border-amber-300'
                                )}
                              >
                                {selected && <Check className="w-3 h-3 inline mr-0.5" />}
                                {opt.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end pt-1">
                        <button
                          onClick={handleCancelEdit}
                          className="px-3 py-1.5 text-xs text-coffee-500 hover:text-coffee-700 rounded-lg transition-colors"
                        >
                          取消
                        </button>
                        <button
                          onClick={handleSaveEdit}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs text-white bg-amber-500 hover:bg-amber-600 rounded-lg transition-colors"
                        >
                          <Save className="w-3 h-3" />
                          保存
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      <div className="flex items-start gap-2.5">
                        <div className="w-6 h-6 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Tag className="w-3 h-3 text-amber-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-coffee-400">事项类型</p>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            {task.typeLabels.map((label, idx) => {
                              const typeVal = task.types[idx];
                              return (
                                <span key={idx} className={cn(
                                  'inline-block px-2 py-0.5 rounded-full text-xs font-medium',
                                  typeVal === 'schedule' && 'bg-blue-100 text-blue-700',
                                  typeVal === 'order' && 'bg-emerald-100 text-emerald-700',
                                  typeVal === 'memo' && 'bg-purple-100 text-purple-700',
                                  typeVal === 'meeting' && 'bg-indigo-100 text-indigo-700',
                                  typeVal === 'quote' && 'bg-orange-100 text-orange-700',
                                  typeVal === 'visit' && 'bg-cyan-100 text-cyan-700',
                                  typeVal === 'call' && 'bg-teal-100 text-teal-700',
                                  typeVal === 'contract' && 'bg-rose-100 text-rose-700',
                                  typeVal === 'report' && 'bg-amber-100 text-amber-700',
                                  typeVal === 'task' && 'bg-gray-100 text-gray-700',
                                )}>
                                  {label}
                                </span>
                              );
                            })}
                            <button
                              onClick={() => handleStartEdit(task)}
                              className="text-xs text-amber-600 hover:text-amber-700 flex items-center gap-0.5 transition-colors"
                            >
                              <Pencil className="w-3 h-3" />
                              编辑
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-2.5">
                        <div className="w-6 h-6 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <MessageSquare className="w-3 h-3 text-amber-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-coffee-400">事项内容</p>
                          <p className="text-sm font-medium text-coffee-900 mt-0.5">{task.content}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2.5">
                        <div className="w-6 h-6 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <CalendarClock className="w-3 h-3 text-amber-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-coffee-400">时间</p>
                          <p className="text-sm font-medium text-coffee-900 mt-0.5">
                            {task.dateStr} {task.timeStr}
                          </p>
                        </div>
                      </div>

                      {task.customer && (
                        <div className="flex items-start gap-2.5">
                          <div className="w-6 h-6 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <User className="w-3 h-3 text-amber-600" />
                          </div>
                          <div className="flex-1">
                            <p className="text-xs text-coffee-400">关联客户</p>
                            <p className="text-sm font-medium text-coffee-900 mt-0.5">{task.customer}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleReedit}
              className="flex items-center gap-1.5 px-4 py-2.5 text-sm text-coffee-600 bg-white border border-coffee-200 rounded-full hover:bg-coffee-50 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>重新编辑</span>
            </button>
            <button
              onClick={handleCancel}
              className="flex items-center gap-1.5 px-4 py-2.5 text-sm text-coffee-500 hover:text-coffee-700 rounded-full hover:bg-coffee-50 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              <span>取消</span>
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 flex items-center justify-center gap-1.5 px-5 py-2.5 text-sm font-medium rounded-full bg-gradient-to-r from-coffee-600 to-caramel text-white hover:opacity-90 shadow-sm hover:shadow-md transition-all"
            >
              <Check className="w-4 h-4" />
              <span>确认添加 {extractedTasks.length} 条</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}