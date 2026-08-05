import { useState, useRef } from 'react';
import { Mic, Sparkles, AlertTriangle, CheckCircle, Loader2, User, Calendar, MapPin, Keyboard, Send, X } from 'lucide-react';
import { useWorkbenchStore } from '@/store/useWorkbenchStore';
import { useVoiceStore } from '@/store/useVoiceStore';
import { cn } from '@/lib/utils';
import AIChatPanel from './AIChatPanel';
import ForgeCorrectionCard from './ForgeCorrectionCard';

export default function FloatingMic() {
  const { setIsRecording, addVoiceTask, setActiveTab } = useWorkbenchStore();
  const [showAI, setShowAI] = useState(false);
  const [showTip, setShowTip] = useState(false);
  const [tipType, setTipType] = useState<'success' | 'error' | 'info'>('info');
  const [tipMessage, setTipMessage] = useState('');
  const [textMode, setTextMode] = useState(false);
  const [textInput, setTextInput] = useState('');
  const textInputRef = useRef<HTMLInputElement>(null);

  const {
    transcript,
    interimTranscript,
    isListening,
    isParsing,
    isSupported,
    speechError,
    parseResult,
    parseError,
    showParseResult,
    toggleListening,
    parseText,
    setShowParseResult,
  } = useVoiceStore();

  const isBusy = isListening || isParsing;

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setTipType(type);
    setTipMessage(message);
    setShowTip(true);
    setTimeout(() => setShowTip(false), 3500);
  };

  const handleMicClick = () => {
    if (isListening) {
      toggleListening();
      showNotification('info', '录音结束，AI 正在解析…');
      setTimeout(() => {
        const state = useVoiceStore.getState();
        if (state.parseResult) {
          const result = state.parseResult;
          addVoiceTask(result.rawText);
          setShowParseResult(true);
          const shortText = result.rawText.length > 30 ? result.rawText.slice(0, 30) + '…' : result.rawText;
          showNotification('success', `AI 解析完成：${shortText}`);
        }
        if (state.parseError) {
          showNotification('error', `AI 解析失败：${state.parseError}`);
        }
      }, 100);
    } else if (!isParsing) {
      if (!isSupported) {
        setTextMode(true);
        showNotification('info', '当前浏览器不支持语音，已切换为文本输入');
        setTimeout(() => textInputRef.current?.focus(), 100);
        return;
      }
      toggleListening();
      showNotification('info', '请对着麦克风说话，再次点击停止');
    }
  };

  const handleTextSubmit = async () => {
    const text = textInput.trim();
    if (!text || isParsing) return;

    setTextInput('');
    showNotification('info', 'AI 正在解析…');
    const result = await parseText(text);

    if (result) {
      addVoiceTask(result.rawText);
      setShowParseResult(true);
      showNotification('success', `解析完成：${result.intent}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleTextSubmit();
    } else if (e.key === 'Escape') {
      setTextMode(false);
    }
  };

  return (
    <>
      {/* 按钮组容器 */}
      <div className="fixed bottom-6 right-4 md:bottom-8 md:right-6 z-50 flex flex-row-reverse items-center gap-3">
        {/* 麦克风 */}
        <button
          onClick={handleMicClick}
          className={cn(
            'relative rounded-full flex items-center justify-center shadow-float transition-all duration-300 hover:scale-110 w-12 h-12 md:w-14 md:h-14',
            'hover:shadow-[0_16px_48px_rgba(107,74,48,0.35)]',
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
            <span className="absolute inset-0 rounded-full border-2 border-coffee-300/40 animate-pulse-ring pointer-events-none" />
          )}
        </button>

        {/* AI 助手 */}
        <button
          onClick={() => setShowAI(true)}
          className="rounded-full flex items-center justify-center shadow-float transition-all duration-300 hover:scale-110 bg-cream-700 hover:bg-cream-800 w-12 h-12 md:w-14 md:h-14"
          aria-label="AI 助手"
        >
          <Sparkles className="w-6 h-6 text-white" />
        </button>

        {/* 键盘 */}
        <button
          onClick={() => {
            setTextMode(!textMode);
            if (!textMode) {
              setTimeout(() => textInputRef.current?.focus(), 100);
            }
          }}
          className={cn(
            'rounded-full flex items-center justify-center shadow-float transition-all duration-300 hover:scale-110 w-12 h-12 md:w-14 md:h-14',
            textMode ? 'bg-cream-800' : 'bg-cream-700 hover:bg-cream-800'
          )}
          aria-label={textMode ? '关闭文本输入' : '打开文本输入'}
        >
          {textMode ? <X className="w-5 h-5 text-white" /> : <Keyboard className="w-5 h-5 text-white" />}
        </button>
      </div>

      {/* 文本输入栏 */}
      {textMode && (
        <div className="fixed bottom-20 right-4 md:bottom-24 md:right-6 z-50 max-w-[320px] w-[calc(100%-2rem)] md:w-[320px] bg-white rounded-2xl shadow-float border border-coffee-200 overflow-hidden animate-slide-up">
          <div className="px-3 py-2 bg-coffee-50 border-b border-coffee-100 flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-coffee-600" />
            <span className="text-xs font-medium text-coffee-700">文字输入</span>
          </div>
          <div className="p-3 flex gap-2">
            <input
              ref={textInputRef}
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入指令，如：抓取无锡派克的GH4169原材料信息"
              className="flex-1 px-3 py-2 rounded-xl bg-coffee-50 border border-coffee-200 text-sm focus:outline-none focus:border-cream-600 focus:ring-1 focus:ring-cream-600"
              disabled={isParsing}
            />
            <button
              onClick={handleTextSubmit}
              disabled={isParsing || !textInput.trim()}
              className="px-3 py-2 rounded-xl bg-cream-600 text-white hover:bg-cream-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          {!isSupported && (
            <div className="px-3 pb-2 text-xs text-amber-600 bg-amber-50">
              💡 您的浏览器不支持语音识别，请使用文字输入
            </div>
          )}
        </div>
      )}

      {/* 语音识别实时文本 */}
      {isListening && (
        <div className="fixed bottom-20 right-4 md:bottom-24 md:right-6 z-50 max-w-[300px] bg-white/95 backdrop-blur rounded-2xl shadow-float border border-coffee-200 px-4 py-3 animate-slide-up">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs text-coffee-500">正在录音…</span>
          </div>
          <p className="text-sm text-coffee-800 min-h-[1.5rem]">
            {transcript || interimTranscript || '请对着麦克风说话'}
          </p>
        </div>
      )}

      {/* 操作提示 Toast */}
      {showTip && (
        <div
          className={cn(
            'fixed bottom-24 right-4 md:bottom-28 md:right-6 z-50 max-w-[300px] px-4 py-3 rounded-2xl shadow-lg flex items-start gap-2 animate-slide-up',
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
        <div
          className="fixed bottom-24 right-4 md:bottom-28 md:right-6 z-50 max-w-[340px] bg-white rounded-2xl shadow-float border border-coffee-100 overflow-hidden animate-slide-up"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-4 py-3 bg-gradient-to-r from-coffee-600 to-cream-700 text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium flex-1">AI 解析结果</span>
            <span className="px-2 py-0.5 rounded-full bg-white/20 text-xs">{parseResult.intent}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveTab('calendar');
                setShowParseResult(false);
              }}
              className="ml-1 w-7 h-7 rounded-full bg-white/30 hover:bg-white/50 flex items-center justify-center transition-colors cursor-pointer"
              aria-label="关闭"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-4 space-y-2">
            <p className="text-sm text-coffee-800 font-medium whitespace-pre-wrap">{parseResult.reply}</p>
            {parseResult.rawText && (
              <p className="text-xs text-coffee-400 italic">"{parseResult.rawText}"</p>
            )}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {parseResult.entities.customer && (
                <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-coffee-50 text-xs text-coffee-700"><User className="w-3 h-3" />{parseResult.entities.customer}</span>
              )}
              {parseResult.entities.date && (
                <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-coffee-50 text-xs text-coffee-700"><Calendar className="w-3 h-3" />{parseResult.entities.date}{parseResult.entities.time ? ` ${parseResult.entities.time}` : ''}</span>
              )}
              {parseResult.entities.location && (
                <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-coffee-50 text-xs text-coffee-700"><MapPin className="w-3 h-3" />{parseResult.entities.location}</span>
              )}
            </div>
            {parseResult.action && (
              <p className="text-xs text-coffee-500 pt-1 border-t border-coffee-100">建议操作：{parseResult.action}</p>
            )}
            {parseResult.correction && parseResult.correction.hasCorrection && (
              <div className="mt-2"><ForgeCorrectionCard correction={parseResult.correction} variant="light" /></div>
            )}
          </div>
        </div>
      )}

      {/* AI 对话面板 */}
      {showAI && <AIChatPanel onClose={() => setShowAI(false)} />}
    </>
  );
}
