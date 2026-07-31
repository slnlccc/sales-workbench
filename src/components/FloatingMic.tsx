import { useState, useEffect } from 'react';
import { Mic, Sparkles, AlertTriangle, CheckCircle } from 'lucide-react';
import { useWorkbenchStore } from '@/store/useWorkbenchStore';
import { cn } from '@/lib/utils';
import AIChatPanel from './AIChatPanel';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';

const mockVoiceTexts = [
  '明天早上8点交出差报告，客户是中国航发',
  '后天下午3点拜访航天科工，讨论钛合金方案',
  '下周一上午10点和中航工业开项目会',
];

export default function FloatingMic() {
  const { isRecording, setIsRecording, addVoiceTask, setActiveTab } = useWorkbenchStore();
  const [showAI, setShowAI] = useState(false);
  const [showTip, setShowTip] = useState(false);
  const [tipType, setTipType] = useState<'success' | 'error' | 'info'>('info');
  const [tipMessage, setTipMessage] = useState('');

  const {
    transcript,
    isListening,
    status,
    error,
    isSupported,
    start,
    stop,
    reset,
  } = useSpeechRecognition({
    lang: 'zh-CN',
    continuous: true,
    interimResults: true,
  });

  // 同步录音状态
  useEffect(() => {
    if (isListening && !isRecording) {
      setIsRecording(true);
    }
  }, [isListening, isRecording, setIsRecording]);

  // 显示识别提示
  useEffect(() => {
    if (status === 'error' && error) {
      showNotification('error', error);
    }
  }, [status, error]);

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setTipType(type);
    setTipMessage(message);
    setShowTip(true);
    setTimeout(() => setShowTip(false), 3000);
  };

  const handleMicClick = () => {
    if (isListening) {
      // 停止录音并处理
      stop();
      setTimeout(() => {
        const text = transcript.trim();
        if (text) {
          addVoiceTask(text);
          setActiveTab('calendar');
          setIsRecording(false);
          showNotification('success', `已录入: ${text.length > 30 ? text.slice(0, 30) + '…' : text}`);
        } else {
          // fallback 模拟
          const mockText = mockVoiceTexts[Math.floor(Math.random() * mockVoiceTexts.length)];
          addVoiceTask(mockText);
          setActiveTab('calendar');
          setIsRecording(false);
          showNotification('info', `未识别到语音，已使用示例: ${mockText.slice(0, 20)}…`);
        }
      }, 500);
    } else {
      // 开始录音
      if (!isSupported) {
        showNotification('error', '当前浏览器不支持语音识别，请用 Chrome/Edge 打开');
        // 降级：直接使用模拟
        const mockText = mockVoiceTexts[Math.floor(Math.random() * mockVoiceTexts.length)];
        setTimeout(() => {
          addVoiceTask(mockText);
          setActiveTab('calendar');
        }, 1000);
        return;
      }
      reset();
      start();
      showNotification('info', '请对着麦克风说话，再次点击按钮停止');
    }
  };

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
        onClick={handleMicClick}
        className={cn(
          'fixed bottom-6 right-6 md:bottom-8 md:right-8 z-50 w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center shadow-float transition-all duration-300 hover:scale-110 hover:shadow-[0_16px_48px_rgba(107,74,48,0.35)]',
          isListening ? 'bg-alert animate-pulse' : 'gradient-coffee'
        )}
        aria-label={isListening ? '停止录音' : '开始录音'}
      >
        <Mic className="w-6 h-6 text-white" />
        {!isListening && (
          <span className="absolute inset-0 rounded-full border-2 border-coffee-300/40 animate-pulse-ring" />
        )}
      </button>

      {/* 操作提示 Toast */}
      {showTip && (
        <div
          className={cn(
            'fixed bottom-24 right-6 md:bottom-28 md:right-8 z-50 max-w-[280px] px-4 py-3 rounded-2xl shadow-lg flex items-start gap-2 animate-slide-up',
            tipType === 'success' && 'bg-green-600 text-white',
            tipType === 'error' && 'bg-red-600 text-white',
            tipType === 'info' && 'bg-coffee-800 text-white'
          )}
        >
          {tipType === 'success' && <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />}
          {tipType === 'error' && <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />}
          {tipType === 'info' && <Mic className="w-5 h-5 shrink-0 mt-0.5" />}
          <span className="text-sm leading-snug break-all">{tipMessage}</span>
        </div>
      )}

      {/* AI 对话面板 */}
      {showAI && <AIChatPanel onClose={() => setShowAI(false)} />}
    </>
  );
}
