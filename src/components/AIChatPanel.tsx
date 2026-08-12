import { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, Loader2, User, Trash2, TrendingUp, FileText, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { aiApi } from '@/services/api';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const QUICK_ACTIONS = [
  { label: '客户分析', icon: Users, prompt: '帮我分析一下中国航发这个客户的跟进策略' },
  { label: '生成周报', icon: FileText, prompt: '请帮我生成本周工作周报' },
  { label: '行业洞察', icon: TrendingUp, prompt: '请分析一下高温合金锻造行业的最新趋势' },
];

export default function AIChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (text?: string) => {
    const content = (text || input).trim();
    if (!content || loading) return;

    const userMsg: ChatMessage = { role: 'user', content };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

    try {
      await aiApi.chat(
        newMessages.map((m) => ({ role: m.role, content: m.content })),
        (chunk) => {
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last && last.role === 'assistant') {
              updated[updated.length - 1] = { ...last, content: last.content + chunk };
            }
            return [...updated];
          });
        }
      );
    } catch (err) {
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last && last.role === 'assistant') {
          updated[updated.length - 1] = {
            ...last,
            content: last.content || `抱歉，AI 服务暂时不可用：${(err as Error).message}`,
          };
        }
        return [...updated];
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setMessages([]);
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-3xl shadow-soft overflow-hidden">
      {/* 头部 */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-coffee-100 bg-gradient-to-r from-coffee-50 to-cream">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-coffee-600 to-caramel flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-coffee-900">AI 智能助手</h3>
            <p className="text-xs text-coffee-400">Powered by DeepSeek · 客户分析 · 报告生成 · 行业洞察</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={handleClear}
            className="flex items-center gap-1 px-3 py-1.5 text-xs text-coffee-500 hover:text-alert hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>清空</span>
          </button>
        )}
      </div>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-6">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-coffee-100 to-caramel/20 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-coffee-500" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-coffee-700 mb-1">有什么可以帮你的？</p>
              <p className="text-xs text-coffee-400">选择下方快捷操作，或直接输入你的问题</p>
            </div>
            <div className="grid grid-cols-3 gap-3 w-full max-w-md">
              {QUICK_ACTIONS.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.label}
                    onClick={() => handleSend(action.prompt)}
                    className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-coffee-50 hover:bg-coffee-100 transition-colors"
                  >
                    <Icon className="w-5 h-5 text-coffee-600" />
                    <span className="text-xs text-coffee-700">{action.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={cn(
              'flex gap-3',
              msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
            )}
          >
            <div
              className={cn(
                'w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0',
                msg.role === 'user'
                  ? 'bg-coffee-600 text-white'
                  : 'bg-gradient-to-br from-coffee-400 to-caramel text-white'
              )}
            >
              {msg.role === 'user' ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
            </div>
            <div
              className={cn(
                'max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap',
                msg.role === 'user'
                  ? 'bg-coffee-600 text-white rounded-tr-md'
                  : 'bg-coffee-50 text-coffee-800 rounded-tl-md'
              )}
            >
              {msg.content || (loading && idx === messages.length - 1 ? '思考中...' : '')}
            </div>
          </div>
        ))}

        {loading && messages[messages.length - 1]?.content === '' && (
          <div className="flex items-center gap-2 text-coffee-400 pl-11">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span className="text-xs">AI 正在思考...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 输入区 */}
      <div className="px-5 py-4 border-t border-coffee-100">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="输入你的问题，按 Enter 发送..."
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl bg-coffee-50 border-2 border-transparent text-sm text-coffee-800 placeholder:text-coffee-400 focus:outline-none focus:border-coffee-300 focus:bg-white transition-all"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
            className="px-4 py-2.5 rounded-xl bg-coffee-600 text-white flex items-center justify-center gap-1.5 hover:bg-coffee-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0 text-sm font-medium"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>发送</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
