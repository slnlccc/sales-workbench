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

/**
 * Web Speech API 语音识别 Hook
 * 支持 Chrome / Edge / Safari 浏览器（移动端 Safari 支持有限）
 * 在不支持的浏览器中优雅降级
 */
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

  // 检测浏览器支持
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
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
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalText += transcript;
        } else {
          interim += transcript;
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
      let msg = '语音识别失败';
      switch (event.error) {
        case 'no-speech':
          msg = '未检测到语音，请对着麦克风说话';
          break;
        case 'audio-capture':
          msg = '未检测到麦克风设备，请检查麦克风权限';
          break;
        case 'not-allowed':
          msg = '麦克风权限被拒绝，请在浏览器设置中允许访问麦克风';
          break;
        case 'network':
          msg = '网络错误，请检查网络连接';
          break;
        case 'aborted':
          return; // 用户主动停止，不算错误
        default:
          msg = `语音识别错误: ${event.error}`;
      }
      setError(msg);
      setStatus('error');
      setIsListening(false);
      onError?.(msg);
    },
    [onError]
  );

  const handleEnd = useCallback(() => {
    // continuous 模式下自动重新开始（解决移动端单次识别限制）
    if (continuous && recognitionRef.current && recognitionRef.current._shouldContinue) {
      try {
        recognitionRef.current.start();
      } catch {
        // 忽略重复启动错误
      }
    } else {
      setIsListening(false);
      setStatus('idle');
    }
  }, [continuous]);

  const handleStart = useCallback(() => {
    setIsListening(true);
    setStatus('listening');
    setError(null);
  }, []);

  const initRecognition = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    const recognition = new SpeechRecognition();
    recognition.lang = lang;
    recognition.continuous = continuous;
    recognition.interimResults = interimResults;
    recognition.maxAlternatives = 1;

    recognition.onstart = handleStart;
    recognition.onresult = handleResult;
    recognition.onerror = handleError;
    recognition.onend = handleEnd;

    return recognition;
  }, [lang, continuous, interimResults, handleStart, handleResult, handleError, handleEnd]);

  const start = useCallback(() => {
    if (!isSupported) {
      setError('当前浏览器不支持语音识别，请使用 Chrome 或 Edge 浏览器');
      setStatus('unsupported');
      return;
    }

    if (!recognitionRef.current) {
      recognitionRef.current = initRecognition();
    }

    if (!recognitionRef.current) {
      setError('语音识别初始化失败');
      setStatus('error');
      return;
    }

    try {
      finalTranscriptRef.current = '';
      setTranscript('');
      setInterimTranscript('');
      recognitionRef.current._shouldContinue = true;
      recognitionRef.current.start();
    } catch (err: any) {
      if (err.name === 'InvalidStateError') {
        // 已经在运行中
        return;
      }
      setError(`启动语音识别失败: ${err.message}`);
      setStatus('error');
    }
  }, [isSupported, initRecognition]);

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current._shouldContinue = false;
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
    stop();
    finalTranscriptRef.current = '';
    setTranscript('');
    setInterimTranscript('');
    setError(null);
    setStatus('idle');
  }, [stop]);

  // 页面卸载时清理
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current._shouldContinue = false;
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
