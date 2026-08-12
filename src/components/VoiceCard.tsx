import { Mic, Wand2 } from 'lucide-react';
import { useWorkbenchStore } from '@/store/useWorkbenchStore';
import { cn } from '@/lib/utils';

const mockVoiceTexts = [
  '明天早上8点我要交出差报告，客户是中国航发的',
  '后天下午3点拜访航天科工，讨论TC4钛合金技术方案',
  '下周一上午10点和中航工业开项目进展会',
  '本周五下午2点跟进润和机械报价进展',
  '提醒我7月20日提交珠海航展准备资料',
  '帮我完成这周的周报，总结本周项目进展',
  '今天下午4点电话联系中国商飞了解项目需求',
];

export default function VoiceCard() {
  const { isRecording, setIsRecording, setInputText, setActiveTab } = useWorkbenchStore();

  const handleClick = () => {
    if (isRecording) {
      // 停止录音后，把模拟文本填入输入框并切到文本区供用户修改确认
      const mockText = mockVoiceTexts[Math.floor(Math.random() * mockVoiceTexts.length)];
      setInputText(mockText);
      setIsRecording(false);
      // 不自动跳转，让用户留在语音页，在下方文本输入框确认修改后提交
    } else {
      setIsRecording(true);
    }
  };

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-3xl p-8 gradient-cream text-white shadow-card transition-all duration-300 hover:shadow-float hover:-translate-y-0.5 cursor-pointer animate-slide-up group',
        isRecording && 'ring-4 ring-cream-300/50'
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
              isRecording && 'animate-pulse'
            )}
          >
            <Mic className="w-9 h-9 text-white" />
          </div>
          {isRecording && (
            <>
              <span className="absolute inset-0 rounded-2xl border-2 border-white/40 animate-pulse-ring" />
              <span
                className="absolute inset-0 rounded-2xl border-2 border-white/30 animate-pulse-ring"
                style={{ animationDelay: '0.5s' }}
              />
            </>
          )}
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Wand2 className="w-5 h-5 text-cream-100" />
            <h3 className="text-xl font-semibold font-display">
              {isRecording ? '正在聆听，请说话…' : '说一句话，剩下的交给我'}
            </h3>
          </div>
          <p className="text-cream-100 text-sm leading-relaxed">
            比如：「明天早上8点交出差报告」或「帮我完成这周的周报」
            {!isRecording && (
              <span className="block mt-1 text-cream-100/80">
                说完后在下方修改确认，避免识别错误直接生成
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3 blur-2xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/5 rounded-full translate-y-1/2 -translate-x-1/3 blur-2xl pointer-events-none" />
    </div>
  );
}
