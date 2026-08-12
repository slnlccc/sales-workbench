import { useState } from 'react';
import { Sparkles, X, Send, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { aiApi } from '@/services/api';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function FloatingMic() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg: ChatMessage = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    // 添加一个空的 assistant 消息用于流式填充
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
        if (last && last.role === 'assistant' && !last.content) {
          updated[updated.length - 1] = {
            ...last,
            content: `抱歉，AI 服务暂时不可用：${(err as Error).message}`,
          };
        }
        return [...updated];
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* 悬浮按钮 */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-br from-coffee-600 to-caramel text-white shadow-lg hover:shadow-xl flex items-center justify-center transition-all hover:scale-105 z-50"
          title="AI 助手"
        >
          <Sparkles className="w-6 h-6" />
        </button>
      )}

      {/* 对话面板 */}
      {open && (
        <div className="fixed bottom-6 right-6 w-[380px] max-w-[calc(100vw-2rem)] h-[500px] max-h-[calc(100vh-3rem)] bg-white rounded-3xl shadow-2xl flex flex-col z-50 animate-slide-up">
          {/* 头部 */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-coffee-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-coffee-600 to-caramel flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-coffee-900">AI 助手</h3>
                <p className="text-xs text-coffee-400">Powered by DeepSeek</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-coffee-400 hover:text-coffee-700 hover:bg-coffee-50 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 消息列表 */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-coffee-100 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-coffee-500" />
                </div>
                <p className="text-sm text-coffee-500">有什么可以帮你的？</p>
                <p className="text-xs text-coffee-400">可以问我客户分析、报告撰写、行业洞察等</p>
              </div>
            )}
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={cn(
                  'flex gap-2',
                  msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                )}
              >
                <div
                  className={cn(
                    'max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed',
                    msg.role === 'user'
                      ? 'bg-coffee-600 text-white rounded-br-md'
                      : 'bg-coffee-50 text-coffee-800 rounded-bl-md'
                  )}
                >
                  {msg.content || '...'}
                </div>
              </div>
            ))}
            {loading && messages[messages.length - 1]?.content === '' && (
              <div className="flex items-center gap-2 text-coffee-400">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span className="text-xs">AI 正在思考...</span>
              </div>
            )}
          </div>

          {/* 输入区 */}
          <div className="px-4 py-3 border-t border-coffee-100">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="输入你的问题..."
                disabled={loading}
                className="flex-1 px-3.5 py-2 rounded-xl bg-coffee-50 border-2 border-transparent text-sm text-coffee-800 placeholder:text-coffee-400 focus:outline-none focus:border-coffee-300 focus:bg-white transition-all"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className="w-10 h-10 rounded-xl bg-coffee-600 text-white flex items-center justify-center hover:bg-coffee-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
