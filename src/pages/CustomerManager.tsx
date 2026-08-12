import { useState } from 'react';
import {
  Heart, Users, Calendar, Sparkles, ChevronDown, ChevronRight,
  Building, Clock, Star, Edit3, Save, X, Plus, Check,
} from 'lucide-react';
import Layout from '@/components/Layout';
import { cn } from '@/lib/utils';

type TabKey = 'overview' | 'rhythm' | 'personal' | 'system';

const tabConfig: Record<TabKey, { label: string; icon: React.ComponentType<{ className?: string }>; subLabel: string; color: string }> = {
  overview: { label: '全维度', icon: Users, subLabel: '客户画像', color: 'from-blue-500 to-cyan-500' },
  rhythm: { label: '节奏化', icon: Calendar, subLabel: '跟进计划', color: 'from-green-500 to-emerald-500' },
  personal: { label: '个性化', icon: Heart, subLabel: '关系维护', color: 'from-pink-500 to-rose-500' },
  system: { label: '体系化', icon: Sparkles, subLabel: '拜访复盘', color: 'from-amber-500 to-orange-500' },
};

interface ProjectInfo {
  name: string;
  customer: string;
  product: string;
  quantity: string;
  amount: string;
  techRequirements: string;
  stages: { name: string; status: 'done' | 'in-progress' | 'pending'; date: string; note: string }[];
}

interface CustomerProfile {
  company: string;
  industry: string;
  scale: string;
  region: string;
  contact: string;
  position: string;
  phone: string;
  annualRevenue: string;
  employeeCount: string;
  cooperationSince: string;
  totalOrders: number;
  totalAmount: number;
  tags: string[];
  decisionChain: string[];
}

const initialProject: ProjectInfo = {
  name: '中航某所 钛合金整体结构件项目',
  customer: '中航工业某研究所',
  product: '钛合金（TC4/TB6）整体结构件',
  quantity: '研制阶段约20件，量产后约200件/年',
  amount: '研制阶段约80万，量产期约800万/年',
  techRequirements: '整体锻模，无焊接，力学性能满足GJB标准',
  stages: [
    { name: '资质审核', status: 'done', date: '2026-06-10', note: '资质审核通过' },
    { name: '技术交流', status: 'done', date: '2026-06-25', note: '首次技术交流，客户对技术能力表示认可' },
    { name: '样品交付', status: 'in-progress', date: '2026-07-20', note: '工艺方案已沟通中，待开模' },
    { name: '小批量交付', status: 'pending', date: '2027-03-31', note: '预计Q1开始小批量交付' },
  ],
};

const initialCustomer: CustomerProfile = {
  company: '中航工业某研究所',
  industry: '航空航天/军用航空装备研发',
  scale: '国有科研院所',
  region: '陕西西安',
  contact: '张总',
  position: '采购主管',
  phone: '138****8888',
  annualRevenue: '约15亿',
  employeeCount: '约2000人',
  cooperationSince: '2023年',
  totalOrders: 28,
  totalAmount: 800,
  tags: ['战略客户', '高价值', '航空航天'],
  decisionChain: [
    '1. 设计室（李工·副主任）· 技术选型，决定技术方案',
    '2. 计划处（王处）· 采购计划审批',
  ],
};

const rhythmPlan = [
  { period: '日常维护', items: ['每周一次微信问候', '每两周一次电话沟通', '每月一次技术跟进'] },
  { period: '关键节点', items: ['生日祝福', '节日问候', '项目里程碑庆祝'] },
  { period: '深度维护', items: ['季度拜访', '年度答谢', '邀请参观考察'] },
];

const visitRecords = [
  {
    id: 'v1',
    date: '2026-07-05',
    type: '技术交流',
    participants: '张总、李工',
    content: '讨论钛合金整体结构件锻造工艺方案，客户对我们的技术能力表示认可',
    nextAction: '准备详细工艺方案，本周内发送',
    result: '积极',
  },
  {
    id: 'v2',
    date: '2026-06-20',
    type: '初次拜访',
    participants: '张总、王处',
    content: '介绍公司情况和产品能力，初步了解客户需求',
    nextAction: '安排技术团队深入对接',
    result: '良好',
  },
];

// 通用可编辑文本字段
function EditableField({
  label, value, isEditing, onChange, textarea,
}: {
  label: string; value: string; isEditing: boolean; onChange: (v: string) => void; textarea?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-coffee-400 mb-0.5">{label}</p>
      {isEditing ? (
        textarea ? (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 rounded-lg bg-cream text-sm text-coffee-800 focus:outline-none focus:ring-2 focus:ring-coffee-300 border border-coffee-200 resize-none"
          />
        ) : (
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-cream text-sm text-coffee-800 focus:outline-none focus:ring-2 focus:ring-coffee-300 border border-coffee-200"
          />
        )
      ) : (
        <p className="text-coffee-800 font-medium text-sm">{value || '—'}</p>
      )}
    </div>
  );
}

