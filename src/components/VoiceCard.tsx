import { useEffect } from 'react';
import { Mic, Wand2, AlertCircle } from 'lucide-react';
import { useWorkbenchStore } from '@/store/useWorkbenchStore';
import { cn } from '@/lib/utils';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';

const mockVoiceTexts = [
  '明天早上8点我要交出差报告，客户是中国航发的',
  '后天下午3点拜访航天科工，讨论TC4钛合金技术方案',
  '下周一上午10点和中航工业开项目进展会',
  '本周五下午2点跟进润和机械报价进展',
  '提醒我7月20日提交珠海航展准备资料',
];

export default function VoiceCard() {
  const { isRecording, setIsRecording, setInputText, addVoiceTask, clearInput, setActiveTab } = useWorkbenchStore();

  const {
    transcript,
    interimTranscript,
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

  // 同步状态到全局 store
  useEffect(() => {
    if (isListening && !isRecording) {
      setIsRecording(true);
    } else if (!isListening && isRecording && status !== 'processing') {
      setIsRecording(false);
    }
  }, [isListening, isRecording, status, setIsRecording]);

  // 显示实时识别文本
  const displayText = transcript + interimTranscript;
  const hasText = displayText.trim().length > 0;

  const handleClick = () => {
    if (isListening) {
      // 停止录音并处理结果
      stop();
      setTimeout(() => {
        const finalText = transcript.trim();
        if (finalText) {
          processText(finalText);
        } else {
          // 如果没有识别到文本，使用 fallback 模拟
          const mockText = mockVoiceTexts[Math.floor(Math.random() * mockVoiceTexts.length)];
          processText(mockText);
        }
      }, 500);
    } else {
      // 开始录音
      reset();
      start();
    }
  };

  const processText = (text: string) => {
    setInputText(text);
    setTimeout(() => {
      addVoiceTask(text);
      clearInput();
      setActiveTab('calendar');
    }, 500);
    setIsRecording(false);
  };

  // 浏览器不支持语音识别时的降级提示
  if (!isSupported) {
    return (
      <div
        className={cn(
          'relative overflow-hidden rounded-3xl p-8 bg-coffee-100 text-coffee-700 shadow-card animate-slide-up'
        )}
        style={{ animationDelay: '0.3s' }}
      >
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 rounded-2xl bg-coffee-200/50 flex items-center justify-center">
            <AlertCircle className="w-9 h-9 text-coffee-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Wand2 className="w-5 h-5 text-coffee-500" />
              <h3 className="text-xl font-semibold font-display">语音输入暂不可用</h3>
            </div>
            <p className="text-coffee-600 text-sm leading-relaxed">
              当前浏览器不支持语音识别功能，请使用 Chrome 或 Edge 浏览器打开，或点击下方模拟语音按钮体验功能
            </p>
            <button
              onClick={() => {
                const mockText = mockVoiceTexts[Math.floor(Math.random() * mockVoiceTexts.length)];
                processText(mockText);
              }}
              className="mt-4 px-4 py-2 rounded-xl bg-coffee-600 text-white text-sm font-medium hover:bg-coffee-700 transition-colors"
            >
              模拟语音输入
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-3xl p-8 gradient-cream text-white shadow-card transition-all duration-300 hover:shadow-float hover:-translate-y-0.5 cursor-pointer animate-slide-up group',
        isListening && 'ring-4 ring-cream-300/50'
      )}
      style={{ animationDelay: '0.3s' }}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
    >
      <div className="flex items-center gap-6">
        <div className="relative">
          <div
            className={cn(
              'w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center transition-transform duration-300 group-hover:scale-105',
              isListening && 'animate-pulse'
            )}
          >
            <Mic className="w-9 h-9 text-white" />
          </div>
          {isListening && (
            <>
              <span className="absolute inset-0 rounded-2xl border-2 border-white/40 animate-pulse-ring" />
              <span
                className="absolute inset-0 rounded-2xl border-2 border-white/30 animate-pulse-ring"
                style={{ animationDelay: '0.5s' }}
              />
            </>
          )}
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Wand2 className="w-5 h-5 text-cream-100" />
            <h3 className="text-xl font-semibold font-display">
              {isListening
                ? error
                  ? '识别出错，重试中…'
                  : hasText
                    ? displayText
                    : '正在聆听，请说话…'
                : '说一句话，剩下的交给我'}
            </h3>
          </div>
          <p className="text-cream-100 text-sm leading-relaxed">
            {isListening
              ? error || '说完后点击卡片停止录音'
              : '比如：「明天早上8点交出差报告」或者「后天下午3点拜访中国航发」'}
          </p>
          {status === 'error' && error && (
            <p className="mt-2 text-cream-200 text-xs">提示：{error}</p>
          )}
        </div>
      </div>

      <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3 blur-2xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/5 rounded-full translate-y-1/2 -translate-x-1/3 blur-2xl pointer-events-none" />
    </div>
  );
}
