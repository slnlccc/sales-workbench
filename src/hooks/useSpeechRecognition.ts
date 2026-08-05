import { useEffect, useRef, useCallback, useState } from 'react';
import { speechService } from '@/services/speechService';

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

  const finalTranscriptRef = useRef('');
  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);

  onResultRef.current = onResult;
  onErrorRef.current = onError;

  useEffect(() => {
    setIsSupported(speechService.isSupported());
    if (!speechService.isSupported()) {
      setStatus('unsupported');
    }
  }, []);

  useEffect(() => {
    const unsub = speechService.onStateChange((state: any) => {
      if (state.type === 'start') {
        setIsListening(true);
        setStatus('listening');
        setError(null);
      } else if (state.type === 'final') {
        finalTranscriptRef.current += state.text;
        setTranscript(finalTranscriptRef.current);
        onResultRef.current?.(finalTranscriptRef.current, true);
      } else if (state.type === 'interim') {
        setInterimTranscript(state.text);
        onResultRef.current?.(state.text, false);
      } else if (state.type === 'error') {
        const msgMap: Record<string, string> = {
          'audio-capture': '未检测到麦克风，请检查设备',
          'not-allowed': '麦克风权限被拒绝，请在浏览器地址栏点击权限图标允许访问',
          'service-not-allowed': '语音服务被禁用',
          'network': '网络异常，语音识别需要联网',
          'security': '安全限制：语音识别需在 HTTPS 下使用',
        };
        const msg = msgMap[state.error] || `语音识别错误: ${state.error}`;
        setError(msg);
        setStatus('error');
        setIsListening(false);
        onErrorRef.current?.(msg);
      } else if (state.type === 'end') {
        setIsListening(false);
        setStatus('idle');
      }
    });

    return () => { unsub(); };
  }, []);

  const start = useCallback(() => {
    if (!isSupported) {
      setError('当前浏览器不支持语音识别，请使用 Chrome 或 Edge 浏览器');
      setStatus('unsupported');
      return;
    }

    finalTranscriptRef.current = '';
    setTranscript('');
    setInterimTranscript('');
    setError(null);

    const result = speechService.start({ lang, continuous, interimResults });
    if (!result.ok) {
      setError(`启动语音识别失败：${result.error}`);
      setStatus('error');
    }
  }, [isSupported, lang, continuous, interimResults]);

  const stop = useCallback(() => {
    speechService.stop();
    setIsListening(false);
    setStatus('idle');
  }, []);

  const reset = useCallback(() => {
    speechService.reset();
    finalTranscriptRef.current = '';
    setTranscript('');
    setInterimTranscript('');
    setError(null);
    setStatus('idle');
    setIsListening(false);
  }, []);

  useEffect(() => {
    return () => {
      // 不清理全局实例——其他组件可能在用
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
