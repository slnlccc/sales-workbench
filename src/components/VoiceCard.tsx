import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, Wand2, Loader2, AlertCircle } from 'lucide-react';
import { useWorkbenchStore } from '@/store/useWorkbenchStore';
import { aiApi } from '@/services/api';
import { cn } from '@/lib/utils';

const mockVoiceTexts = [
  '明天早上8点我要交出差报告，客户是中国航发的',
  '后天下午3点拜访航天科工，讨论TC4钛合金技术方案',
  '下周一上午10点和中航工业开项目进展会',
  '本周五下午2点跟进润和机械报价进展',
  '提醒我7月20日提交珠海航展准备资料',
  '帮我完成这周的周报，总结本周项目进展',
  '今天下午4点电话联系中国商飞了解项目需求',
  '明天去锻造车间看锻件的热处理工艺，注意淬火温度',
  '后天上午9点和东方电气开核电项目进度会',
  '下周三下午2点拜访船舶重工，讨论不锈钢锻件方案',
];

// Web Speech API 类型
interface SpeechRecognitionResultLike {
  0: { transcript: string };
  isFinal: boolean;
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: { length: number; [i: number]: SpeechRecognitionResultLike };
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}

const isBrowserSupported = (): boolean => {
  if (typeof window === 'undefined') return false;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return !!(w.SpeechRecognition || w.webkitSpeechRecognition);
};

const isSecureContext = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.isSecureContext || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
};

