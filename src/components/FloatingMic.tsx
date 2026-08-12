import { Mic } from 'lucide-react';
import { useWorkbenchStore } from '@/store/useWorkbenchStore';
import { cn } from '@/lib/utils';

export default function FloatingMic() {
  const { isRecording, setIsRecording } = useWorkbenchStore();

  return (
    <button
      onClick={() => setIsRecording(!isRecording)}
      className={cn(
        'fixed bottom-6 right-6 md:bottom-8 md:right-8 z-50 w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center shadow-float transition-all duration-300 hover:scale-110 hover:shadow-[0_16px_48px_rgba(107,74,48,0.35)]',
        isRecording ? 'bg-alert animate-pulse' : 'gradient-coffee'
      )}
      aria-label={isRecording ? '停止录音' : '开始录音'}
    >
      <Mic className="w-6 h-6 text-white" />
      {!isRecording && (
        <span className="absolute inset-0 rounded-full border-2 border-coffee-300/40 animate-pulse-ring" />
      )}
    </button>
  );
}
