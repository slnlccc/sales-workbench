import { useState, useEffect } from 'react';
import { Mic, Sparkles, AlertTriangle, CheckCircle, Loader2, User, Calendar, MapPin } from 'lucide-react';
import { useWorkbenchStore } from '@/store/useWorkbenchStore';
import { cn } from '@/lib/utils';
import AIChatPanel from './AIChatPanel';
import { useVoiceAssistant, VoiceParseResult } from '@/hooks/useVoiceAssistant';
import ForgeCorrectionCard from './ForgeCorrectionCard';

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
  const [showParseResult, setShowParseResult] = useState(false);

  const {
    transcript,
    isListening,
    isParsing,
    isBusy,
    isSupported,
    speechError,
    parseResult,
    parseError,
    toggle,
  } = useVoiceAssistant({
    context: '悬浮麦克风 - 快速语音指令',
    autoParse: true,
    onParsed: (result: VoiceParseResult) => {
      setShowParseResult(true);
      const shortText = result.rawText.length > 30 ? result.rawText.slice(0, 30) + '…' : result.rawText;
      showNotification('success', `AI 解析完成: ${shortText}`);

      // 3秒后自动创建任务
      setTimeout(() => {
        addVoiceTask(result.rawText);
        setActiveTab('calendar');
        setIsRecording(false);
        setShowParseResult(false);
      }, 3500);
    },
    onParseError: (err: string) => {
      showNotification('error', `AI 解析失败: ${err}`);
    },
  });

  // 同步录音状态
  useEffect(() => {
    if (isBusy !== isRecording) {
      setIsRecording(isBusy);
    }
  }, [isBusy, isRecording, setIsRecording]);

  // 错误提示
  useEffect(() => {
    if (speechError) {
      showNotification('error', speechError);
    }
  }, [speechError]);

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setTipType(type);
    setTipMessage(message);
    setShowTip(true);
    setTimeout(() => setShowTip(false), 3500);
  };

  const handleMicClick = () => {
    if (isListening) {
      // 停止录音，自动触发 AI 解析
      toggle();
      showNotification('info', '录音结束，AI 正在解析…');
    } else if (!isParsing) {
      if (!isSupported) {
        showNotification('error', '当前浏览器不支持语音识别，请用 Chrome/Edge 打开');
        // 降级：使用模拟
        const mockText = mockVoiceTexts[Math.floor(Math.random() * mockVoiceTexts.length)];
        setTimeout(() => {
          addVoiceTask(mockText);
          setActiveTab('calendar');
        }, 1000);
        return;
      }
      setShowParseResult(false);
      toggle();
      showNotification('info', '请对着麦克风说话，再次点击停止');
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
          isListening ? 'bg-alert animate-pulse' : isParsing ? 'bg-cream-700' : 'gradient-coffee'
        )}
        aria-label={isListening ? '停止录音' : isParsing ? 'AI 解析中' : '开始录音'}
      >
        {isParsing ? (
          <Loader2 className="w-6 h-6 text-white animate-spin" />
        ) : (
          <Mic className="w-6 h-6 text-white" />
        )}
        {!isListening && !isParsing && (
          <span className="absolute inset-0 rounded-full border-2 border-coffee-300/40 animate-pulse-ring" />
        )}
      </button>

      {/* 操作提示 Toast */}
      {showTip && (
        <div
          className={cn(
            'fixed bottom-24 right-6 md:bottom-28 md:right-8 z-50 max-w-[300px] px-4 py-3 rounded-2xl shadow-lg flex items-start gap-2 animate-slide-up',
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

      {/* AI 解析结果浮窗 */}
      {showParseResult && parseResult && !isParsing && (
        <div className="fixed bottom-24 right-6 md:bottom-28 md:right-8 z-50 max-w-[340px] bg-white rounded-2xl shadow-float border border-coffee-100 overflow-hidden animate-slide-up">
          <div className="px-4 py-3 bg-gradient-to-r from-coffee-600 to-cream-700 text-white">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-medium">AI 解析结果</span>
              <span className="ml-auto px-2 py-0.5 rounded-full bg-white/20 text-xs">
                {parseResult.intent}
              </span>
            </div>
          </div>
          <div className="p-4 space-y-2">
            <p className="text-sm text-coffee-800 font-medium">{parseResult.reply}</p>
            {parseResult.rawText && (
              <p className="text-xs text-coffee-400 italic">"{parseResult.rawText}"</p>
            )}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {parseResult.entities.customer && (
                <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-coffee-50 text-xs text-coffee-700">
                  <User className="w-3 h-3" />
                  {parseResult.entities.customer}
                </span>
              )}
              {parseResult.entities.date && (
                <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-coffee-50 text-xs text-coffee-700">
                  <Calendar className="w-3 h-3" />
                  {parseResult.entities.date}
                  {parseResult.entities.time ? ` ${parseResult.entities.time}` : ''}
                </span>
              )}
              {parseResult.entities.location && (
                <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-coffee-50 text-xs text-coffee-700">
                  <MapPin className="w-3 h-3" />
                  {parseResult.entities.location}
                </span>
              )}
            </div>
            {parseResult.action && (
              <p className="text-xs text-coffee-500 pt-1 border-t border-coffee-100">
                建议操作：{parseResult.action}
              </p>
            )}
            {parseResult.correction && parseResult.correction.hasCorrection && (
              <div className="mt-2">
                <ForgeCorrectionCard correction={parseResult.correction} variant="light" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI 对话面板 */}
      {showAI && <AIChatPanel onClose={() => setShowAI(false)} />}
    </>
  );
}