export default function VoiceCard() {
  const { isRecording, setIsRecording, setInputText } = useWorkbenchStore();
  const [correcting, setCorrecting] = useState(false);
  const [correctInfo, setCorrectInfo] = useState('');
  const [liveTranscript, setLiveTranscript] = useState('');
  const [recognizing, setRecognizing] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const finalTextRef = useRef<string>('');
  const sessionIdRef = useRef<number>(0);
  const abortedRef = useRef<boolean>(false);
  const isManualStopRef = useRef<boolean>(false);

  useEffect(() => {
    setSpeechSupported(isBrowserSupported() && isSecureContext());
  }, []);

  useEffect(() => {
    return () => {
      abortedRef.current = true;
      try { recognitionRef.current?.abort(); } catch { /* noop */ }
    };
  }, []);

  const callAICorrect = useCallback(async (text: string) => {
    if (!text.trim()) return;
    setCorrecting(true);
    setCorrectInfo('');
    try {
      const result = await aiApi.voiceCorrect(text);
      const lines = (result.correctedText || '').split('\n').filter((l: string) => l.trim());
      const correctedText = lines[0]?.replace(/【校正后标准锻造专业文本】/, '').trim() || text;
      const info = lines.slice(1).join(' ');
      setInputText(correctedText);
      if (info) setCorrectInfo(info);
    } catch {
      setInputText(text);
      setCorrectInfo('AI 矫正未启用（DeepSeek 余额不足或未配置），已填入原始语音文本');
    } finally {
      setCorrecting(false);
    }
  }, [setInputText]);

  const useMockText = useCallback(() => {
    const mockText = mockVoiceTexts[Math.floor(Math.random() * mockVoiceTexts.length)];
    setLiveTranscript(mockText);
    setIsRecording(false);
    setRecognizing(false);
    void callAICorrect(mockText);
  }, [callAICorrect, setIsRecording]);

  const handleStart = useCallback(() => {
    // 会话 ID，防止旧回调污染新会话
    const mySession = ++sessionIdRef.current;
    abortedRef.current = false;
    isManualStopRef.current = false;
    finalTextRef.current = '';

    if (!speechSupported) {
      setCorrectInfo(
        !isSecureContext()
          ? '当前非安全上下文（需 HTTPS），语音识别不可用，已使用示例文本'
          : '当前浏览器不支持语音识别（推荐 Chrome/Edge），已使用示例文本'
      );
      setIsRecording(true);
      setRecognizing(false);
      // 模拟 1.5 秒后填入文本
      setTimeout(() => {
        if (sessionIdRef.current === mySession) {
          useMockText();
        }
      }, 1500);
      return;
    }

    const rec = (window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    }).SpeechRecognition || (window as unknown as {
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    }).webkitSpeechRecognition;

    const instance = new rec!();
    instance.lang = 'zh-CN';
    instance.continuous = true;
    instance.interimResults = true;

    instance.onresult = (event: SpeechRecognitionEventLike) => {
      if (sessionIdRef.current !== mySession) return;
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        if (r.isFinal) {
          finalTextRef.current += r[0].transcript;
        } else {
          interim += r[0].transcript;
        }
      }
      setLiveTranscript(finalTextRef.current + interim);
    };

    instance.onerror = (e: { error: string }) => {
      if (sessionIdRef.current !== mySession) return;
      console.warn('语音识别错误:', e.error);
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        setCorrectInfo('⚠️ 麦克风权限被拒绝，请在浏览器设置中允许麦克风访问');
      } else if (e.error === 'no-speech') {
        setCorrectInfo('未检测到语音，请重试或使用示例文本');
      } else if (e.error === 'audio-capture') {
        setCorrectInfo('未检测到麦克风设备，请检查设备连接');
      } else {
        setCorrectInfo('语音识别异常，请重试');
      }
      setRecognizing(false);
      setIsRecording(false);
      // 出错时回退到 mock
      if (!isManualStopRef.current) {
        setTimeout(() => {
          if (sessionIdRef.current === mySession) useMockText();
        }, 500);
      }
    };

    instance.onend = () => {
      if (sessionIdRef.current !== mySession) return;
      setRecognizing(false);
      const finalText = finalTextRef.current.trim();
      if (isManualStopRef.current) {
        setIsRecording(false);
        if (finalText) {
          setLiveTranscript(finalText);
          void callAICorrect(finalText);
        } else {
          useMockText();
        }
      } else {
        // 自动结束（浏览器静音超时）
        setIsRecording(false);
        if (finalText) {
          setLiveTranscript(finalText);
          void callAICorrect(finalText);
        } else {
          useMockText();
        }
      }
    };

    try {
      instance.start();
      recognitionRef.current = instance;
      setRecognizing(true);
      setLiveTranscript('');
      setCorrectInfo('');
    } catch (err) {
      console.error('语音识别启动失败:', err);
      setRecognizing(false);
      setIsRecording(false);
      setCorrectInfo('语音识别启动失败，已使用示例文本');
      useMockText();
    }
  }, [speechSupported, callAICorrect, setIsRecording, useMockText]);

  const handleStop = useCallback(() => {
    isManualStopRef.current = true;
    if (recognitionRef.current && recognizing) {
      try { recognitionRef.current.stop(); } catch { /* noop */ }
    } else {
      useMockText();
    }
  }, [recognizing, useMockText]);

  const handleClick = () => {
    if (correcting) return;
    if (isRecording || recognizing) {
      handleStop();
    } else {
      setIsRecording(true);
      handleStart();
    }
  };

  const handleUseMock = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (correcting) return;
    useMockText();
  };

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-3xl p-8 gradient-cream text-white shadow-card transition-all duration-300 hover:shadow-float hover:-translate-y-0.5 cursor-pointer animate-slide-up group',
        (isRecording || recognizing) && 'ring-4 ring-cream-300/50'
      )}
      style={{ animationDelay: '0.3s' }}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && !correcting && handleClick()}
    >
      <div className="flex items-center gap-6">
        <div className="relative">
          <div
            className={cn(
              'w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center transition-transform duration-300 group-hover:scale-105',
              (isRecording || recognizing) && 'animate-pulse',
              correcting && 'animate-pulse'
            )}
          >
            {correcting ? (
              <Loader2 className="w-9 h-9 text-white animate-spin" />
            ) : (
              <Mic className="w-9 h-9 text-white" />
            )}
          </div>
          {(isRecording || recognizing) && (
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
            <Wand2 className="w-5 h-5 text-cream-100" />
            <h3 className="text-xl font-semibold font-display">
              {correcting
                ? 'AI 正在矫正语音文本…'
                : recognizing
                ? '正在聆听，请说话…'
                : isRecording
                ? '正在聆听，请说话…'
                : '说一句话，剩下的交给我'}
            </h3>
          </div>
          <p className="text-cream-100 text-sm leading-relaxed">
            {correcting
              ? 'DeepSeek AI 正在修正锻造专业术语中的同音错别字…'
              : speechSupported
              ? '点击说话，再点停止；AI 自动矫正锻造术语（段造→锻造、翠火→淬火等）'
              : '点击后将使用示例文本演示，可手动点击"使用示例文本"按钮'}
          </p>
          {!speechSupported && !isRecording && !recognizing && !correcting && (
            <button
              onClick={handleUseMock}
              className="mt-2 text-xs text-white/80 bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg transition-colors"
            >
              使用示例文本（演示）
            </button>
          )}
          {(recognizing || isRecording) && liveTranscript && (
            <p className="text-white text-sm mt-2 bg-white/15 rounded-lg px-3 py-1.5 max-h-16 overflow-y-auto">
              {liveTranscript}
            </p>
          )}
          {correctInfo && (
            <div className="flex items-start gap-1 text-cream-100/80 text-xs mt-2 bg-white/10 rounded-lg px-3 py-1.5">
              <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
              <span>{correctInfo}</span>
            </div>
          )}
        </div>
      </div>

      <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3 blur-2xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/5 rounded-full translate-y-1/2 -translate-x-1/3 blur-2xl pointer-events-none" />
    </div>
  );
}
