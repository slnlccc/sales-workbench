import { Sparkles } from 'lucide-react';
import { flowSteps } from '@/data/mock';

export default function WorkbenchHeader() {
  return (
    <div className="mb-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-lg md:text-2xl font-bold text-cream-900 font-display mb-2">智能语音工作台</h2>
          <div className="flex items-center flex-wrap gap-2 text-xs md:text-sm text-cream-600">
            {flowSteps.map((step, index) => (
              <div key={step} className="flex items-center gap-2">
                <span>{step}</span>
                {index < flowSteps.length - 1 && (
                  <span className="text-cream-500">→</span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-cream-100 text-cream-700 text-sm font-medium">
          <Sparkles className="w-4 h-4 text-cream-500" />
          <span>智能助手</span>
        </div>
      </div>
    </div>
  );
}
