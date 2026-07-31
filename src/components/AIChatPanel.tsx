import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Loader2, Sparkles, X } from 'lucide-react'
import { aiApi } from '@/services/api'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface AIChatPanelProps {
  onClose: () => void
  context?: string
}

export default function AIChatPanel({ onClose, context }: AIChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: '你好！我是销售工作台 AI 助手，可以帮你：\n\n• 解析语音指令，自动创建工作记录\n• 分析客户画像，提供跟进建议\n• 生成周报、出差报告、拜访纪要\n• 查询金属价格、行业资讯\n\n请告诉我你需要什么帮助？',
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSend = async () => {
    if (!input.trim() || loading) return

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const result = await aiApi.voiceAssistant(userMessage.content, context)
      const reply = result.data?.reply || result.data?.action || JSON.stringify(result.data)
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: reply, timestamp: new Date() },
      ])
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `抱歉，AI 服务暂时不可用：${err.message}`,
          timestamp: new Date(),
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const quickActions = [
    { label: '分析客户', prompt: '帮我分析当前客户的跟进策略' },
    { label: '生成周报', prompt: '帮我生成本周工作周报' },
    { label: '金属行情', prompt: '今天金属原材料价格如何？' },
    { label: '行业资讯', prompt: '最近有什么重要的行业资讯？' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative w-full sm:max-w-lg h-full sm:h-[600px] bg-white sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-cream-200 bg-cream-50">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cream-600 to-cream-800 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-cream-900 text-sm">AI 智能助手</h3>
            <p className="text-xs text-cream-500">DeepSeek 驱动</p>
          </div>
          <button onClick={onClose} className="ml-auto p-1.5 rounded-lg hover:bg-cream-200">
            <X className="w-5 h-5 text-cream-600" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                msg.role === 'user' ? 'bg-cream-600' : 'bg-cream-100'
              }`}>
                {msg.role === 'user' ? (
                  <User className="w-4 h-4 text-white" />
                ) : (
                  <Bot className="w-4 h-4 text-cream-700" />
                )}
              </div>
              <div className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-cream-600 text-white rounded-br-md'
                  : 'bg-cream-100 text-cream-900 rounded-bl-md'
              }`}>
                {msg.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-cream-100 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-cream-700" />
              </div>
              <div className="bg-cream-100 px-4 py-3 rounded-2xl rounded-bl-md">
                <Loader2 className="w-4 h-4 text-cream-500 animate-spin" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Actions */}
        {messages.length <= 1 && (
          <div className="px-4 pb-2 flex flex-wrap gap-2">
            {quickActions.map((action) => (
              <button
                key={action.label}
                onClick={() => { setInput(action.prompt) }}
                className="px-3 py-1.5 text-xs font-medium rounded-full bg-cream-100 text-cream-700 hover:bg-cream-200 transition-colors"
              >
                {action.label}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="p-3 border-t border-cream-200 bg-cream-50">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="输入消息..."
              className="flex-1 px-4 py-2.5 rounded-xl bg-white border border-cream-300 text-sm focus:outline-none focus:border-cream-600 focus:ring-1 focus:ring-cream-600"
              disabled={loading}
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="px-4 py-2.5 rounded-xl bg-cream-600 text-white hover:bg-cream-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
