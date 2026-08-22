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

// ============================================================
// MediaRecorder 录音 + 后端百度 ASR（解决手机端 Web Speech API 不支持问题）
// ============================================================
const blobToBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error('FileReader error'));
    reader.onload = () => {
      const r = reader.result as string;
      const comma = r.indexOf(',');
      resolve(comma >= 0 ? r.slice(comma + 1) : r);
    };
    reader.readAsDataURL(blob);
  });

const pickMediaRecorderMimeType = (): string => {
  if (typeof MediaRecorder === 'undefined') return '';
  // iOS Safari 常用：mp4/aac；Android Chrome/桌面 Chrome 常用 webm/opus；最后回退浏览器默认
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/mp4;codecs=mp4a.40.2',
    'audio/m4a',
    'audio/wav',
  ];
  for (const c of candidates) {
    try {
      if (MediaRecorder.isTypeSupported(c)) return c;
    } catch { /* ignore */ }
  }
  return '';
};

const mimeTypeToExt = (mime: string): string => {
  const m = (mime || '').toLowerCase();
  if (m.includes('webm')) return 'webm';
  if (m.includes('mp4') || m.includes('m4a')) return 'm4a';
  if (m.includes('wav')) return 'wav';
  if (m.includes('ogg')) return 'ogg';
  if (m.includes('mpeg') || m.includes('mp3')) return 'mp3';
  return 'webm';
};

