import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Sparkles, Trash2, AlertCircle } from 'lucide-react'
import { aiApi } from '@/lib/api'

interface Msg {
  role: 'user' | 'assistant'
  content: string
}

const SUGGESTIONS = [
  '帮我写一封拜访客户的感谢邮件',
  '如何提升销售谈判技巧？',
  '钛合金锻件的市场趋势分析',
  '帮我制定本周工作计划',
]

export default function AiChatPage() {
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight
      }
    })
  }, [])

  useEffect(() => { scrollToBottom() }, [messages, scrollToBottom])

  const send = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    setError('')
    const userMsg: Msg = { role: 'user', content: trimmed }
    const history = [...messages, userMsg]
    setMessages(history)
    setInput('')
    setLoading(true)

    // 占位一条空的 AI 回复，逐块填充
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }])

    const ac = new AbortController()
    abortRef.current = ac

    try {
      // 只发 user/assistant 消息给后端（system 由后端注入）
      const apiMessages = history.map((m) => ({ role: m.role, content: m.content }))
      let accumulated = ''

      await aiApi.chat(apiMessages, (chunk) => {
        accumulated += chunk
        setMessages((prev) => {
          const next = [...prev]
          next[next.length - 1] = { role: 'assistant', content: accumulated }
          return next
        })
      }, ac.signal)

      // 如果 AI 返回空内容
      if (!accumulated) {
        setMessages((prev) => {
          const next = [...prev]
          next[next.length - 1] = { role: 'assistant', content: '（AI 未返回内容，请重试）' }
          return next
        })
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return
      const msg = err.message || '请求失败'
      setMessages((prev) => {
        const next = [...prev]
        next[next.length - 1] = { role: 'assistant', content: '' }
        return next
      })
      setError(msg)
    } finally {
      setLoading(false)
      abortRef.current = null
    }
  }

  const clear = () => {
    if (loading) {
      abortRef.current?.abort()
    }
    setMessages([])
    setError('')
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3rem)]">
      {/* 标题栏 */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center">
            <Sparkles size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">AI 助手</h1>
            <p className="text-xs text-slate-400">多模型智能问答，自由提问任何问题</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button onClick={clear} className="btn-ghost text-sm text-slate-500">
            <Trash2 size={15} /> 清空
          </button>
        )}
      </div>

      {/* 消息区 */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center mb-4 shadow-lg shadow-brand-500/20">
              <Sparkles size={28} className="text-white" />
            </div>
            <h2 className="text-lg font-semibold text-slate-700 mb-1">有什么可以帮你的？</h2>
            <p className="text-sm text-slate-400 mb-6">输入任何问题，AI 会实时回答</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-left px-4 py-3 rounded-xl border border-slate-200 hover:border-brand-300 hover:bg-brand-50/50 text-sm text-slate-600 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex gap-2.5 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                {/* 头像 */}
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-medium ${
                  msg.role === 'user'
                    ? 'bg-slate-200 text-slate-600'
                    : 'bg-gradient-to-br from-brand-500 to-violet-600 text-white'
                }`}>
                  {msg.role === 'user' ? '我' : <Sparkles size={14} />}
                </div>
                {/* 气泡 */}
                <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-brand-600 text-white rounded-tr-md'
                    : 'bg-white border border-slate-200 text-slate-700 rounded-tl-md'
                }`}>
                  {msg.content ? (
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  ) : loading && i === messages.length - 1 ? (
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ))
        )}

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 mx-auto">
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* 输入区 */}
      <div className="shrink-0 border-t border-slate-100 pt-4">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  send(input)
                }
              }}
              placeholder="输入你的问题... (Enter 发送, Shift+Enter 换行)"
              rows={1}
              className="input resize-none min-h-[44px] max-h-32"
              style={{ height: 'auto' }}
              onInput={(e) => {
                const el = e.currentTarget
                el.style.height = 'auto'
                el.style.height = Math.min(el.scrollHeight, 128) + 'px'
              }}
              disabled={loading}
            />
          </div>
          <button
            onClick={() => send(input)}
            disabled={loading || !input.trim()}
            className="btn-primary h-11 px-4"
          >
            {loading ? (
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full border-2 border-white/40 border-t-white animate-spin" />
              </span>
            ) : (
              <Send size={16} />
            )}
          </button>
        </div>
        <p className="text-xs text-slate-300 mt-2 text-center">
          AI 回复仅供参考，重要信息请自行核实
        </p>
      </div>
    </div>
  )
}
