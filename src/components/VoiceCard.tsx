import { useEffect, useState } from 'react';
import { Mic, Wand2, AlertCircle, Sparkles, Loader2, CheckCircle2, Calendar, User, MapPin } from 'lucide-react';
import { useWorkbenchStore } from '@/store/useWorkbenchStore';
import { cn } from '@/lib/utils';
import { useVoiceAssistant, VoiceParseResult } from '@/hooks/useVoiceAssistant';

const mockVoiceTexts = [
  '明天早上8点我要交出差报告，客户是中国航发的',
  '后天下午3点拜访航天科工，讨论TC4钛合金技术方案',
  '下周一上午10点和中航工业开项目进展会',
];

export default function VoiceCard() {
  const { isRecording, setIsRecording, addVoiceTask, setActiveTab } = useWorkbenchStore();
  const [showResult, setShowResult] = useState(false);

  const {
    transcript,
    interimTranscript,
    isListening,
    isParsing,
    isBusy,
    isSupported,
    speechError,
    parseResult,
    parseError,
    toggle,
  } = useVoiceAssistant({
    context: '销售工作台首页 - 语音指令创建日程/任务/备忘',
    autoParse: true,
    onParsed: (result: VoiceParseResult) => {
      setShowResult(true);
      // 3秒后自动将解析结果创建为任务
      setTimeout(() => {
        addVoiceTask(result.rawText);
        setActiveTab('calendar');
        setIsRecording(false);
      }, 3000);
    },
  });

  // 同步录音状态
  useEffect(() => {
    if (isBusy !== isRecording) {
      setIsRecording(isBusy);
    }
  }, [isBusy, isRecording, setIsRecording]);

  const displayText = transcript + interimTranscript;
  const hasText = displayText.trim().length > 0;

  const handleClick = () => {
    if (isListening) {
      toggle();
    } else if (!isParsing) {
      setShowResult(false);
      toggle();
    }
  };

  // 浏览器不支持语音识别
  if (!isSupported) {
    return (
      <div
        className="relative overflow-hidden rounded-3xl p-8 bg-coffee-100 text-coffee-700 shadow-card animate-slide-up"
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
              当前浏览器不支持语音识别，请使用 Chrome 或 Edge 浏览器打开。仍可使用模拟语音体验 AI 解析功能。
            </p>
            <button
              onClick={async () => {
                const mockText = mockVoiceTexts[Math.floor(Math.random() * mockVoiceTexts.length)];
                addVoiceTask(mockText);
                setActiveTab('calendar');
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
        isListening && 'ring-4 ring-cream-300/50',
        isParsing && 'ring-4 ring-sparkle/50'
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
              (isListening || isParsing) && 'animate-pulse'
            )}
          >
            {isParsing ? (
              <Loader2 className="w-9 h-9 text-white animate-spin" />
            ) : (
              <Mic className="w-9 h-9 text-white" />
            )}
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

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            {isParsing ? (
              <Sparkles className="w-5 h-5 text-cream-100 animate-pulse" />
            ) : (
              <Wand2 className="w-5 h-5 text-cream-100" />
            )}
            <h3 className="text-xl font-semibold font-display">
              {isListening
                ? speechError
                  ? '识别出错，重试中…'
                  : hasText
                    ? displayText
                    : '正在聆听，请说话…'
                : isParsing
                  ? 'AI 正在解析您的指令…'
                  : showResult && parseResult
                    ? parseResult.reply
                    : '说一句话，剩下的交给 AI'}
            </h3>
          </div>
          <p className="text-cream-100 text-sm leading-relaxed">
            {isListening
              ? speechError || '说完后点击卡片停止，AI 将自动解析'
              : isParsing
                ? '正在提取客户、日期、事项等信息…'
                : '比如：「明天上午10点拜访中国航发，讨论钛合金方案」'}
          </p>

          {/* AI 解析失败提示 */}
          {parseError && !isParsing && (
            <p className="mt-2 text-cream-200 text-xs flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              AI 解析失败（{parseError}），已使用原始文本
            </p>
          )}
        </div>
      </div>

      {/* AI 解析结果展示 */}
      {showResult && parseResult && !isParsing && (
        <div className="mt-4 pt-4 border-t border-white/20 animate-slide-up">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-cream-100" />
            <span className="text-sm font-medium text-cream-100">AI 解析结果</span>
            <span className="px-2 py-0.5 rounded-full bg-white/20 text-xs text-white">
              {parseResult.intent}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {parseResult.entities.customer && (
              <span className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/15 text-xs">
                <User className="w-3 h-3" />
                {parseResult.entities.customer}
              </span>
            )}
            {parseResult.entities.date && (
              <span className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/15 text-xs">
                <Calendar className="w-3 h-3" />
                {parseResult.entities.date}
                {parseResult.entities.time ? ` ${parseResult.entities.time}` : ''}
              </span>
            )}
            {parseResult.entities.location && (
              <span className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/15 text-xs">
                <MapPin className="w-3 h-3" />
                {parseResult.entities.location}
              </span>
            )}
            {parseResult.entities.type && (
              <span className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/15 text-xs">
                <Sparkles className="w-3 h-3" />
                {parseResult.entities.type}
              </span>
            )}
          </div>
          {parseResult.action && (
            <p className="mt-2 text-xs text-cream-200">建议操作：{parseResult.action}</p>
          )}
        </div>
      )}

      <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3 blur-2xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/5 rounded-full translate-y-1/2 -translate-x-1/3 blur-2xl pointer-events-none" />
    </div>
  );
}
