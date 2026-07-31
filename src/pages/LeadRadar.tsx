import { useState } from 'react';
import {
  Target, MessageSquare, BookOpen, Search, Send, Mic, Sparkles,
  Briefcase, User, Building, ChevronRight, X, Zap, Lightbulb,
} from 'lucide-react';
import Layout from '@/components/Layout';
import { cn } from '@/lib/utils';

type TabKey = 'leads' | 'scripts' | 'knowledge';

const tabConfig: Record<TabKey, { label: string; icon: React.ComponentType<{ className?: string }>; subLabel: string }> = {
  leads: { label: '线索挖掘', icon: Target, subLabel: '精准获客引擎' },
  scripts: { label: '话术助手', icon: MessageSquare, subLabel: '实时沟通辅助' },
  knowledge: { label: '销售知识库', icon: BookOpen, subLabel: '场景化应答' },
};

interface LeadItem {
  id: string;
  company: string;
  industry: string;
  scale: string;
  contact: string;
  position: string;
  region: string;
  matchScore: number;
  source: string;
  needs: string[];
  lastActive: string;
}

const mockLeads: LeadItem[] = [
  {
    id: 'lead-001',
    company: '中航工业某发动机研究所',
    industry: '航空航天',
    scale: '大型央企',
    contact: '张工',
    position: '采购主管',
    region: '北京',
    matchScore: 95,
    source: '行业展会',
    needs: ['高温合金锻件', 'GH4169', '机匣锻件'],
    lastActive: '3天前',
  },
  {
    id: 'lead-002',
    company: '航天科技某研究院',
    industry: '航空航天',
    scale: '大型央企',
    contact: '李主任',
    position: '物资部主任',
    region: '上海',
    matchScore: 88,
    source: '招投标网站',
    needs: ['钛合金锻件', 'TC4', '结构件'],
    lastActive: '1周前',
  },
  {
    id: 'lead-003',
    company: '中核集团某设备公司',
    industry: '能源电力',
    scale: '大型央企',
    contact: '王经理',
    position: '供应链经理',
    region: '四川',
    matchScore: 82,
    source: '行业资讯',
    needs: ['核电阀门锻件', '不锈钢锻件'],
    lastActive: '2周前',
  },
  {
    id: 'lead-004',
    company: '华能新能源某分公司',
    industry: '新能源',
    scale: '大型国企',
    contact: '赵总',
    position: '采购总监',
    region: '江苏',
    matchScore: 78,
    source: '客户转介绍',
    needs: ['风电轮毂锻件', '大型锻件'],
    lastActive: '3周前',
  },
  {
    id: 'lead-005',
    company: '中国船舶某重工公司',
    industry: '船舶',
    scale: '大型央企',
    contact: '刘工',
    position: '技术工程师',
    region: '辽宁',
    matchScore: 75,
    source: '行业协会',
    needs: ['曲轴锻件', '大型船用锻件'],
    lastActive: '1个月前',
  },
];

interface KnowledgeCategory {
  id: string;
  title: string;
  icon: string;
  count: number;
  scenarios: string[];
}

