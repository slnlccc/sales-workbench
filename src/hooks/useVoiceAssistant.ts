import { useState, useCallback, useRef } from 'react';
import { useSpeechRecognition } from './useSpeechRecognition';
import { aiApi } from '@/services/api';

export interface VoiceParseResult {
  intent: string;
  entities: {
    customer?: string;
    project?: string;
    amount?: number;
    date?: string;
    time?: string;
    type?: string;
    description?: string;
    location?: string;
    priority?: string;
  };
  action: string;
  reply: string;
  rawText: string;
}

interface UseVoiceAssistantOptions {
  /** DeepSeek 解析的上下文场景 */
  context?: string;
  /** 是否在识别结束后自动调用 AI 解析 */
  autoParse?: boolean;
  /** 识别中回调 */
  onListening?: () => void;
  /** AI 解析完成回调 */
  onParsed?: (result: VoiceParseResult) => void;
  /** AI 解析失败回调 */
  onParseError?: (error: string) => void;
}

interface UseVoiceAssistantReturn {
  // 语音识别状态
  transcript: string;
  interimTranscript: string;
  isListening: boolean;
  isSupported: boolean;
  speechError: string | null;

  // AI 解析状态
  isParsing: boolean;
  parseResult: VoiceParseResult | null;
  parseError: string | null;

  // 完整流程状态
  isBusy: boolean; // isListening || isParsing

  // 操作方法
  start: () => void;
  stop: () => void;
  toggle: () => void;
  reset: () => void;
  /** 手动触发 AI 解析 */
  parse: (text?: string) => Promise<VoiceParseResult | null>;
}

/**
 * 语音助手 Hook
 * 封装 "Web Speech API 语音识别 → DeepSeek AI 解析" 的完整流程
 *
 * 使用方式：
 * const { isListening, isParsing, parseResult, toggle } = useVoiceAssistant({
 *   context: '日程安排',
 *   onParsed: (result) => { console.log(result) }
 * })
 */
export function useVoiceAssistant(options: UseVoiceAssistantOptions = {}): UseVoiceAssistantReturn {
  const { context, autoParse = true, onListening, onParsed, onParseError } = options;

  const [isParsing, setIsParsing] = useState(false);
  const [parseResult, setParseResult] = useState<VoiceParseResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  // 保存最新的最终文本，用于 stop 后解析
  const finalTextRef = useRef('');

  const {
    transcript,
    interimTranscript,
    isListening,
    isSupported,
    error: speechError,
    start: startSpeech,
    stop: stopSpeech,
    reset: resetSpeech,
  } = useSpeechRecognition({
    lang: 'zh-CN',
    continuous: true,
    interimResults: true,
    onResult: (text, isFinal) => {
      if (isFinal) {
        finalTextRef.current = text;
      }
    },
  });

  /**
   * 调用 DeepSeek AI 解析语音文本
   */
  const parse = useCallback(
    async (text?: string): Promise<VoiceParseResult | null> => {
      const inputText = (text || finalTextRef.current || transcript || '').trim();

      if (!inputText) {
        setParseError('没有可解析的语音内容');
        onParseError?.('没有可解析的语音内容');
        return null;
      }

      setIsParsing(true);
      setParseError(null);

      try {
        const result = await aiApi.voiceAssistant(inputText, context);

        const parsed: VoiceParseResult = {
          intent: result.data?.intent || 'general',
          entities: result.data?.entities || {},
          action: result.data?.action || '',
          reply: result.data?.reply || result.data || '',
          rawText: inputText,
        };

        setParseResult(parsed);
        onParsed?.(parsed);
        return parsed;
      } catch (err: any) {
        const msg = err.message || 'AI 解析失败';

        // 降级：返回原始文本作为 fallback
        const fallback: VoiceParseResult = {
          intent: 'general',
          entities: { description: inputText },
          action: '手动处理',
          reply: inputText,
          rawText: inputText,
        };

        setParseResult(fallback);
        setParseError(msg);
        onParseError?.(msg);
        return fallback;
      } finally {
        setIsParsing(false);
      }
    },
    [transcript, context, onParsed, onParseError]
  );

  const start = useCallback(() => {
    setParseResult(null);
    setParseError(null);
    finalTextRef.current = '';
    resetSpeech();
    startSpeech();
    onListening?.();
  }, [resetSpeech, startSpeech, onListening]);

  const stop = useCallback(() => {
    stopSpeech();

    // 自动模式下，停止后自动调用 AI 解析
    if (autoParse) {
      const textToParse = finalTextRef.current || transcript;
      if (textToParse.trim()) {
        // 延迟一点确保获取到最终文本
        setTimeout(() => {
          parse(textToParse);
        }, 300);
      }
    }
  }, [stopSpeech, autoParse, transcript, parse]);

  const toggle = useCallback(() => {
    if (isListening) {
      stop();
    } else {
      start();
    }
  }, [isListening, start, stop]);

  const reset = useCallback(() => {
    resetSpeech();
    setParseResult(null);
    setParseError(null);
    finalTextRef.current = '';
  }, [resetSpeech]);

  const isBusy = isListening || isParsing;

  return {
    transcript,
    interimTranscript,
    isListening,
    isSupported,
    speechError,

    isParsing,
    parseResult,
    parseError,

    isBusy,

    start,
    stop,
    toggle,
    reset,
    parse,
  };
}

export default useVoiceAssistant;
