import { useState } from 'react';
import { Plus, Calendar, CheckCircle2, RotateCcw, StickyNote, Mic, Square, BookOpen, Sparkles, X } from 'lucide-react';
import { useWorkbenchStore } from '@/store/useWorkbenchStore';
import { cn } from '@/lib/utils';

// 模拟语音识别文本池
const mockVoiceTexts = [
  '客户提到下季度有新项目启动，需要提前跟进技术方案。',
  '今天拜访中航工业，对方对GH4169锻件的交期比较关注。',
  '竞争对手在钛合金报价上有压价趋势，需要重新评估我们的报价策略。',
  '客户反馈我们上次交付的产品包装需要改进，运输过程有磕碰。',
];

export default function MemoView() {
  const { memos, memoKnowledge, addMemo, addMemoWithVoice, toggleMemoClosed, promoteMemoToSchedule, deleteMemo } = useWorkbenchStore();
  const [inputValue, setInputValue] = useState('');
  const [isRecording, setIsRecording] = useState(false);

  const handleAdd = () => {
    if (!inputValue.trim()) return;
    addMemo(inputValue.trim());
    setInputValue('');
  };

  const handleVoiceToggle = () => {
    if (isRecording) {
      // 停止录音，生成模拟文本填入输入框
      const mockText = mockVoiceTexts[Math.floor(Math.random() * mockVoiceTexts.length)];
      setInputValue(mockText);
      setIsRecording(false);
    } else {
      setIsRecording(true);
    }
  };

  // 提交语音备忘录：写入备忘 + 沉淀知识库
  const handleVoiceSubmit = () => {
    if (!inputValue.trim()) return;
    addMemoWithVoice(inputValue.trim());
    setInputValue('');
  };

  const openMemos = memos.filter((m) => !m.closed);
  const closedMemos = memos.filter((m) => m.closed);

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="bg-white rounded-3xl p-5 shadow-soft">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <StickyNote className="w-4 h-4 text-coffee-500" />
            <h3 className="text-sm font-semibold text-coffee-900">随手记</h3>
          </div>
          <button
            onClick={handleVoiceToggle}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all',
              isRecording
                ? 'bg-alert text-white animate-pulse'
                : 'bg-caramel/20 text-coffee-700 hover:bg-caramel/30'
            )}
          >
            {isRecording ? (
              <>
                <Square className="w-3 h-3 fill-current" />
                <span>停止录音</span>
              </>
            ) : (
              <>
                <Mic className="w-3 h-3" />
                <span>语音输入</span>
              </>
            )}
          </button>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (isRecording ? handleVoiceSubmit() : handleAdd())}
            placeholder={isRecording ? '正在聆听…停止录音后将自动填入' : '想到什么就记下来，比如「客户提到要关注小型化趋势」'}
            className="flex-1 px-4 py-2.5 rounded-xl bg-coffee-50 border-2 border-transparent text-sm text-coffee-800 placeholder:text-coffee-400 focus:outline-none focus:border-coffee-300 focus:bg-white transition-all"
          />
          <button
            onClick={handleAdd}
            disabled={!inputValue.trim() || isRecording}
            className="px-4 py-2.5 bg-coffee-600 text-white rounded-xl text-sm font-medium hover:bg-coffee-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            <span>记一笔</span>
          </button>
          {isRecording && inputValue && (
            <button
              onClick={handleVoiceSubmit}
              className="px-4 py-2.5 bg-caramel text-white rounded-xl text-sm font-medium hover:bg-coffee-600 transition-colors flex items-center gap-1"
            >
              <Sparkles className="w-4 h-4" />
              <span>沉淀</span>
            </button>
          )}
        </div>
        {isRecording && (
          <p className="mt-2 text-xs text-coffee-500 flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-alert animate-pulse" />
            <span>正在录音，停止后将自动生成文本并沉淀为知识库条目</span>
          </p>
        )}
      </div>

      {/* 知识库沉淀区域 */}
      <div className="bg-gradient-to-br from-cream to-coffee-50 rounded-3xl p-5 shadow-soft border border-coffee-100">
        <div className="flex items-center gap-2 mb-3">
          <BookOpen className="w-4 h-4 text-coffee-600" />
          <h3 className="text-sm font-semibold text-coffee-900">知识库沉淀</h3>
          <span className="text-xs text-coffee-400">({memoKnowledge.length})</span>
        </div>
        {memoKnowledge.length === 0 ? (
          <div className="text-center text-sm text-coffee-400 py-6">
            暂无知识条目，使用语音输入备忘录后将自动沉淀
          </div>
        ) : (
          <div className="space-y-2.5">
            {memoKnowledge.map((kb) => (
              <div
                key={kb.id}
                className="bg-white/80 rounded-2xl p-3.5 border border-coffee-100 hover:shadow-soft transition-all"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <h4 className="text-sm font-semibold text-coffee-800 truncate flex-1">{kb.title}</h4>
                  <span className="text-xs text-caramel bg-caramel/10 px-2 py-0.5 rounded-full flex-shrink-0 ml-2">
                    📝 {kb.source}
                  </span>
                </div>
                <p className="text-xs text-coffee-600 leading-relaxed mb-2 line-clamp-2">{kb.summary}</p>
                <p className="text-xs text-coffee-400">{new Date(kb.createdAt).toLocaleString('zh-CN')}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h4 className="text-sm font-semibold text-coffee-700 mb-3 flex items-center gap-2">
          <span>待处理</span>
          <span className="text-xs text-coffee-400">({openMemos.length})</span>
        </h4>
        <div className="space-y-3">
          {openMemos.length === 0 && (
            <div className="bg-white rounded-2xl p-6 text-center text-sm text-coffee-400">
              暂无待处理备忘
            </div>
          )}
          {openMemos.map((memo) => (
            <div
              key={memo.id}
              className="bg-white rounded-2xl p-4 shadow-soft border-l-4 border-l-coffee-400 hover:shadow-card transition-all"
            >
              <p className="text-sm text-coffee-800 leading-relaxed mb-3">{memo.content}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-coffee-400 flex items-center gap-1.5">
                  {memo.source === 'voice' && <span>🎤 语音录入</span>}
                  <span>·</span>
                  <span>{new Date(memo.createdAt).toLocaleString('zh-CN')}</span>
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => promoteMemoToSchedule(memo.id)}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs text-coffee-700 bg-coffee-50 hover:bg-coffee-100 rounded-lg transition-colors"
                  >
                    <Calendar className="w-3 h-3" />
                    <span>生成日程</span>
                  </button>
                  <button
                    onClick={() => toggleMemoClosed(memo.id)}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    <span>闭环</span>
                  </button>
                  <button
                    onClick={() => {
                      if (!confirm('确定删除该备忘吗？')) return;
                      deleteMemo(memo.id);
                    }}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-alert bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                    title="删除"
                  >
                    <X className="w-3 h-3" />
                    <span>删除</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {closedMemos.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-coffee-500 mb-3 flex items-center gap-2">
            <span>已完成</span>
            <span className="text-xs text-coffee-400">({closedMemos.length})</span>
          </h4>
          <div className="space-y-2">
            {closedMemos.map((memo) => (
              <div
                key={memo.id}
                className="bg-coffee-50/50 rounded-2xl p-3 border border-coffee-100 flex items-center gap-3"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <p className="flex-1 text-sm text-coffee-500 line-through">{memo.content}</p>
                <button
                  onClick={() => toggleMemoClosed(memo.id)}
                  className="p-1 text-coffee-400 hover:text-coffee-700 rounded transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
          <p className="text-xs text-coffee-400 mt-3 flex items-center gap-1.5">
            <span>💡</span>
            <span>已闭环的备忘将自动汇入本周月报统计</span>
          </p>
        </div>
      )}
    </div>
  );
}
