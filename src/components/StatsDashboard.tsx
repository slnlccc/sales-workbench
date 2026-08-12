import { DollarSign, Users, FileText, Target, TrendingUp, TrendingDown } from 'lucide-react';
import { useWorkbenchStore } from '@/store/useWorkbenchStore';
import { cn } from '@/lib/utils';

const statsCards = [
  { key: 'order', label: '订单数量', icon: DollarSign, color: 'emerald', value: 1, subValue: '35.0万', trend: 'up' },
  { key: 'visit', label: '客户拜访', icon: Users, color: 'blue', value: 1, subValue: '次线下拜访', trend: 'flat' },
  { key: 'quote', label: '报价次数', icon: FileText, color: 'violet', value: 1, subValue: '次报价/询价', trend: 'up' },
  { key: 'task', label: '待办任务', icon: Target, color: 'amber', value: 0, totalValue: 1, subValue: '完成率 0%', trend: 'down' },
];

const colorMap: Record<string, { bg: string; text: string; bar: string; border: string }> = {
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', bar: 'bg-emerald-500', border: 'border-emerald-200' },
  blue: { bg: 'bg-blue-50', text: 'text-blue-700', bar: 'bg-blue-500', border: 'border-blue-200' },
  violet: { bg: 'bg-violet-50', text: 'text-violet-700', bar: 'bg-violet-500', border: 'border-violet-200' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-700', bar: 'bg-amber-500', border: 'border-amber-200' },
};

const workDistribution = [
  { key: 'order', label: '订单', count: 1, percent: 20, color: 'bg-emerald-500' },
  { key: 'visit', label: '拜访', count: 1, percent: 20, color: 'bg-blue-500' },
  { key: 'quote', label: '报价', count: 1, percent: 20, color: 'bg-violet-500' },
  { key: 'call', label: '电话', count: 1, percent: 20, color: 'bg-teal-500' },
  { key: 'task', label: '任务', count: 1, percent: 20, color: 'bg-amber-500' },
];

export default function StatsDashboard() {
  const { records } = useWorkbenchStore();

  const total = records.length;
  const taskRecords = records.filter((r) => r.type === 'task');
  const completedTasks = taskRecords.filter((r) => r.done).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((stat) => {
          const Icon = stat.icon;
          const colors = colorMap[stat.color];
          const TrendIcon = stat.trend === 'up' ? TrendingUp : stat.trend === 'down' ? TrendingDown : null;
          return (
            <div
              key={stat.key}
              className="bg-white rounded-2xl p-5 shadow-soft hover:shadow-card transition-all"
            >
              <div className="flex items-center justify-between mb-3">
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', colors.bg)}>
                  <Icon className={cn('w-5 h-5', colors.text)} />
                </div>
                <div className="flex items-center gap-1 text-xs">
                  {TrendIcon && <TrendIcon className={cn('w-3.5 h-3.5', stat.trend === 'up' ? 'text-emerald-500' : 'text-red-400')} />}
                  <span className="text-coffee-500">较昨日</span>
                </div>
              </div>
              <h3 className="text-sm text-coffee-500 mb-2">{stat.label}</h3>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-bold text-coffee-900 font-display">
                  {stat.key === 'task' ? `${completedTasks}/${taskRecords.length}` : stat.value}
                </span>
              </div>
              <p className={cn('text-xs mt-2', colors.text)}>
                {stat.key === 'order' && `金额：${stat.subValue}`}
                {stat.key === 'visit' && stat.subValue}
                {stat.key === 'quote' && stat.subValue}
                {stat.key === 'task' && '完成率 0%'}
              </p>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-soft">
        <div className="flex items-center gap-2 mb-4">
          <span className="w-1 h-4 bg-coffee-500 rounded" />
          <h3 className="text-base font-semibold text-coffee-900">本周工作分布</h3>
        </div>
        <div className="space-y-3">
          {workDistribution.map((item) => {
            const Icon = statsCards.find((s) => s.key === item.key)?.icon || Target;
            return (
              <div key={item.key} className="flex items-center gap-4">
                <div className="flex items-center gap-2 w-24 text-sm text-coffee-600">
                  <Icon className="w-4 h-4 text-coffee-400" />
                  <span>{item.label}</span>
                </div>
                <div className="flex-1 h-2.5 bg-coffee-50 rounded-full overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all', item.color)}
                    style={{ width: `${item.percent}%` }}
                  />
                </div>
                <div className="text-sm text-coffee-700 font-medium w-32 text-right">
                  {item.count}项 ({item.percent}%)
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-coffee text-white rounded-2xl p-5">
          <p className="text-sm text-coffee-100 mb-1">本周订单总金额</p>
          <p className="text-2xl font-bold font-display">¥ 35.0万</p>
          <p className="text-xs text-coffee-100 mt-2">较上周 ↑ 12%</p>
        </div>
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl p-5">
          <p className="text-sm text-blue-100 mb-1">活跃客户数</p>
          <p className="text-2xl font-bold font-display">5 家</p>
          <p className="text-xs text-blue-100 mt-2">本周接触</p>
        </div>
        <div className="bg-gradient-to-br from-violet-500 to-violet-600 text-white rounded-2xl p-5">
          <p className="text-sm text-violet-100 mb-1">商机金额</p>
          <p className="text-2xl font-bold font-display">¥ 7818万</p>
          <p className="text-xs text-violet-100 mt-2">在跟项目</p>
        </div>
      </div>
    </div>
  );
}
