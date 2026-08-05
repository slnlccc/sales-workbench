import { create } from 'zustand';
import { aiApi } from '@/services/api';
import { speechService } from '@/services/speechService';

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
  correction?: {
    originalText: string;
    correctedText: string;
    hasCorrection: boolean;
    localCorrections: Array<{ from: string; to: string; type?: string }>;
    aiCorrections: Array<{ from: string; to: string; reason?: string }>;
    isForgeRelated: boolean | null;
    note: string;
  };
}

interface VoiceStore {
  // 语音识别状态
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
  interimTranscript: string;
  speechError: string | null;

  // AI 解析状态
  isParsing: boolean;
  parseResult: VoiceParseResult | null;
  parseError: string | null;
  showParseResult: boolean;

  // 操作
  startListening: (context?: string) => void;
  stopListening: () => void;
  toggleListening: (context?: string) => void;
  parseText: (text?: string, context?: string) => Promise<VoiceParseResult | null>;
  resetVoice: () => void;
  setShowParseResult: (show: boolean) => void;
}

let unsubscribe: (() => void) | null = null;
let isSubscribed = false;

export const useVoiceStore = create<VoiceStore>((set, get) => ({
  isListening: false,
  isSupported: typeof window !== 'undefined' ? !!(window.SpeechRecognition || window.webkitSpeechRecognition) : false,
  transcript: '',
  interimTranscript: '',
  speechError: null,

  isParsing: false,
  parseResult: null,
  parseError: null,
  showParseResult: false,

  startListening: () => {
    if (!isSubscribed) {
      isSubscribed = true;
      unsubscribe = speechService.onStateChange((state: any) => {
        if (state.type === 'start') {
          set({ isListening: true, speechError: null });
        } else if (state.type === 'final') {
          set((s) => ({ transcript: s.transcript + state.text }));
        } else if (state.type === 'interim') {
          set({ interimTranscript: state.text });
        } else if (state.type === 'error') {
          const msgMap: Record<string, string> = {
            'audio-capture': '未检测到麦克风',
            'not-allowed': '麦克风权限被拒绝',
            'service-not-allowed': '语音服务被禁用',
            'network': '网络异常',
            'security': '需要 HTTPS',
          };
          set({ speechError: msgMap[state.error] || state.error, isListening: false });
        } else if (state.type === 'end') {
          set({ isListening: false });
        }
      });
    }

    set({ transcript: '', interimTranscript: '', speechError: null, parseResult: null, parseError: null });
    const result = speechService.start({ lang: 'zh-CN', continuous: true, interimResults: true });
    if (!result.ok) {
      set({ speechError: result.error || '启动失败', isListening: false });
    }
  },

  stopListening: () => {
    const state = get();
    const wasListening = state.isListening;
    speechService.stop();
    set({ isListening: false });

    if (wasListening) {
      const textToParse = (state.transcript || state.interimTranscript).trim();
      if (textToParse) {
        get().parseText(textToParse);
      }
    }
  },

  toggleListening: (context?: string) => {
    const state = get();
    if (state.isListening) {
      // 停止并自动解析
      speechService.stop();
      set({ isListening: false });
      const textToParse = (state.transcript || state.interimTranscript).trim();
      if (textToParse) {
        get().parseText(textToParse, context);
      }
    } else {
      get().startListening(context);
    }
  },

  parseText: async (text?: string, context?: string) => {
    const state = get();
    const inputText = (text || state.transcript || '').trim();
    if (!inputText) {
      set({ parseError: '没有可解析的语音内容' });
      return null;
    }

    set({ isParsing: true, parseError: null, parseResult: null });

    try {
      const result = await aiApi.voiceAssistant(inputText, context);

      const parsed: VoiceParseResult = {
        intent: result.data?.intent || 'general',
        entities: result.data?.entities || {},
        action: result.data?.action || '',
        reply: result.data?.reply || result.data || '',
        rawText: result.correction?.correctedText || inputText,
        correction: result.correction ? {
          originalText: result.correction.originalText,
          correctedText: result.correction.correctedText,
          hasCorrection: result.correction.hasCorrection,
          localCorrections: result.correction.localCorrections || [],
          aiCorrections: result.correction.aiCorrections || [],
          isForgeRelated: result.correction.isForgeRelated,
          note: result.correction.note || '',
        } : undefined,
      };

      set({ parseResult: parsed, showParseResult: true });
      return parsed;
    } catch (err: any) {
      const fallback: VoiceParseResult = {
        intent: 'general',
        entities: { description: inputText },
        action: '手动处理',
        reply: inputText,
        rawText: inputText,
      };
      set({ parseResult: fallback, parseError: err.message || 'AI 解析失败', showParseResult: true });
      return fallback;
    } finally {
      set({ isParsing: false });
    }
  },

  resetVoice: () => {
    speechService.reset();
    set({
      isListening: false,
      transcript: '',
      interimTranscript: '',
      speechError: null,
      isParsing: false,
      parseResult: null,
      parseError: null,
      showParseResult: false,
    });
  },

  setShowParseResult: (show) => set({ showParseResult: show }),
}));
