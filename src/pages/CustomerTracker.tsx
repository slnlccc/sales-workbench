import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, Phone, MapPin, Calendar, Briefcase, CheckCircle2, Clock, Circle, TrendingUp, FileText, Users, DollarSign, Target, Sparkles } from 'lucide-react';
import Layout from '@/components/Layout';
import { projects } from '@/data/projects';
import { customers } from '@/data/customers';
import { cn } from '@/lib/utils';
import type { Stage } from '@/types';

const stageConfig: Record<Stage, { label: string; color: string; bgColor: string }> = {
  lead: { label: '线索', color: 'text-slate-700', bgColor: 'bg-slate-100' },
  contact: { label: '接洽', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  quote: { label: '报价', color: 'text-violet-700', bgColor: 'bg-violet-100' },
  won: { label: '成交', color: 'text-emerald-700', bgColor: 'bg-emerald-100' },
  aftersale: { label: '售后', color: 'text-amber-700', bgColor: 'bg-amber-100' },
};

type DetailTab = 'overview' | 'production' | 'customer';

const detailTabs: { key: DetailTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'overview', label: '项目情况', icon: Briefcase },
  { key: 'production', label: '生产进度', icon: TrendingUp },
  { key: 'customer', label: '客户画像', icon: Users },
];

export default function CustomerTracker() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<DetailTab>('overview');

  const project = projects.find((p) => p.id === id) || projects[0];
  const customer = customers.find((c) => c.id === project.customerId) || customers[0];
  const stage = stageConfig[project.stage];

  return (
    <Layout>
      <button
            onClick={() => navigate('/project-tracker')}
            className="flex items-center gap-1.5 text-sm text-coffee-600 hover:text-coffee-800 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>返回项目跟进</span>
          </button>

          <div className="bg-gradient-coffee text-white rounded-3xl p-6 shadow-card mb-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3 blur-2xl" />
            <div className="relative">
              <div className="flex items-start justify-between flex-wrap mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/20 text-white')}>
                      {stage.label}
                    </span>
                    <span className="text-xs text-coffee-100">{project.industry}</span>
                  </div>
                  <h1 className="text-xl md:text-2xl font-bold font-display mb-1">{project.name}</h1>
                  <div className="flex items-center gap-2 text-sm text-coffee-100">
                    <Building2 className="w-4 h-4" />
                    <span>{customer.name}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-coffee-100 mb-1">项目金额</p>
                  <p className="text-2xl md:text-3xl font-bold">¥ {project.amount}<span className="text-sm font-normal">万</span></p>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-white/20">
                <div>
                  <p className="text-xs text-coffee-100">整体进度</p>
                  <p className="text-lg md:text-xl font-bold mt-1">{project.progress}%</p>
                </div>
                <div>
                  <p className="text-xs text-coffee-100">下一步</p>
                  <p className="text-sm font-medium mt-1">{project.nextAction}</p>
                </div>
                <div>
                  <p className="text-xs text-coffee-100">截止时间</p>
                  <p className="text-sm font-medium mt-1">{project.nextActionAt}</p>
                </div>
                <div>
                  <p className="text-xs text-coffee-100">销售负责人</p>
                  <p className="text-sm font-medium mt-1">之欧</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-white rounded-2xl p-1 shadow-soft mb-5">
            {detailTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all',
                    isActive ? 'bg-coffee-700 text-white shadow-md' : 'text-coffee-600 hover:bg-coffee-50'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {activeTab === 'overview' && <OverviewTab project={project} stage={stage} />}
          {activeTab === 'production' && <ProductionTab project={project} />}
          {activeTab === 'customer' && <CustomerTab customer={customer} />}
    </Layout>
  );
}

function OverviewTab({ project, stage }: { project: typeof projects[0]; stage: { label: string; color: string; bgColor: string } }) {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="bg-white rounded-2xl p-5 shadow-soft">
        <h3 className="text-sm font-semibold text-coffee-900 mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4" />
          <span>项目描述</span>
        </h3>
        <p className="text-sm text-coffee-700 leading-relaxed">{project.description}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Target} label="销售阶段" value={stage.label} bgColor="bg-violet-100" textColor="text-violet-700" />
        <StatCard icon={DollarSign} label="项目金额" value={`¥ ${project.amount} 万`} bgColor="bg-emerald-100" textColor="text-emerald-700" />
        <StatCard icon={TrendingUp} label="整体进度" value={`${project.progress}%`} bgColor="bg-blue-100" textColor="text-blue-700" />
        <StatCard icon={Calendar} label="下一步" value={project.nextAction} bgColor="bg-amber-100" textColor="text-amber-700" small />
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-soft">
        <h3 className="text-sm font-semibold text-coffee-900 mb-4 flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          <span>关键节点时间线</span>
        </h3>

        {project.timeline && project.timeline.length > 0 ? (
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-coffee-200" />
            <div className="space-y-4">
              {project.timeline.map((node) => (
                <div key={node.id} className="flex items-start gap-4 relative">
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10',
                    node.done ? 'bg-emerald-500 text-white' : 'bg-coffee-100 text-coffee-400'
                  )}>
                    {node.done ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 pt-1">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        'text-sm font-medium',
                        node.done ? 'text-coffee-900' : 'text-coffee-500'
                      )}>
                        {node.label}
                      </span>
                      <span className="text-xs text-coffee-400">{node.date}</span>
                    </div>
                    {node.done && (
                      <p className="text-xs text-emerald-600 mt-0.5">已完成</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-coffee-400">暂无时间线数据</p>
        )}
      </div>
    </div>
  );
}

