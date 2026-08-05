// 全局单例语音识别服务
// 确保整个应用只有一个 SpeechRecognition 实例，避免多处调用导致冲突

let sharedRecognition: any = null;
let sharedIsListening = false;
let sharedShouldContinue = false;
let sharedLang = 'zh-CN';
let sharedContinuous = true;
let sharedInterimResults = true;
let listeners: Set<(state: any) => void> = new Set();
let onFinalCallbacks: Array<(text: string) => void> = [];

const getSR = () => {
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
};

export const speechService = {
  isSupported: () => !!getSR(),

  isListening: () => sharedIsListening,

  onStateChange(cb: (state: any) => void) {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },

  onFinal(cb: (text: string) => void) {
    onFinalCallbacks.push(cb);
    return () => {
      onFinalCallbacks = onFinalCallbacks.filter(c => c !== cb);
    };
  },

  emit(state: any) {
    listeners.forEach(cb => {
      try { cb(state); } catch { /* ignore */ }
    });
  },

  start(options: {
    lang?: string;
    continuous?: boolean;
    interimResults?: boolean;
  } = {}): { ok: boolean; error?: string } {
    const SR = getSR();
    if (!SR) return { ok: false, error: 'NOT_SUPPORTED' };

    if (sharedIsListening) {
      // 已在运行，直接返回成功
      return { ok: true };
    }

    sharedLang = options.lang || 'zh-CN';
    sharedContinuous = options.continuous ?? true;
    sharedInterimResults = options.interimResults ?? true;
    sharedShouldContinue = true;

    // 关闭旧实例
    if (sharedRecognition) {
      try { sharedRecognition.onend = null; sharedRecognition.onerror = null; sharedRecognition.onresult = null; sharedRecognition.onstart = null; } catch { /* ignore */ }
      try { sharedRecognition.stop(); } catch { /* ignore */ }
      sharedRecognition = null;
    }

    try {
      const recognition = new SR();
      recognition.lang = sharedLang;
      recognition.continuous = sharedContinuous;
      recognition.interimResults = sharedInterimResults;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        sharedIsListening = true;
        speechService.emit({ type: 'start' });
      };

      recognition.onresult = (event: any) => {
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
          onFinalCallbacks.forEach(cb => {
            try { cb(finalText); } catch { /* ignore */ }
          });
          speechService.emit({ type: 'final', text: finalText });
        }
        if (interim) {
          speechService.emit({ type: 'interim', text: interim });
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error === 'aborted' || event.error === 'no-speech') return;
        sharedIsListening = false;
        speechService.emit({ type: 'error', error: event.error });
        sharedShouldContinue = false;
      };

      recognition.onend = () => {
        if (sharedShouldContinue) {
          // 自动重启：创建新实例
          speechService.start({ lang: sharedLang, continuous: sharedContinuous, interimResults: sharedInterimResults });
        } else {
          sharedIsListening = false;
          speechService.emit({ type: 'end' });
        }
      };

      sharedRecognition = recognition;
      recognition.start();
      return { ok: true };
    } catch (err: any) {
      if (err.name === 'InvalidStateError') {
        return { ok: true }; // 已在运行
      }
      sharedIsListening = false;
      sharedShouldContinue = false;
      return { ok: false, error: err.message };
    }
  },

  stop() {
    sharedShouldContinue = false;
    if (sharedRecognition) {
      try { sharedRecognition.stop(); } catch { /* ignore */ }
    }
    sharedIsListening = false;
    speechService.emit({ type: 'end' });
  },

  reset() {
    sharedShouldContinue = false;
    sharedIsListening = false;
    if (sharedRecognition) {
      try { sharedRecognition.stop(); } catch { /* ignore */ }
      sharedRecognition = null;
    }
  },
};