const knowledgeCategories: KnowledgeCategory[] = [
  {
    id: 'k1',
    title: '商务礼仪',
    icon: '🤝',
    count: 28,
    scenarios: ['初次见面', '商务宴请', '礼品赠送', '邮件规范'],
  },
  {
    id: 'k2',
    title: '饭局酒局',
    icon: '🍷',
    count: 15,
    scenarios: ['敬酒话术', '座次安排', '点菜技巧', '拒酒技巧'],
  },
  {
    id: 'k3',
    title: '谈判技巧',
    icon: '💼',
    count: 32,
    scenarios: ['价格谈判', '交付周期', '付款方式', '合同条款'],
  },
  {
    id: 'k4',
    title: '议价博弈',
    icon: '💰',
    count: 24,
    scenarios: ['客户嫌贵', '竞品压价', '批量优惠', '涨价沟通'],
  },
  {
    id: 'k5',
    title: '项目跟进',
    icon: '📋',
    count: 36,
    scenarios: ['初次接触', '需求确认', '方案汇报', '签单促成'],
  },
  {
    id: 'k6',
    title: '客情维护',
    icon: '❤️',
    count: 20,
    scenarios: ['节日问候', '生日祝福', '日常关怀', '危机处理'],
  },
];

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export default function LeadRadar() {
  const [tab, setTab] = useState<TabKey>('leads');
  const [searchQuery, setSearchQuery] = useState('');
  const [industryFilter, setIndustryFilter] = useState('全部');
  const [selectedLead, setSelectedLead] = useState<LeadItem | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: '您好！我是您的话术助手。请告诉我客户说了什么，我会帮您分析并生成回复话术。',
      timestamp: '10:00',
    },
  ]);

  const industries = ['全部', '航空航天', '能源电力', '新能源', '船舶', '石化'];

  const filteredLeads = mockLeads.filter((l) => {
    if (searchQuery && !l.company.includes(searchQuery) && !l.contact.includes(searchQuery)) return false;
    if (industryFilter !== '全部' && l.industry !== industryFilter) return false;
    return true;
  });

  const handleSendMessage = () => {
    if (!chatInput.trim()) return;
    const newMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: chatInput,
      timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
    };
    setChatMessages([...chatMessages, newMsg]);
    setChatInput('');
    setTimeout(() => {
      const reply: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content:
          '【客户意图分析】\n客户目前处于比价阶段，对价格比较敏感，但对产品质量也有要求。潜在顾虑：担心我们的价格比竞品高，担心交付周期能否满足。\n\n【推荐回复话术】\n"王总，非常理解您对价格的关注。我们派克材料做高端锻件十几年了，像GH4169这种高温合金，我们的晶粒度控制和材料利用率在行业内是领先的。\n\n您看这样行不行：我先给您做个详细的成本拆解，把原材料、锻造、热处理、检测每一项都列清楚，您一看就知道我们的价格是实在的。另外，我们可以先提供小样给您做测试，质量您放心。\n\n至于交期，您这个量我们正常是45天，如果您这边确实急，我可以跟生产那边协调，争取35天交货。您看这个方案怎么样？"\n\n【沟通要点提醒】\n1. 不要直接降价，先强调价值\n2. 提供成本拆解，增加透明度\n3. 用小样测试降低客户决策门槛\n4. 交期可以作为谈判筹码',
        timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      };
      setChatMessages((prev) => [...prev, reply]);
    }, 1000);
  };

  return (
    <Layout>
      <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                <Target className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg md:text-xl font-bold text-coffee-900 font-display">线索雷达</h1>
                <p className="text-xs text-coffee-500">精准获客引擎 · 话术实时辅助</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {(Object.keys(tabConfig) as TabKey[]).map((key) => {
              const config = tabConfig[key];
              const Icon = config.icon;
              return (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={cn(
                    'flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all',
                    tab === key
                      ? 'bg-coffee-700 text-white shadow-md'
                      : 'bg-white text-coffee-600 hover:bg-coffee-50 border border-coffee-200'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span>{config.label}</span>
                </button>
              );
            })}
          </div>

          {tab === 'leads' && (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-white rounded-2xl p-4 shadow-soft">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-coffee-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="搜索企业名称、联系人..."
                      className="w-full pl-10 pr-4 py-2 rounded-xl bg-cream text-sm text-coffee-800 placeholder:text-coffee-400 focus:outline-none focus:ring-2 focus:ring-coffee-300"
                    />
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-coffee-500">行业:</span>
                    {industries.map((ind) => (
                      <button
                        key={ind}
                        onClick={() => setIndustryFilter(ind)}
                        className={cn(
                          'px-3 py-1 rounded-full text-xs font-medium transition-colors',
                          industryFilter === ind
                            ? 'bg-coffee-700 text-white'
                            : 'bg-cream text-coffee-600 hover:bg-coffee-100'
                        )}
                      >
                        {ind}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {filteredLeads.length === 0 && (
                  <div className="bg-white rounded-2xl p-8 text-center text-sm text-coffee-400">没有找到匹配的线索</div>
                )}
                {filteredLeads.map((lead) => (
                  <div
                    key={lead.id}
                    onClick={() => setSelectedLead(lead)}
                    className="bg-white rounded-2xl p-5 shadow-soft hover:shadow-card transition-all cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-coffee-100 flex items-center justify-center">
                          <Building className="w-5 h-5 text-coffee-600" />
                        </div>
                        <div>
                          <h3 className="text-base font-semibold text-coffee-900">{lead.company}</h3>
                          <div className="flex items-center gap-2 text-xs text-coffee-500">
                            <span>{lead.industry}</span>
                            <span>·</span>
                            <span>{lead.scale}</span>
                            <span>·</span>
                            <span>{lead.region}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <div className="text-lg font-bold text-orange-500">{lead.matchScore}</div>
                          <div className="text-[10px] text-coffee-400">匹配度</div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-coffee-300" />
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-coffee-600 mb-3">
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5" />
                        {lead.contact} · {lead.position}
                      </span>
                      <span className="flex items-center gap-1">
                        <Briefcase className="w-3.5 h-3.5" />
                        来源: {lead.source}
                      </span>
                      <span>最近活跃: {lead.lastActive}</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {lead.needs.map((n) => (
                        <span key={n} className="px-2 py-0.5 rounded-full text-xs bg-orange-50 text-orange-600 border border-orange-200">
                          {n}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'scripts' && (
            <div className="flex flex-col lg:flex-row gap-4 lg:h-[calc(100vh-200px)] animate-fade-in">
              <div className="flex-1 bg-white rounded-2xl shadow-soft flex flex-col overflow-hidden">
                <div className="p-4 border-b border-coffee-100">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-coffee-900">话术助手</h3>
                      <p className="text-xs text-coffee-500">输入客户的话，AI帮你分析并生成回复</p>
                    </div>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {chatMessages.map((msg) => (
                    <div key={msg.id} className={cn('flex gap-3', msg.role === 'user' ? 'flex-row-reverse' : '')}>
                      <div
                        className={cn(
                          'w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-xs font-medium',
                          msg.role === 'user' ? 'bg-coffee-600 text-white' : 'bg-gradient-to-br from-purple-500 to-pink-500 text-white'
                        )}
                      >
                        {msg.role === 'user' ? '我' : 'AI'}
                      </div>
                      <div
                        className={cn(
                          'max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap',
                          msg.role === 'user'
                            ? 'bg-coffee-600 text-white rounded-tr-md'
                            : 'bg-cream text-coffee-800 rounded-tl-md'
                        )}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-4 border-t border-coffee-100">
                  <div className="flex items-end gap-2">
                    <div className="flex-1 relative">
                      <textarea
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
                        placeholder="客户说了什么？直接输入或语音录入..."
                        rows={2}
                        className="w-full px-4 py-3 pr-20 rounded-xl bg-cream text-sm text-coffee-800 placeholder:text-coffee-400 focus:outline-none focus:ring-2 focus:ring-coffee-300 resize-none"
                      />
                      <div className="absolute right-2 bottom-2 flex items-center gap-1">
                        <button className="p-1.5 rounded-lg hover:bg-coffee-200 text-coffee-500">
                          <Mic className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <button
                      onClick={handleSendMessage}
                      className="px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium hover:opacity-90 transition-opacity flex items-center gap-1"
                    >
                      <Send className="w-4 h-4" />
                      <span>发送</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    <span className="text-xs text-coffee-400">快捷场景:</span>
                    {['客户嫌价格高', '客户迟迟不下单', '客户要对比竞品', '客户对交期不满意'].map((s) => (
                      <button
                        key={s}
                        onClick={() => setChatInput(s)}
                        className="px-2 py-1 rounded text-xs bg-coffee-50 text-coffee-600 hover:bg-coffee-100 border border-coffee-200"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="w-full lg:w-72 space-y-3">
                <div className="bg-white rounded-2xl p-4 shadow-soft">
                  <h4 className="text-sm font-semibold text-coffee-900 mb-3 flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-amber-500" />
                    销售技巧小贴士
                  </h4>
                  <div className="space-y-2 text-xs text-coffee-600 leading-relaxed">
                    <p>💡 <strong>价格谈判三原则：</strong></p>
                    <ol className="list-decimal pl-4 space-y-1">
                      <li>先讲价值，再谈价格</li>
                      <li>不直接降价，用方案换</li>
                      <li>给客户台阶，保留面子</li>
                    </ol>
                  </div>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-soft">
                  <h4 className="text-sm font-semibold text-coffee-900 mb-3 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-blue-500" />
                    今日沟通提醒
                  </h4>
                  <div className="space-y-2">
                    <div className="p-2 rounded-lg bg-amber-50 border border-amber-200">
                      <p className="text-xs font-medium text-amber-800">张工生日</p>
                      <p className="text-[10px] text-amber-600">中航工业 · 今天是他生日，记得发祝福</p>
                    </div>
                    <div className="p-2 rounded-lg bg-blue-50 border border-blue-200">
                      <p className="text-xs font-medium text-blue-800">李主任跟进</p>
                      <p className="text-[10px] text-blue-600">航天科技 · 方案已发3天，该跟进了</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === 'knowledge' && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {knowledgeCategories.map((cat) => (
                  <div
                    key={cat.id}
                    className="bg-white rounded-2xl p-5 shadow-soft hover:shadow-card transition-all cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="text-3xl">{cat.icon}</div>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-coffee-100 text-coffee-700">
                        {cat.count}个场景
                      </span>
                    </div>
                    <h3 className="text-base font-semibold text-coffee-900 mb-2">{cat.title}</h3>
                    <div className="flex flex-wrap gap-1 mb-3">
                      {cat.scenarios.map((s) => (
                        <span key={s} className="px-2 py-0.5 rounded text-xs bg-coffee-50 text-coffee-600">
                          {s}
                        </span>
                      ))}
                    </div>
                    <button className="text-xs text-coffee-600 hover:text-coffee-800 flex items-center gap-1">
                      查看全部
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
      {selectedLead && <LeadDetailModal lead={selectedLead} onClose={() => setSelectedLead(null)} />}
    </Layout>
  );
}

function LeadDetailModal({ lead, onClose }: { lead: LeadItem; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-coffee-900/40 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[85vh] overflow-y-auto shadow-card" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-coffee-100 flex items-center justify-center">
                <Building className="w-6 h-6 text-coffee-600" />
              </div>
              <div>
                <h2 className="text-base md:text-lg font-bold text-coffee-900">{lead.company}</h2>
                <p className="text-xs text-coffee-500">{lead.industry} · {lead.scale}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1 text-coffee-400 hover:text-coffee-700 rounded">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div className="bg-orange-50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-orange-800">匹配度评分</span>
                <span className="text-2xl font-bold text-orange-500">{lead.matchScore}分</span>
              </div>
              <div className="w-full h-2 bg-orange-200 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-orange-400 to-red-500 rounded-full" style={{ width: `${lead.matchScore}%` }} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-cream rounded-xl p-3">
                <p className="text-xs text-coffee-500 mb-1">联系人</p>
                <p className="text-sm font-medium text-coffee-900">{lead.contact}</p>
                <p className="text-xs text-coffee-500">{lead.position}</p>
              </div>
              <div className="bg-cream rounded-xl p-3">
                <p className="text-xs text-coffee-500 mb-1">所在地区</p>
                <p className="text-sm font-medium text-coffee-900">{lead.region}</p>
                <p className="text-xs text-coffee-500">来源: {lead.source}</p>
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-coffee-900 mb-2">需求标签</p>
              <div className="flex flex-wrap gap-1.5">
                {lead.needs.map((n) => (
                  <span key={n} className="px-3 py-1 rounded-full text-xs bg-orange-50 text-orange-600 border border-orange-200">
                    {n}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button className="flex-1 py-2.5 bg-coffee-700 text-white rounded-xl text-sm font-medium hover:bg-coffee-800">
                生成沟通话术
              </button>
              <button className="flex-1 py-2.5 bg-white text-coffee-700 rounded-xl text-sm font-medium border border-coffee-300 hover:bg-coffee-50">
                添加到客户
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