export default function CustomerManager() {
  const [tab, setTab] = useState<TabKey>('overview');
  const [selectedCustomer, setSelectedCustomer] = useState<string>('中航某所 钛合金整体结构件项目');
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);
  const [showAddInput, setShowAddInput] = useState(false);
  const [newItemName, setNewItemName] = useState('');

  const [customers, setCustomers] = useState<string[]>([
    '中航某所 钛合金整体结构件项目',
    '中国航发XX项目',
    '航天科工XX研究院',
    '中核集团XX设备公司',
  ]);

  // 三个卡片的编辑状态
  const [editingProject, setEditingProject] = useState(false);
  const [editingStage, setEditingStage] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);

  // 数据状态
  const [project, setProject] = useState<ProjectInfo>(initialProject);
  const [profile, setProfile] = useState<CustomerProfile>(initialCustomer);

  // 临时编辑副本
  const [projectDraft, setProjectDraft] = useState<ProjectInfo>(initialProject);
  const [profileDraft, setProfileDraft] = useState<CustomerProfile>(initialCustomer);

  const handleAddItem = () => {
    const name = newItemName.trim();
    if (!name) return;
    if (!customers.includes(name)) {
      setCustomers([...customers, name]);
      setSelectedCustomer(name);
    }
    setNewItemName('');
    setShowAddInput(false);
    setCustomerDropdownOpen(false);
  };

  const startEditProject = () => { setProjectDraft({ ...project, stages: [...project.stages] }); setEditingProject(true); };
  const saveProject = () => { setProject(projectDraft); setEditingProject(false); };
  const cancelProject = () => { setEditingProject(false); };

  const startEditProfile = () => { setProfileDraft({ ...profile, decisionChain: [...profile.decisionChain], tags: [...profile.tags] }); setEditingProfile(true); };
  const saveProfile = () => { setProfile(profileDraft); setEditingProfile(false); };
  const cancelProfile = () => { setEditingProfile(false); };

  const startEditStage = () => { setProjectDraft({ ...project, stages: project.stages.map(s => ({ ...s })) }); setEditingStage(true); };
  const saveStage = () => { setProject(projectDraft); setEditingStage(false); };
  const cancelStage = () => { setEditingStage(false); };

  const CardHeader = ({ icon: Icon, title, color, isEditing, onEdit, onSave, onCancel }: {
    icon: React.ComponentType<{ className?: string }>; title: string; color: string;
    isEditing: boolean; onEdit: () => void; onSave: () => void; onCancel: () => void;
  }) => (
    <div className="flex items-center gap-2 mb-4">
      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', color)}>
        <Icon className="w-4 h-4" />
      </div>
      <h3 className="text-sm font-semibold text-coffee-900 flex-1">{title}</h3>
      {isEditing ? (
        <div className="flex items-center gap-1">
          <button onClick={onSave} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-green-500 text-white text-xs font-medium hover:bg-green-600">
            <Save className="w-3 h-3" /> 保存
          </button>
          <button onClick={onCancel} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-coffee-100 text-coffee-600 text-xs font-medium hover:bg-coffee-200">
            <X className="w-3 h-3" /> 取消
          </button>
        </div>
      ) : (
        <button onClick={onEdit} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 text-xs font-semibold hover:bg-blue-100 transition-colors border border-blue-100">
          <Edit3 className="w-3 h-3" /> 编辑
        </button>
      )}
    </div>
  );

  return (
    <Layout>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center">
              <Heart className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-coffee-900 font-display">客户管家</h1>
              <p className="text-xs text-coffee-500">全周期管理 · 客户关系维护</p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3 mb-5">
            {(Object.keys(tabConfig) as TabKey[]).map((key) => {
              const config = tabConfig[key];
              const Icon = config.icon;
              return (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={cn(
                    'p-4 rounded-2xl text-left transition-all',
                    tab === key
                      ? `bg-gradient-to-br ${config.color} text-white shadow-lg`
                      : 'bg-white hover:shadow-soft'
                  )}
                >
                  <Icon className={cn('w-6 h-6 mb-2', tab === key ? 'text-white' : 'text-coffee-600')} />
                  <div className={cn('text-base font-bold', tab === key ? 'text-white' : 'text-coffee-900')}>
                    {config.label}
                  </div>
                  <div className={cn('text-xs', tab === key ? 'text-white/80' : 'text-coffee-500')}>
                    {config.subLabel}
                  </div>
                </button>
              );
            })}
          </div>

          {/* 下拉选择 + 新增 */}
          <div className="relative mb-4 w-96">
            <button
              onClick={() => setCustomerDropdownOpen(!customerDropdownOpen)}
              className="w-full px-4 py-2.5 rounded-xl bg-white text-left text-sm text-coffee-700 flex items-center justify-between shadow-soft hover:shadow-md transition-shadow"
            >
              <span className="font-medium truncate">{selectedCustomer}</span>
              <ChevronDown className={cn('w-4 h-4 text-coffee-400 transition-transform', customerDropdownOpen && 'rotate-180')} />
            </button>
            {customerDropdownOpen && (
              <div className="absolute z-10 w-full mt-1.5 bg-white rounded-xl shadow-lg border border-coffee-200 overflow-hidden">
                {!showAddInput ? (
                  <>
                    <button
                      onClick={() => setShowAddInput(true)}
                      className="w-full px-4 py-2.5 text-left text-sm text-white bg-gradient-to-r from-blue-500 to-blue-600 font-semibold hover:from-blue-600 hover:to-blue-700 flex items-center gap-2 border-b border-blue-200"
                    >
                      <Plus className="w-4 h-4" />
                      新增项目 / 单位
                    </button>
                    {customers.map((c) => (
                      <button
                        key={c}
                        onClick={() => { setSelectedCustomer(c); setCustomerDropdownOpen(false); }}
                        className={cn(
                          'w-full px-4 py-2.5 text-left text-sm hover:bg-coffee-50',
                          selectedCustomer === c && 'bg-pink-50 text-pink-700 font-medium'
                        )}
                      >
                        {c}
                      </button>
                    ))}
                  </>
                ) : (
                  <div className="p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        autoFocus
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                        placeholder="输入项目或单位名称"
                        className="flex-1 px-3 py-2 rounded-lg bg-cream text-sm text-coffee-800 focus:outline-none focus:ring-2 focus:ring-blue-300 border border-coffee-200"
                      />
                      <button onClick={handleAddItem} className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => { setShowAddInput(false); setNewItemName(''); }} className="p-2 bg-coffee-100 text-coffee-500 rounded-lg hover:bg-coffee-200">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-xs text-coffee-400">输入名称后按回车或点击确认添加</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            {/* 项目情况 */}
            <div className="bg-white rounded-2xl p-5 shadow-soft">
              <CardHeader
                icon={Building} title="项目情况" color="bg-blue-100 text-blue-600"
                isEditing={editingProject}
                onEdit={startEditProject} onSave={saveProject} onCancel={cancelProject}
              />
              <div className="space-y-3">
                <EditableField label="项目名称" value={editingProject ? projectDraft.name : project.name} isEditing={editingProject}
                  onChange={(v) => setProjectDraft({ ...projectDraft, name: v })} />
                <EditableField label="客户" value={editingProject ? projectDraft.customer : project.customer} isEditing={editingProject}
                  onChange={(v) => setProjectDraft({ ...projectDraft, customer: v })} />
                <EditableField label="产品" value={editingProject ? projectDraft.product : project.product} isEditing={editingProject}
                  onChange={(v) => setProjectDraft({ ...projectDraft, product: v })} />
                <EditableField label="数量" value={editingProject ? projectDraft.quantity : project.quantity} isEditing={editingProject}
                  onChange={(v) => setProjectDraft({ ...projectDraft, quantity: v })} />
                <EditableField label="预计金额" value={editingProject ? projectDraft.amount : project.amount} isEditing={editingProject}
                  onChange={(v) => setProjectDraft({ ...projectDraft, amount: v })} />
                <EditableField label="技术要求" value={editingProject ? projectDraft.techRequirements : project.techRequirements} isEditing={editingProject}
                  onChange={(v) => setProjectDraft({ ...projectDraft, techRequirements: v })} textarea />
              </div>
            </div>

            {/* 生产进度 */}
            <div className="bg-white rounded-2xl p-5 shadow-soft">
              <CardHeader
                icon={Clock} title="生产进度" color="bg-amber-100 text-amber-600"
                isEditing={editingStage}
                onEdit={startEditStage} onSave={saveStage} onCancel={cancelStage}
              />
              <div className="space-y-2">
                {(editingStage ? projectDraft.stages : project.stages).map((stage, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <button
                      disabled={!editingStage}
                      onClick={() => {
                        if (!editingStage) return;
                        const statuses: Array<'done' | 'in-progress' | 'pending'> = ['pending', 'in-progress', 'done'];
                        const next = statuses[(statuses.indexOf(stage.status) + 1) % 3];
                        const newStages = [...projectDraft.stages];
                        newStages[i] = { ...stage, status: next };
                        setProjectDraft({ ...projectDraft, stages: newStages });
                      }}
                      className={cn(
                        'w-4 h-4 rounded-full flex-shrink-0 mt-0.5 flex items-center justify-center text-[10px] text-white font-bold',
                        stage.status === 'done' ? 'bg-green-500' :
                        stage.status === 'in-progress' ? 'bg-amber-500 animate-pulse' : 'bg-coffee-200',
                        editingStage && 'cursor-pointer hover:ring-2 hover:ring-coffee-300'
                      )}
                    >
                      {stage.status === 'done' ? '✓' : i + 1}
                    </button>
                    <div className="flex-1 pb-2 border-l-2 border-coffee-100 pl-3 -ml-[9px]">
                      {editingStage ? (
                        <div className="space-y-1">
                          <input
                            value={stage.name}
                            onChange={(e) => {
                              const newStages = [...projectDraft.stages];
                              newStages[i] = { ...stage, name: e.target.value };
                              setProjectDraft({ ...projectDraft, stages: newStages });
                            }}
                            className="w-full px-2 py-1 rounded bg-cream text-xs text-coffee-800 focus:outline-none focus:ring-1 focus:ring-coffee-300 border border-coffee-200"
                          />
                          <input
                            type="date"
                            value={stage.date}
                            onChange={(e) => {
                              const newStages = [...projectDraft.stages];
                              newStages[i] = { ...stage, date: e.target.value };
                              setProjectDraft({ ...projectDraft, stages: newStages });
                            }}
                            className="w-full px-2 py-1 rounded bg-cream text-[10px] text-coffee-600 focus:outline-none focus:ring-1 focus:ring-coffee-300 border border-coffee-200"
                          />
                          <input
                            value={stage.note}
                            onChange={(e) => {
                              const newStages = [...projectDraft.stages];
                              newStages[i] = { ...stage, note: e.target.value };
                              setProjectDraft({ ...projectDraft, stages: newStages });
                            }}
                            className="w-full px-2 py-1 rounded bg-cream text-[10px] text-coffee-600 focus:outline-none focus:ring-1 focus:ring-coffee-300 border border-coffee-200"
                          />
                          <p className="text-[9px] text-coffee-400">状态: {stage.status === 'done' ? '已完成' : stage.status === 'in-progress' ? '进行中' : '待开始'}（点击圆点切换）</p>
                        </div>
                      ) : (
                        <>
                          <p className={cn(
                            'text-xs font-medium',
                            stage.status === 'done' ? 'text-coffee-800' :
                            stage.status === 'in-progress' ? 'text-amber-700' : 'text-coffee-400'
                          )}>
                            {stage.name} {stage.status === 'in-progress' && '(进行中)'}
                          </p>
                          <p className="text-[10px] text-coffee-400">{stage.date}</p>
                          <p className="text-[10px] text-coffee-500 mt-0.5">{stage.note}</p>
                        </>
                      )}
                    </div>
                  </div>
                ))}
                {editingStage && (
                  <button
                    onClick={() => setProjectDraft({ ...projectDraft, stages: [...projectDraft.stages, { name: '新阶段', status: 'pending', date: '', note: '' }] })}
                    className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-coffee-50 text-coffee-500 text-xs font-medium hover:bg-coffee-100 w-full justify-center"
                  >
                    <Plus className="w-3 h-3" /> 添加阶段
                  </button>
                )}
              </div>
            </div>

            {/* 客户画像 */}
            <div className="bg-white rounded-2xl p-5 shadow-soft">
              <CardHeader
                icon={Users} title="客户画像" color="bg-pink-100 text-pink-600"
                isEditing={editingProfile}
                onEdit={startEditProfile} onSave={saveProfile} onCancel={cancelProfile}
              />
              <div className="space-y-3">
                <EditableField label="公司名称" value={editingProfile ? profileDraft.company : profile.company} isEditing={editingProfile}
                  onChange={(v) => setProfileDraft({ ...profileDraft, company: v })} />
                <EditableField label="所属行业" value={editingProfile ? profileDraft.industry : profile.industry} isEditing={editingProfile}
                  onChange={(v) => setProfileDraft({ ...profileDraft, industry: v })} />
                <EditableField label="企业性质" value={editingProfile ? profileDraft.scale : profile.scale} isEditing={editingProfile}
                  onChange={(v) => setProfileDraft({ ...profileDraft, scale: v })} />
                <EditableField label="年营收规模" value={editingProfile ? profileDraft.annualRevenue : profile.annualRevenue} isEditing={editingProfile}
                  onChange={(v) => setProfileDraft({ ...profileDraft, annualRevenue: v })} />
                <EditableField label="员工人数" value={editingProfile ? profileDraft.employeeCount : profile.employeeCount} isEditing={editingProfile}
                  onChange={(v) => setProfileDraft({ ...profileDraft, employeeCount: v })} />
                <div className="pt-2 border-t border-coffee-100">
                  <p className="text-xs text-coffee-400 mb-1.5">决策链</p>
                  {(editingProfile ? profileDraft.decisionChain : profile.decisionChain).map((chain, i) => (
                    <div key={i} className="mb-1">
                      {editingProfile ? (
                        <input
                          value={chain}
                          onChange={(e) => {
                            const newChain = [...profileDraft.decisionChain];
                            newChain[i] = e.target.value;
                            setProfileDraft({ ...profileDraft, decisionChain: newChain });
                          }}
                          className="w-full px-2 py-1 rounded bg-cream text-xs text-coffee-700 focus:outline-none focus:ring-1 focus:ring-coffee-300 border border-coffee-200"
                        />
                      ) : (
                        <p className="text-xs text-coffee-700">{chain}</p>
                      )}
                    </div>
                  ))}
                  {editingProfile && (
                    <button
                      onClick={() => setProfileDraft({ ...profileDraft, decisionChain: [...profileDraft.decisionChain, `${profileDraft.decisionChain.length + 1}. 新增决策人`] })}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-coffee-50 text-coffee-500 text-xs hover:bg-coffee-100 mt-1"
                    >
                      <Plus className="w-3 h-3" /> 添加决策链
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {tab === 'rhythm' && (
            <div className="mt-4 grid grid-cols-3 gap-4 animate-fade-in">
              {rhythmPlan.map((plan) => (
                <div key={plan.period} className="bg-white rounded-2xl p-5 shadow-soft">
                  <h3 className="text-sm font-semibold text-coffee-900 mb-3 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-green-500" />
                    {plan.period}
                  </h3>
                  <ul className="space-y-2">
                    {plan.items.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-coffee-700">
                        <span className="text-green-500 mt-0.5">✓</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          {tab === 'personal' && (
            <div className="mt-4 bg-white rounded-2xl p-5 shadow-soft animate-fade-in">
              <h3 className="text-sm font-semibold text-coffee-900 mb-4 flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500" />
                个性化关系维护
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-pink-50 rounded-xl p-4">
                  <h4 className="text-sm font-medium text-pink-800 mb-2">客户兴趣爱好</h4>
                  <div className="flex flex-wrap gap-1">
                    {['高尔夫', '品茶', '书法', '历史'].map((tag) => (
                      <span key={tag} className="px-2 py-0.5 rounded text-xs bg-white text-pink-700">{tag}</span>
                    ))}
                  </div>
                </div>
                <div className="bg-blue-50 rounded-xl p-4">
                  <h4 className="text-sm font-medium text-blue-800 mb-2">重要纪念日</h4>
                  <ul className="text-xs text-blue-700 space-y-1">
                    <li>🎂 张总生日：1985-08-15</li>
                    <li>🏢 合作纪念日：2023-06-20</li>
                    <li>🎊 公司周年庆：每年9月</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {tab === 'system' && (
            <div className="mt-4 space-y-3 animate-fade-in">
              <h3 className="text-sm font-semibold text-coffee-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                拜访复盘记录
              </h3>
              {visitRecords.map((v) => (
                <div key={v.id} className="bg-white rounded-2xl p-5 shadow-soft">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-coffee-900">{v.type}</span>
                      <span className="text-xs text-coffee-400">{v.date}</span>
                    </div>
                    <span className={cn(
                      'px-2 py-0.5 rounded-full text-xs font-medium',
                      v.result === '积极' ? 'bg-green-100 text-green-700' :
                      v.result === '良好' ? 'bg-blue-100 text-blue-700' :
                      'bg-coffee-100 text-coffee-700'
                    )}>
                      进展: {v.result}
                    </span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p className="text-coffee-600">
                      <span className="text-coffee-400">参与人员:</span> {v.participants}
                    </p>
                    <p className="text-coffee-700">
                      <span className="text-coffee-400">主要内容:</span> {v.content}
                    </p>
                    <p className="text-amber-700 bg-amber-50 p-2 rounded-lg">
                      <span className="font-medium">下一步行动:</span> {v.nextAction}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
    </Layout>
  );
}
