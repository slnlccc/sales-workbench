import { useWorkbenchStore } from '@/store/useWorkbenchStore';
import VoiceCard from './VoiceCard';
import TextInputArea from './TextInputArea';
import CalendarView from './CalendarView';
import MemoView from './MemoView';
import RecordsList from './RecordsList';
import StatsDashboard from './StatsDashboard';
import type { TabKey } from '@/types';

export default function TabContent() {
  const { activeTab } = useWorkbenchStore();

  const contents: Record<TabKey, React.ReactNode> = {
    voice: (
      <div className="space-y-6 animate-fade-in">
        <VoiceCard />
        <TextInputArea />
      </div>
    ),
    calendar: <CalendarView />,
    memo: <MemoView />,
    records: <RecordsList />,
    stats: <StatsDashboard />,
  };

  return <div className="mt-6">{contents[activeTab]}</div>;
}
