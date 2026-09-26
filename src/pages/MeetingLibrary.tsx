import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen, Search, ChevronRight, Clock, Tag, User, CheckCircle2,
  Lightbulb, Sparkles, Filter, X, ExternalLink, Trash2,
  Cloud, Zap, Brain, ListTodo, FileText, Settings, Save, AlertCircle, Check,
} from 'lucide-react';
import Layout from '@/components/Layout';
import { cn } from '@/lib/utils';
import { useWorkbenchStore } from '@/store/useWorkbenchStore';
import {
  syncMeetingsFromFeishu, getFeishuConfig, saveFeishuConfig,
  startUserAuth, type FeishuConfig,
} from '@/services/feishuService';
import type { MeetingItem } from '@/types/meeting';

const categories = ['全部', '会议纪要', '方法论', '待办', '感悟'];

export default function MeetingLibrary() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('全部');
  const [selected, setSelected] = useState<MeetingItem | null>(null);
  const [items, setItems] = useState<MeetingItem[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState('未同步');
  const [syncError, setSyncError] = useState('');

  // 跳转 + 工作台 store（用于把待办推到日程、知识沉淀推到知识库）
  const navigate = useNavigate();
  const { setActiveTab, addScheduleFromTodo, addMemoKnowledge, memoKnowledge, records } = useWorkbenchStore();

  // 飞书配置弹窗
  const [showConfig, setShowConfig] = useState(false);
  const [cfg, setCfg] = useState<FeishuConfig>(getFeishuConfig());
  const [cfgSaved, setCfgSaved] = useState(false);

  // 已删除的会议纪要 ID 持久化到 localStorage（避免每次同步都重新出现）
  const DELETED_KEY = 'sw_meeting_deleted_ids';
  const getDeletedIds = (): string[] => {
    try { return JSON.parse(localStorage.getItem(DELETED_KEY) || '[]'); } catch { return []; }
  };
  const addDeletedId = (id: string) => {
    const ids = getDeletedIds();
    if (!ids.includes(id)) {
      ids.push(id);
      localStorage.setItem(DELETED_KEY, JSON.stringify(ids));
    }
  };

  // 自动把会议的 todos 和 insights 推送到语音工作台（去重）
  const autoPushToWorkbench = (meetings: MeetingItem[]) => {
    const today = new Date().toISOString().slice(0, 10);
    // 用 insights/todos 的文本去重，避免重复添加
    const existingKbTitles = new Set(memoKnowledge.map((k: any) => k.title));
    const existingScheduleContents = new Set(records.map((r: any) => r.content));

    meetings.forEach((m) => {
      // 待办 → 日程日历
      m.todos.forEach((todo) => {
        const text = todo.startsWith('✓ ') ? todo.slice(2) : todo;
        if (!existingScheduleContents.has(text)) {
          addScheduleFromTodo(text, today, undefined);
          existingScheduleContents.add(text);
        }
      });
      // 知识沉淀 → 知识库
      m.insights.forEach((insight) => {
        const title = insight.length > 24 ? insight.slice(0, 24) + '…' : insight;
        if (!existingKbTitles.has(title) && !existingKbTitles.has(insight)) {
          addMemoKnowledge({
            id: `kb-meeting-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            title,
            summary: insight,
            source: '会议知识库',
            createdAt: new Date().toISOString(),
          });
          existingKbTitles.add(title);
        }
      });
    });
  };

  // 初始化拉取（自动根据配置走 mock / 真实）
  useEffect(() => {
    handleSync();
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    setSyncError('');
    try {
      const data = await syncMeetingsFromFeishu();
      // 过滤掉已删除的会议纪要
      const deletedIds = getDeletedIds();
      const filtered = data.filter((m) => !deletedIds.includes(m.id));
      setItems(filtered);
      setLastSync(new Date().toLocaleString('zh-CN', { hour12: false }));
      // 同步成功后自动把 todos 和 insights 推送到语音工作台
      autoPushToWorkbench(filtered);
    } catch (e: any) {
      // "Invalid time value" 是 RangeError，从 feishuToMeetingItem 抛出
      // 现在已经修复了 create_time 解析，如果还报错就把 stack 也展示出来
      const errMsg = e?.message || '同步失败';
      console.error('[handleSync] 同步失败:', e);
      setSyncError(errMsg);
    } finally {
      setSyncing(false);
    }
  };

  const handleSaveConfig = () => {
    saveFeishuConfig(cfg);
    setCfgSaved(true);
    setTimeout(() => setCfgSaved(false), 1500);
    // 保存后立即拉一次
    handleSync();
  };

  // 飞书 OAuth 授权：打开子窗口跳转 /api/feishu/login
  // 子窗口回调通过 postMessage 把 code 传回，feishuService 自动换 user token 存 localStorage
  const handleFeishuAuth = () => {
    setSyncing(true);
    setSyncError('');
    startUserAuth(
      async () => {
        // 授权成功 → 更新 cfg 状态 + 自动同步一次
        setCfg(getFeishuConfig());
        setSyncing(false);
        setSyncError('');
        // 自动触发同步
        setTimeout(() => handleSync(), 100);
      },
      (msg) => {
        setSyncing(false);
        setSyncError(msg || '飞书授权失败');
      }
    );
  };

  const filtered = items.filter((m) => {
    const matchSearch = m.title.includes(search) || m.content.includes(search) || m.tags.some((t) => t.includes(search));
    const matchCategory = activeCategory === '全部' || m.category === activeCategory;
    return matchSearch && matchCategory;
  });

  const todoCount = items.reduce((acc, m) => acc + m.todos.length, 0);
  const insightCount = items.reduce((acc, m) => acc + m.insights.length, 0);
  const feishuCount = items.filter((m) => m.source === 'feishu').length;

  // 删除会议纪要：从列表移除 + 持久化到 localStorage（防止下次同步重新出现）
  const handleDelete = (itemId: string) => {
    if (!window.confirm('确定删除这条会议纪要？删除后不可恢复。')) return;
    addDeletedId(itemId);
    setItems((prev) => prev.filter((m) => m.id !== itemId));
    if (selected?.id === itemId) setSelected(null);
  };

  // 待办事项 → 跳转到语音工作台 → 日程日历（并把这条待办创建为日程）
  const handleTodoClick = (todo: string) => {
    const text = todo.startsWith('✓ ') ? todo.slice(2) : todo;
    // 推一条新日程到工作台 store
    addScheduleFromTodo(text, new Date().toISOString().slice(0, 10), undefined);
    // 切到 calendar tab，然后跳转
    setActiveTab('calendar');
    navigate('/voice-workbench');
  };

  // 知识沉淀 → 跳转到语音工作台 → 备忘录 → 知识库沉淀（并加一条）
  const handleInsightClick = (insight: string) => {
    // 截短做标题，全句做摘要
    const title = insight.length > 24 ? insight.slice(0, 24) + '…' : insight;
    addMemoKnowledge({
      id: `kb-${Date.now()}`,
      title,
      summary: insight,
      source: '会议知识库',
      createdAt: new Date().toISOString(),
    });
    setActiveTab('memo');
    navigate('/voice-workbench');
  };

  return (
    <Layout>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-cream-900 font-display">会议知识库</h1>
                <p className="text-xs text-cream-600">
                  {cfg.enabled ? '飞书妙记已打通 · 自动同步' : '飞书妙记 · 智能识别待办 · 知识沉淀'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowConfig(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-white text-cream-700 border border-cream-300 rounded-xl text-sm font-medium hover:bg-cream-100"
              >
                <Settings className="w-4 h-4" />
                <span>飞书配置</span>
                {cfg.enabled && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                )}
              </button>
              {cfg.enabled && !cfg.userAccessToken && (
                <button
                  onClick={handleFeishuAuth}
                  className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700"
                  title="飞书妙记是用户私有数据，必须用 OAuth 授权拿到 user token 后才能拉取"
                >
                  <User className="w-4 h-4" />
                  <span>飞书授权登录</span>
                </button>
              )}
              {cfg.enabled && cfg.userAccessToken && (
                <button
                  onClick={handleFeishuAuth}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white text-emerald-700 border border-emerald-300 rounded-xl text-sm font-medium hover:bg-emerald-50"
                  title="已授权，点击重新授权（access token 过期会自动 refresh，无需手动）"
                >
                  <Check className="w-4 h-4" />
                  <span>已授权</span>
                </button>
              )}
              <button
                onClick={handleSync}
                disabled={syncing}
                className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-60"
              >
                {syncing ? <Cloud className="w-4 h-4 animate-bounce" /> : <Zap className="w-4 h-4" />}
                <span>{syncing ? '同步中...' : '同步飞书妙记'}</span>
              </button>
            </div>
          </div>

          {/* 同步状态条 */}
          <div className="mb-3 flex items-center gap-3 text-xs text-cream-600">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              上次同步：{lastSync}
            </span>
            {cfg.enabled ? (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                已连接飞书
              </span>
            ) : (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                <AlertCircle className="w-3 h-3" />
                未配置飞书，使用演示数据
              </span>
            )}
            {syncError && (
              <span className="flex items-center gap-1 text-red-600">
                <AlertCircle className="w-3 h-3" />
                {syncError}
              </span>
            )}
          </div>

          <div className="grid grid-cols-4 gap-3 mb-4">
            <div className="bg-white rounded-2xl p-4 shadow-soft">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-indigo-600" />
                </div>
                <p className="text-xs text-cream-600">会议纪要</p>
              </div>
              <p className="text-2xl font-bold text-cream-900">{items.length}</p>
              <p className="text-xs text-cream-500 mt-1">条记录</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-soft">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                  <ListTodo className="w-4 h-4 text-amber-600" />
                </div>
                <p className="text-xs text-cream-600">待办事项</p>
              </div>
              <p className="text-2xl font-bold text-cream-900">{todoCount}</p>
              <p className="text-xs text-cream-500 mt-1">项待办</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-soft">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <Lightbulb className="w-4 h-4 text-emerald-600" />
                </div>
                <p className="text-xs text-cream-600">知识沉淀</p>
              </div>
              <p className="text-2xl font-bold text-cream-900">{insightCount}</p>
              <p className="text-xs text-cream-500 mt-1">条见解</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-soft">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Cloud className="w-4 h-4 text-blue-600" />
                </div>
                <p className="text-xs text-cream-600">飞书同步</p>
              </div>
              <p className="text-2xl font-bold text-cream-900">{feishuCount}</p>
              <p className="text-xs text-cream-500 mt-1">来自飞书</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-soft mb-4">
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 text-coffee-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="搜索会议、待办、知识标签..."
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-cream text-sm text-coffee-800 focus:outline-none focus:ring-2 focus:ring-coffee-300 placeholder:text-coffee-300"
                />
              </div>
              <div className="flex items-center gap-1">
                {categories.map((c) => (
                  <button
                    key={c}
                    onClick={() => setActiveCategory(c)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                      activeCategory === c
                        ? 'bg-coffee-600 text-white'
                        : 'bg-cream text-coffee-600 hover:bg-coffee-100'
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              {filtered.map((m) => (
                <div
                  key={m.id}
                  onClick={() => setSelected(m)}
                  className={cn(
                    'bg-white rounded-2xl p-4 shadow-soft hover:shadow-card cursor-pointer transition-all group',
                    selected?.id === m.id && 'ring-2 ring-coffee-300'
                  )}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {m.source === 'feishu' && (
                        <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-600 text-xs font-medium flex items-center gap-0.5">
                          <Cloud className="w-3 h-3" />
                          飞书
                        </span>
                      )}
                      <span className={cn(
                        'px-2 py-0.5 rounded text-xs font-medium',
                        m.category === '会议纪要' && 'bg-indigo-100 text-indigo-700',
                        m.category === '方法论' && 'bg-emerald-100 text-emerald-700',
                        m.category === '待办' && 'bg-amber-100 text-amber-700',
                        m.category === '感悟' && 'bg-purple-100 text-purple-700',
                      )}>
                        {m.category}
                      </span>
                      {m.completed && (
                        <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 text-xs">
                          已归档
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(m.id);
                        }}
                        title="删除"
                        className="p-1 rounded text-coffee-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <ChevronRight className="w-4 h-4 text-coffee-400 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                  <h4 className="text-sm font-semibold text-coffee-900 mb-1.5 line-clamp-1">{m.title}</h4>
                  <p className="text-xs text-coffee-500 line-clamp-2 mb-2 leading-relaxed">{m.content}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-coffee-400">
                      <span className="flex items-center gap-0.5">
                        <Clock className="w-3 h-3" />
                        {m.date}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <User className="w-3 h-3" />
                        {m.author}
                      </span>
                    </div>
                    {m.todos.length > 0 && (
                      <span className="flex items-center gap-1 text-xs text-amber-600">
                        <ListTodo className="w-3 h-3" />
                        {m.todos.length}项待办
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {filtered.length === 0 && (
                <div className="bg-white rounded-2xl p-8 text-center shadow-soft">
                  <p className="text-sm text-coffee-400">暂无匹配的会议记录</p>
                </div>
              )}
            </div>

            <div>
              {selected ? (
                <div className="bg-white rounded-2xl shadow-soft overflow-hidden sticky top-4">
                  <div className="p-5 border-b border-coffee-100">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-lg font-semibold text-coffee-900 mb-1">{selected.title}</h3>
                        <div className="flex items-center gap-3 text-xs text-coffee-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {selected.date}
                          </span>
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {selected.author}
                          </span>
                          {selected.customer && (
                            <span className="flex items-center gap-1">
                              <Tag className="w-3 h-3" />
                              {selected.customer}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {selected.url && (
                          <a
                            href={selected.url}
                            target="_blank"
                            rel="noreferrer"
                            title="查看飞书妙记原文"
                            className="p-1.5 rounded text-indigo-500 hover:bg-indigo-50 transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                        <button
                          onClick={() => handleDelete(selected.id)}
                          title="删除"
                          className="p-1.5 rounded text-coffee-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => setSelected(null)} className="text-coffee-400 hover:text-coffee-600">
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {selected.tags.map((t) => (
                        <span key={t} className="px-2 py-0.5 rounded-full bg-coffee-50 text-coffee-600 text-xs">
                          #{t}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="p-5 border-b border-coffee-100">
                    <h4 className="text-sm font-semibold text-coffee-900 mb-2 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-indigo-500" />
                      会议内容
                    </h4>
                    <p className="text-sm text-coffee-700 leading-relaxed whitespace-pre-wrap">{selected.content}</p>
                  </div>

                  <div className="p-5 border-b border-coffee-100 bg-amber-50/30">
                    <h4 className="text-sm font-semibold text-coffee-900 mb-3 flex items-center gap-2">
                      <ListTodo className="w-4 h-4 text-amber-500" />
                      智能识别待办事项
                      <span className="text-xs font-normal text-coffee-400 ml-auto">
                        AI自动提取
                        <Sparkles className="w-3 h-3 inline ml-0.5" />
                      </span>
                    </h4>
                    <div className="space-y-2">
                      {selected.todos.length === 0 ? (
                        <p className="text-xs text-coffee-400">本次会议未识别到待办事项</p>
                      ) : selected.todos.map((todo, idx) => {
                        const done = todo.startsWith('✓ ');
                        return (
                          <div
                            key={idx}
                            onClick={() => handleTodoClick(todo)}
                            title="点击跳转到日程日历"
                            className={cn(
                              'flex items-start gap-2 p-2.5 rounded-lg cursor-pointer transition-all hover:shadow-soft hover:translate-x-0.5',
                              done ? 'bg-emerald-50' : 'bg-white hover:bg-amber-50 hover:border-amber-200 border border-transparent'
                            )}
                          >
                            <div className={cn(
                              'w-4 h-4 rounded border-2 flex items-center justify-center mt-0.5 flex-shrink-0',
                              done ? 'bg-emerald-500 border-emerald-500' : 'border-amber-400'
                            )}>
                              {done && <CheckCircle2 className="w-3 h-3 text-white" />}
                            </div>
                            <span className={cn(
                              'text-sm flex-1',
                              done ? 'text-coffee-400 line-through' : 'text-coffee-700'
                            )}>
                              {done ? todo.slice(2) : todo}
                            </span>
                            <ChevronRight className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="p-5">
                    <h4 className="text-sm font-semibold text-coffee-900 mb-3 flex items-center gap-2">
                      <Brain className="w-4 h-4 text-emerald-500" />
                      知识沉淀
                      <span className="text-xs font-normal text-coffee-400 ml-auto">
                        AI自动提炼
                        <Sparkles className="w-3 h-3 inline ml-0.5" />
                      </span>
                    </h4>
                    <div className="space-y-2">
                      {selected.insights.length === 0 ? (
                        <p className="text-xs text-coffee-400">本次会议未提炼出知识沉淀</p>
                      ) : selected.insights.map((insight, idx) => (
                        <div
                          key={idx}
                          onClick={() => handleInsightClick(insight)}
                          title="点击跳转到知识库沉淀"
                          className="flex items-start gap-2 p-3 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg cursor-pointer hover:shadow-soft hover:translate-x-0.5 transition-all border border-transparent hover:border-emerald-200"
                        >
                          <Lightbulb className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-coffee-700 leading-relaxed flex-1">{insight}</p>
                          <ChevronRight className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl p-12 shadow-soft flex flex-col items-center justify-center text-center sticky top-4">
                  <div className="w-16 h-16 rounded-2xl bg-coffee-50 flex items-center justify-center mb-4">
                    <BookOpen className="w-8 h-8 text-coffee-300" />
                  </div>
                  <h3 className="text-base font-semibold text-coffee-900 mb-1">选择一条记录查看详情</h3>
                  <p className="text-sm text-coffee-500 mb-4">AI自动识别待办事项 · 智能提炼知识见解</p>
                  <div className="flex items-center gap-2 text-xs text-coffee-400">
                    <Cloud className="w-4 h-4" />
                    <span>{cfg.enabled ? '飞书妙记已连通，自动同步会议纪要' : '点击「飞书配置」连接你的飞书工作台'}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
      {/* 飞书配置弹窗 */}
      {showConfig && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-coffee-900/40 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowConfig(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-lg w-full shadow-card overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-coffee-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Cloud className="w-4 h-4 text-blue-600" />
                </div>
                <h3 className="text-base font-semibold text-coffee-900">飞书妙记集成配置</h3>
              </div>
              <button
                onClick={() => setShowConfig(false)}
                className="p-1.5 hover:bg-coffee-50 rounded-lg text-coffee-400 hover:text-coffee-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800 leading-relaxed">
                在飞书开放平台创建应用并申请
                <code className="px-1 mx-0.5 bg-white rounded text-blue-700">minutes:minutes:readonly</code>
                权限，将 App ID 与 App Secret 填入下方。系统会通过 Webhook 接收新会议纪要并自动识别待办与知识。
              </div>

              <div>
                <label className="text-xs text-coffee-500 mb-1.5 block">App ID</label>
                <input
                  value={cfg.appId}
                  onChange={(e) => setCfg({ ...cfg, appId: e.target.value })}
                  placeholder="cli_xxxxxxxxxxxxxxxx"
                  className="w-full px-3 py-2 rounded-xl bg-cream text-sm text-coffee-800 focus:outline-none focus:ring-2 focus:ring-coffee-300 font-mono"
                />
              </div>

              <div>
                <label className="text-xs text-coffee-500 mb-1.5 block">App Secret</label>
                <input
                  type="password"
                  value={cfg.appSecret}
                  onChange={(e) => setCfg({ ...cfg, appSecret: e.target.value })}
                  placeholder="xxxxxxxxxxxxxxxxxxxxxxxx"
                  className="w-full px-3 py-2 rounded-xl bg-cream text-sm text-coffee-800 focus:outline-none focus:ring-2 focus:ring-coffee-300 font-mono"
                />
              </div>

              <div>
                <label className="text-xs text-coffee-500 mb-1.5 block">Webhook URL（接收新会议推送）</label>
                <input
                  value={cfg.webhookUrl}
                  onChange={(e) => setCfg({ ...cfg, webhookUrl: e.target.value })}
                  placeholder="https://your-domain.com/api/feishu/webhook"
                  className="w-full px-3 py-2 rounded-xl bg-cream text-sm text-coffee-800 focus:outline-none focus:ring-2 focus:ring-coffee-300 font-mono"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={cfg.enabled}
                  onChange={(e) => setCfg({ ...cfg, enabled: e.target.checked })}
                  className="w-4 h-4 rounded border-coffee-300 text-coffee-600 focus:ring-coffee-500"
                />
                <span className="text-sm text-coffee-700">启用飞书妙记同步</span>
              </label>
            </div>

            <div className="p-5 border-t border-coffee-100 flex gap-2">
              <button
                onClick={() => setShowConfig(false)}
                className="flex-1 py-2.5 bg-white text-coffee-600 rounded-xl text-sm font-medium border border-coffee-200 hover:bg-coffee-50"
              >
                取消
              </button>
              <button
                onClick={handleSaveConfig}
                className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-medium hover:opacity-90 flex items-center justify-center gap-1"
              >
                {cfgSaved ? <><Check className="w-4 h-4" /> 已保存</> : <><Save className="w-4 h-4" /> 保存并同步</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