const blobToWav16k = async (audioBuffer: AudioBuffer): Promise<Blob> => {
  const targetRate = 16000;
  const channels = 1;
  // 重采样到 16kHz（使用 OfflineAudioContext）
  const offline = new OfflineAudioContext(
    channels,
    Math.ceil(audioBuffer.duration * targetRate),
    targetRate
  );
  const src = offline.createBufferSource();
  src.buffer = audioBuffer;
  src.connect(offline.destination);
  src.start(0);
  const rendered = await offline.startRendering();
  const pcmData = rendered.getChannelData(0);
  const dataLen = 44 + pcmData.length * 2;
  const buffer = new ArrayBuffer(dataLen);
  const view = new DataView(buffer);
  const writeStr = (off: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)); };
  writeStr(0, 'RIFF');
  view.setUint32(4, dataLen - 8, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, targetRate, true);
  view.setUint32(28, targetRate * channels * 2, true);
  view.setUint16(32, channels * 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, pcmData.length * 2, true);
  for (let i = 0; i < pcmData.length; i++) {
    let s = Math.max(-1, Math.min(1, pcmData[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
  return new Blob([buffer], { type: 'audio/wav' });
};

const isBrowserSpeechRecognitionSupported = (): boolean => {
  if (typeof window === 'undefined') return false;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return !!(w.SpeechRecognition || w.webkitSpeechRecognition);
};

const isSecureContext2 = (): boolean => {
  if (typeof window === 'undefined') return false;
  return !!window.isSecureContext || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
};

const isMediaRecorderSupported = (): boolean => {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') return false;
  return !!(navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function' && typeof MediaRecorder !== 'undefined');
};

const ASR_MAX_SECONDS = 60;

export default function VoiceCard() {
  const { isRecording, setIsRecording, setInputText } = useWorkbenchStore();
  const [correcting, setCorrecting] = useState(false);
  const [correctInfo, setCorrectInfo] = useState('');
  const [liveTranscript, setLiveTranscript] = useState('');
  const [recognizing, setRecognizing] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [mediaRecorderSupported, setMediaRecorderSupported] = useState(false);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const finalTextRef = useRef<string>('');
  const sessionIdRef = useRef<number>(0);
  const abortedRef = useRef<boolean>(false);
  const isManualStopRef = useRef<boolean>(false);

  // MediaRecorder 真实录音（手机端 / Safari 回退后端 ASR）
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<any>(null);
  const mediaChunksRef = useRef<Blob[]>([]);
  const mediaRecorderStartTimeRef = useRef<number>(0);
  const mediaRecorderTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const secure = isSecureContext2();
    setSpeechSupported(isBrowserSpeechRecognitionSupported() && secure);
    setMediaRecorderSupported(isMediaRecorderSupported() && secure);
  }, []);

  useEffect(() => {
    return () => {
      abortedRef.current = true;
      try { recognitionRef.current?.abort(); } catch { /* noop */ }
      try { mediaRecorderRef.current?.state !== 'inactive' && mediaRecorderRef.current?.stop(); } catch { /* noop */ }
      try { mediaStreamRef.current?.getTracks().forEach((t: any) => t.stop()); } catch { /* noop */ }
      if (mediaRecorderTimerRef.current) { window.clearTimeout(mediaRecorderTimerRef.current); mediaRecorderTimerRef.current = null; }
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
    setInputText(mockText);
    setCorrectInfo('语音文本已填入，可直接手动修改并提交分类');
  }, [setIsRecording, setInputText]);

  // ------------------------------------------------------------
  // 后端 ASR 录音 (手机端/Safari): getUserMedia → MediaRecorder → 百度 ASR
  // ------------------------------------------------------------
  const stopMediaRecorderStream = () => {
    try {
      if (mediaRecorderTimerRef.current) { window.clearTimeout(mediaRecorderTimerRef.current); mediaRecorderTimerRef.current = null; }
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== 'inactive') {
        try { recorder.stop(); } catch { /* noop */ }
      }
      mediaRecorderRef.current = null;
      const s = mediaStreamRef.current;
      if (s) {
        try { s.getTracks().forEach((t: any) => t.stop()); } catch { /* noop */ }
        mediaStreamRef.current = null;
      }
    } catch { /* noop */ }
  };

  const uploadToBackendAsr = useCallback(async (blob: Blob, mime: string, mySession: number): Promise<boolean> => {
    try {
      let finalBlob = blob;
      let finalFormat = mimeTypeToExt(mime);
      let sampleRate = 16000;
      let channels = 1;

      // 为了最高识别率，对非 wav 格式统一用 AudioContext 重采样成 16kHz 单声道 wav
      try {
        if (typeof window !== 'undefined' && (window as any).AudioContext && (window as any).FileReader && blob.size > 0) {
          const AC: any = (window as any).AudioContext || (window as any).webkitAudioContext;
          const ab = await blob.arrayBuffer();
          const ac = new AC();
          try {
            const audioBuf = await ac.decodeAudioData(ab.slice(0));
            finalBlob = await blobToWav16k(audioBuf);
            finalFormat = 'wav';
            sampleRate = 16000;
            channels = 1;
          } finally {
            try { ac.close?.(); } catch { /* noop */ }
          }
        }
      } catch (e: any) {
        // 不抛出：保留原 blob 上传
        console.warn('重采样转16kWAV失败，上传原格式:', e?.message || e);
      }

      const base64 = await blobToBase64(finalBlob);
      if (sessionIdRef.current !== mySession) return false;
      const result = await aiApi.voiceAsr({
        audioBase64: base64,
        format: finalFormat,
        sampleRate,
        channels,
      });
      if (sessionIdRef.current !== mySession) return false;
      const text = (result?.text || '').trim();
      if (text) {
        setLiveTranscript(text);
        setInputText(text);
        setCorrectInfo('语音识别完成（后端ASR模式），可点击"AI分析提取"并调整分类');
        return true;
      }
      return false;
    } catch (err: any) {
      if (sessionIdRef.current !== mySession) return false;
      const msg: string = err?.message || String(err) || '';
      console.warn('后端 ASR 失败:', msg);
      if (msg.includes('语音识别服务未配置') || msg.includes('BAIDU_ASR')) {
        setCorrectInfo('⚠️ 语音识别服务未配置（需设置 BAIDU_ASR_API_KEY / SECRET），请联系管理员；当前可手动输入或使用示例文本');
      } else if (/未授权|令牌|401|not auth/i.test(msg)) {
        setCorrectInfo('登录已过期，请刷新页面重新登录后再试');
      } else if (/音频过大|60秒|超时/i.test(msg)) {
        setCorrectInfo('语音过长，请控制在 60 秒以内重试');
      } else {
        setCorrectInfo('⚠️ 语音识别失败：' + (msg.length > 40 ? msg.slice(0, 40) + '…' : msg) + '。可重试或使用示例文本');
      }
      return false;
    }
  }, [setInputText]);

  const startMediaRecorder = useCallback(async (mySession: number) => {
    try {
      if (mediaRecorderTimerRef.current) { window.clearTimeout(mediaRecorderTimerRef.current); mediaRecorderTimerRef.current = null; }
      mediaChunksRef.current = [];
      setCorrectInfo('正在开启麦克风…');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, sampleRate: 16000, echoCancellation: true, noiseSuppression: true } as MediaTrackConstraints,
        video: false,
      });
      if (sessionIdRef.current !== mySession) {
        try { stream.getTracks().forEach(t => t.stop()); } catch { /* noop */ }
        return;
      }
      mediaStreamRef.current = stream;
      const preferredMime = pickMediaRecorderMimeType();
      const mrOptions: MediaRecorderOptions = preferredMime ? ({ mimeType: preferredMime } as MediaRecorderOptions) : {};
      const mr = new MediaRecorder(stream, mrOptions);
      const actualMime = mr.mimeType || preferredMime;
      mr.ondataavailable = (e: BlobEvent) => { if (e.data && e.data.size > 0) mediaChunksRef.current.push(e.data); };
      mr.onerror = () => {
        if (sessionIdRef.current !== mySession) return;
        setCorrectInfo('录音异常，请重试');
        setRecognizing(false);
        setIsRecording(false);
        stopMediaRecorderStream();
        setTimeout(() => { if (sessionIdRef.current === mySession) useMockText(); }, 400);
      };
      mr.onstop = async () => {
        if (sessionIdRef.current !== mySession) return;
        stopMediaRecorderStream();
        const totalBlob = new Blob(mediaChunksRef.current, { type: actualMime || 'audio/webm' });
        if (!totalBlob || totalBlob.size < 1024) {
          setCorrectInfo('录音过短（<1KB），未检测到有效语音，请重试或使用示例文本');
          setRecognizing(false);
          setIsRecording(false);
          setTimeout(() => { if (sessionIdRef.current === mySession) useMockText(); }, 400);
          return;
        }
        setCorrectInfo('语音上传识别中…请稍候（最长 60 秒）');
        const ok = await uploadToBackendAsr(totalBlob, actualMime, mySession);
        setRecognizing(false);
        setIsRecording(false);
        if (!ok) setTimeout(() => { if (sessionIdRef.current === mySession) useMockText(); }, 400);
      };
      mediaRecorderRef.current = mr;
      mediaRecorderStartTimeRef.current = Date.now();
      mr.start(250);
      setRecognizing(true);
      setLiveTranscript('');
      setCorrectInfo('正在录音，请说话…（最长 60 秒）');
      // 最大时长保护
      mediaRecorderTimerRef.current = window.setTimeout(() => {
        if (sessionIdRef.current !== mySession) return;
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          try { mediaRecorderRef.current.stop(); } catch { /* noop */ }
        }
      }, ASR_MAX_SECONDS * 1000);
    } catch (err: any) {
      if (sessionIdRef.current !== mySession) return;
      stopMediaRecorderStream();
      const name: string = err?.name || '';
      const msg: string = err?.message || String(err) || '';
      if (name === 'NotAllowedError' || name === 'SecurityError' || /not-allowed|Permission|权限/.test(msg)) {
        setCorrectInfo('⚠️ 麦克风权限被拒绝，请在浏览器右上角站点设置里允许麦克风访问');
      } else if (name === 'NotFoundError' || name === 'OverconstrainedError' || /audio-capture|未检测到/.test(msg)) {
        setCorrectInfo('未检测到可用麦克风设备，请检查系统设置');
      } else if (!isSecureContext2()) {
        setCorrectInfo('当前非 HTTPS 安全上下文，浏览器禁止访问麦克风，请用 HTTPS 打开或使用 localhost');
      } else {
        setCorrectInfo('麦克风启动失败：' + (msg || err?.name || '未知错误'));
      }
      setRecognizing(false);
      setIsRecording(false);
      setTimeout(() => { if (sessionIdRef.current === mySession) useMockText(); }, 400);
    }
  }, [setIsRecording, uploadToBackendAsr, useMockText]);

  const handleStart = useCallback(() => {
    // 会话 ID，防止旧回调污染新会话
    const mySession = ++sessionIdRef.current;
    abortedRef.current = false;
    isManualStopRef.current = false;
    finalTextRef.current = '';

    // 安全上下文检查：非 HTTPS 且非 localhost 直接走 mock
    const secure = isSecureContext2();
    if (!secure) {
      setCorrectInfo('当前非 HTTPS 且非 localhost，浏览器禁止麦克风访问；已使用示例文本。请切换到 HTTPS 以使用真实语音识别。');
      setIsRecording(true);
      setRecognizing(false);
      setTimeout(() => { if (sessionIdRef.current === mySession) useMockText(); }, 1200);
      return;
    }

    // 所有设备优先用 Web Speech API（现代 iOS Safari 14.5+ / Android Chrome 均支持）
    // MediaRecorder + 后端 ASR 仅作为不支持 Web Speech 时的后备
    const useWebSpeech = speechSupported;
    const useRecorder = mediaRecorderSupported;

    if (!useWebSpeech && !useRecorder) {
      setCorrectInfo('当前浏览器不支持语音识别（建议使用 iPhone Safari / Android Chrome / 桌面 Chrome / Edge）');
      setIsRecording(true);
      setRecognizing(false);
      setTimeout(() => { if (sessionIdRef.current === mySession) useMockText(); }, 1200);
      return;
    }

    // 不支持 Web Speech 的浏览器：MediaRecorder + 后端百度ASR（真实识别）
    if (!useWebSpeech) {
      setLiveTranscript('');
      setCorrectInfo('');
      setIsRecording(true);
      startMediaRecorder(mySession);
      return;
    }

    // 桌面 Chrome/Edge：Web Speech API 实时
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
      } else if (e.error === 'network' || e.error === 'service-not-allowed' || e.error === 'aborted' || e.error === 'audio-stream-error' || e.error === 'language-unavailable') {
        // Web Speech 服务不可用 / 网络异常 → 降级到 MediaRecorder 后端 ASR
        setCorrectInfo('在线语音服务异常，已切换为录音上传识别…');
        try { instance.abort(); } catch { /* noop */ }
        if (mediaRecorderSupported) {
          startMediaRecorder(mySession);
          return;
        }
      } else {
        // 其他错误：尝试 MediaRecorder 后备
        if (mediaRecorderSupported && !isManualStopRef.current) {
          setCorrectInfo('语音识别异常，已切换为录音上传识别…');
          try { instance.abort(); } catch { /* noop */ }
          startMediaRecorder(mySession);
          return;
        }
        setCorrectInfo('语音识别异常，请重试');
      }
      setRecognizing(false);
      setIsRecording(false);
      if (!isManualStopRef.current) {
        setTimeout(() => { if (sessionIdRef.current === mySession) useMockText(); }, 500);
      }
    };

    instance.onend = () => {
      if (sessionIdRef.current !== mySession) return;
      // 如果 recogning 已经被 onerror 的降级分支覆盖（已重新走录音），则不再最终处理
      if (mediaRecorderRef.current) return;
      setRecognizing(false);
      const finalText = finalTextRef.current.trim();
      setIsRecording(false);
      if (finalText) {
        setLiveTranscript(finalText);
        setInputText(finalText);
        setCorrectInfo('语音识别完成，可手动修改文本后点击"AI分析提取"并手动调整分类');
      } else {
        useMockText();
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
      // 启动失败降级：若 MediaRecorder 支持则走后端ASR
      if (mediaRecorderSupported) {
        setCorrectInfo('Web Speech 启动失败，已切换为录音上传识别…');
        startMediaRecorder(mySession);
        return;
      }
      setRecognizing(false);
      setIsRecording(false);
      setCorrectInfo('语音识别启动失败，已使用示例文本');
      useMockText();
    }
  }, [speechSupported, mediaRecorderSupported, callAICorrect, setIsRecording, startMediaRecorder, useMockText]);

  const handleStop = useCallback(() => {
    isManualStopRef.current = true;
    // 录音模式：停止 MediaRecorder（触发 onstop → 上传ASR）
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch { /* noop */ }
      return;
    }
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
              ? '点击说话，实时语音识别（支持手机和桌面浏览器）；识别后可手动修改并"AI分析提取"分类'
              : mediaRecorderSupported
              ? '点击说话录音，停止后上传后端 AI 识别（最长 60 秒）；识别后可手动修改并提交分类'
              : '当前环境麦克风不可用；点击可演示示例文本，或点击下方"使用示例文本（演示）"'}
          </p>
          {!speechSupported && !mediaRecorderSupported && !isRecording && !recognizing && !correcting && (
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
