import { useEffect, useRef, useCallback, useState } from 'react';

type SpeechRecognitionStatus = 'idle' | 'listening' | 'processing' | 'error' | 'unsupported';

interface UseSpeechRecognitionOptions {
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
  onResult?: (text: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
}

interface UseSpeechRecognitionReturn {
  transcript: string;
  interimTranscript: string;
  isListening: boolean;
  status: SpeechRecognitionStatus;
  error: string | null;
  isSupported: boolean;
  start: () => void;
  stop: () => void;
  reset: () => void;
}

export function useSpeechRecognition(options: UseSpeechRecognitionOptions = {}): UseSpeechRecognitionReturn {
  const {
    lang = 'zh-CN',
    continuous = true,
    interimResults = true,
    onResult,
    onError,
  } = options;

  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [status, setStatus] = useState<SpeechRecognitionStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef('');
  const shouldContinueRef = useRef(false);

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SR) {
      setIsSupported(true);
    } else {
      setIsSupported(false);
      setStatus('unsupported');
    }
  }, []);

  const handleResult = useCallback(
    (event: any) => {
      let interim = '';
      let finalText = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalText += text;
        } else {
          interim += text;
        }
      }

      if (finalText) {
        finalTranscriptRef.current += finalText;
        setTranscript(finalTranscriptRef.current);
        onResult?.(finalTranscriptRef.current, true);
      }

      setInterimTranscript(interim);
      if (interim) {
        onResult?.(interim, false);
      }
    },
    [onResult]
  );

  const handleError = useCallback(
    (event: any) => {
      // 用户主动 stop 触发的 aborted 不算错误
      if (event.error === 'aborted') return;
      if (event.error === 'no-speech') return;

      const msgMap: Record<string, string> = {
        'audio-capture': '未检测到麦克风，请检查设备',
        'not-allowed': '麦克风权限被拒绝，请在浏览器地址栏点击权限图标允许访问',
        'service-not-allowed': '语音服务被禁用',
        'network': '网络异常，语音识别需要联网',
        'security': '安全限制：语音识别需在 HTTPS 下使用',
      };
      const msg = msgMap[event.error] || `语音识别错误: ${event.error}`;
      setError(msg);
      setStatus('error');
      setIsListening(false);
      shouldContinueRef.current = false;
      onError?.(msg);
    },
    [onError]
  );

  const handleEnd = useCallback(() => {
    // 移动端 / 部分浏览器：continuous 模式下也需要自动重启
    if (shouldContinueRef.current) {
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SR) return;
      try {
        // 关键：重新创建实例（避免浏览器不允许重启已停止的 recognition）
        const newRec = new SR();
        newRec.lang = lang;
        newRec.continuous = continuous;
        newRec.interimResults = interimResults;
        newRec.maxAlternatives = 1;
        newRec.onstart = () => { setIsListening(true); setStatus('listening'); };
        newRec.onresult = handleResult;
        newRec.onerror = handleError;
        newRec.onend = handleEnd;
        recognitionRef.current = newRec;
        newRec.start();
      } catch {
        // 自动重启失败，停掉
        setIsListening(false);
        setStatus('idle');
        shouldContinueRef.current = false;
      }
    } else {
      setIsListening(false);
      setStatus('idle');
    }
  }, [lang, continuous, interimResults, handleResult, handleError]);

  const start = useCallback(() => {
    if (!isSupported) {
      setError('当前浏览器不支持语音识别，请使用 Chrome 或 Edge 浏览器');
      setStatus('unsupported');
      return;
    }

    try {
      shouldContinueRef.current = true;
      finalTranscriptRef.current = '';
      setTranscript('');
      setInterimTranscript('');
      setError(null);

      // 关键：每次 start 都创建全新的 recognition 实例
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SR) {
        setError('语音识别不可用');
        setStatus('error');
        return;
      }

      const recognition = new SR();
      recognition.lang = lang;
      recognition.continuous = continuous;
      recognition.interimResults = interimResults;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setStatus('listening');
        setError(null);
      };
      recognition.onresult = handleResult;
      recognition.onerror = handleError;
      recognition.onend = handleEnd;

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      if (err.name === 'InvalidStateError') {
        return;
      }
      setError(`启动语音识别失败：${err.message}`);
      setStatus('error');
      setIsListening(false);
      shouldContinueRef.current = false;
    }
  }, [isSupported, lang, continuous, interimResults, handleResult, handleError, handleEnd]);

  const stop = useCallback(() => {
    shouldContinueRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // 忽略停止错误
      }
    }
    setIsListening(false);
    setStatus('idle');
  }, []);

  const reset = useCallback(() => {
    shouldContinueRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // 忽略
      }
    }
    finalTranscriptRef.current = '';
    setTranscript('');
    setInterimTranscript('');
    setError(null);
    setStatus('idle');
    setIsListening(false);
  }, []);

  useEffect(() => {
    return () => {
      shouldContinueRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // 忽略清理错误
        }
      }
    };
  }, []);

  return {
    transcript,
    interimTranscript,
    isListening,
    status,
    error,
    isSupported,
    start,
    stop,
    reset,
  };
}

export default useSpeechRecognition;
