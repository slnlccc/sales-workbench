import { useState } from 'react'
import { Mic, Sparkles } from 'lucide-react'
import { useWorkbenchStore } from '@/store/useWorkbenchStore'
import { cn } from '@/lib/utils'
import AIChatPanel from './AIChatPanel'

export default function FloatingMic() {
  const { isRecording, setIsRecording } = useWorkbenchStore()
  const [showAI, setShowAI] = useState(false)

  return (
    <>
      {/* AI 助手按钮 */}
      <button
        onClick={() => setShowAI(true)}
        className="fixed bottom-6 right-20 md:bottom-8 md:right-24 z-50 w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center shadow-float transition-all duration-300 hover:scale-110 bg-cream-700 hover:bg-cream-800"
        aria-label="AI 助手"
      >
        <Sparkles className="w-6 h-6 text-white" />
      </button>

      {/* 语音录音按钮 */}
      <button
        onClick={() => setIsRecording(!isRecording)}
        className={cn(
          'fixed bottom-6 right-6 md:bottom-8 md:right-8 z-50 w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center shadow-float transition-all duration-300 hover:scale-110 hover:shadow-[0_16px_48px_rgba(107,74,48,0.35)]',
          isRecording ? 'bg-alert animate-pulse' : 'gradient-coffee'
        )}
        aria-label={isRecording ? '停止录音' : '开始录音'}
      >
        <Mic className="w-6 h-6 text-white" />
        {!isRecording && (
          <span className="absolute inset-0 rounded-full border-2 border-coffee-300/40 animate-pulse-ring" />
        )}
      </button>

      {/* AI 对话面板 */}
      {showAI && <AIChatPanel onClose={() => setShowAI(false)} />}
    </>
  )
}