function ProductionTab({ project }: { project: typeof projects[0] }) {
  const tasks = project.tasks || [];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="bg-white rounded-2xl p-5 shadow-soft">
        <h3 className="text-sm font-semibold text-coffee-900 mb-4">生产任务列表</h3>
        {tasks.length === 0 ? (
          <p className="text-sm text-coffee-400 text-center py-8">暂无生产任务</p>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => {
              const StatusIcon = task.status === 'done' ? CheckCircle2 : task.status === 'in-progress' ? Clock : Circle;
              const statusColor = task.status === 'done' ? 'text-emerald-600' : task.status === 'in-progress' ? 'text-amber-600' : 'text-coffee-400';
              return (
                <div key={task.id} className="p-3 bg-coffee-50/50 rounded-xl">
                  <div className="flex items-center gap-3 mb-2">
                    <StatusIcon className={cn('w-5 h-5 flex-shrink-0', statusColor)} />
                    <span className="flex-1 text-sm font-medium text-coffee-900">{task.name}</span>
                    <span className="text-xs text-coffee-500">截止 {task.deadline}</span>
                    <span className={cn(
                      'px-2 py-0.5 rounded-full text-xs font-medium',
                      task.status === 'done' ? 'bg-emerald-100 text-emerald-700' :
                      task.status === 'in-progress' ? 'bg-amber-100 text-amber-700' :
                      'bg-coffee-100 text-coffee-600'
                    )}>
                      {task.status === 'done' ? '已完成' : task.status === 'in-progress' ? '进行中' : '待开始'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-coffee-100 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          task.status === 'done' ? 'bg-emerald-500' :
                          task.status === 'in-progress' ? 'bg-amber-500' : 'bg-coffee-300'
                        )}
                        style={{ width: `${task.progress}%` }}
                      />
                    </div>
                    <span className="text-xs text-coffee-600 font-medium w-10 text-right">{task.progress}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-gradient-to-br from-coffee-50 to-amber-50 border border-coffee-200 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-coffee-900 mb-2">📊 整体生产进度</h3>
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-3xl font-bold text-coffee-900">{project.progress}%</span>
          <span className="text-xs text-coffee-500">{tasks.filter((t) => t.status === 'done').length}/{tasks.length} 已完成</span>
        </div>
        <div className="h-3 bg-white/60 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-coffee-500 to-caramel rounded-full transition-all"
            style={{ width: `${project.progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function CustomerTab({ customer }: { customer: typeof customers[0] }) {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="bg-white rounded-2xl p-6 shadow-soft">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-coffee text-white flex items-center justify-center text-2xl font-bold font-display">
            {customer.name[0]}
          </div>
          <div className="flex-1">
            <h3 className="text-lg md:text-xl font-bold text-coffee-900 font-display">{customer.name}</h3>
            <p className="text-sm text-coffee-500">{customer.industry} · {customer.scale}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <InfoItem icon={Building2} label="客户规模" value={customer.scale} />
          <InfoItem icon={Briefcase} label="所属行业" value={customer.industry} />
          <InfoItem icon={MapPin} label="所在地区" value={customer.region || '未知'} />
          <InfoItem icon={Calendar} label="合作起始" value={customer.cooperationSince || '未知'} />
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-soft">
        <h3 className="text-sm font-semibold text-coffee-900 mb-3 flex items-center gap-2">
          <Phone className="w-4 h-4" />
          <span>关键联系人</span>
        </h3>
        <div className="p-3 bg-coffee-50/50 rounded-xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-coffee-200 flex items-center justify-center text-sm font-bold text-coffee-700">
            {customer.contact[0]}
          </div>
          <div>
            <p className="text-sm font-medium text-coffee-900">{customer.contact}</p>
            <p className="text-xs text-coffee-500">主要联系人</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-soft">
        <h3 className="text-sm font-semibold text-coffee-900 mb-3">📈 合作记录</h3>
        <div className="space-y-2">
          {['GH4169锻件订单 ¥35万', 'TC4钛合金报价进行中', '珠海航展参展客户'].map((item, i) => (
            <div key={i} className="flex items-center gap-2 p-2 text-sm text-coffee-700">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, bgColor, textColor, small }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; bgColor: string; textColor: string; small?: boolean }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-soft">
      <div className="flex items-center gap-2 mb-2">
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', bgColor)}>
          <Icon className={cn('w-4 h-4', textColor)} />
        </div>
        <span className="text-xs text-coffee-500">{label}</span>
      </div>
      <p className={cn('font-semibold text-coffee-900', small ? 'text-sm' : 'text-xl')}>{value}</p>
    </div>
  );
}

function InfoItem({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="p-3 bg-coffee-50/50 rounded-xl">
      <div className="flex items-center gap-1.5 text-xs text-coffee-500 mb-1">
        <Icon className="w-3.5 h-3.5" />
        <span>{label}</span>
      </div>
      <p className="text-sm font-medium text-coffee-900">{value}</p>
    </div>
  );
}
