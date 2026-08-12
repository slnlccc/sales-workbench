import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Users, Briefcase, ChevronRight, Building2, TrendingUp } from 'lucide-react';
import Layout from '@/components/Layout';
import { projects } from '@/data/projects';
import { customers } from '@/data/customers';
import type { Stage, ProjectItem } from '@/types';
import { cn } from '@/lib/utils';

const stageConfig: Record<Stage, { label: string; color: string; bgColor: string; borderColor: string }> = {
  lead: { label: '线索', color: 'text-slate-700', bgColor: 'bg-slate-100', borderColor: 'border-slate-300' },
  contact: { label: '接洽', color: 'text-blue-700', bgColor: 'bg-blue-100', borderColor: 'border-blue-300' },
  quote: { label: '报价', color: 'text-violet-700', bgColor: 'bg-violet-100', borderColor: 'border-violet-300' },
  won: { label: '成交', color: 'text-emerald-700', bgColor: 'bg-emerald-100', borderColor: 'border-emerald-300' },
  aftersale: { label: '售后', color: 'text-amber-700', bgColor: 'bg-amber-100', borderColor: 'border-amber-300' },
};

export default function ProjectTracker() {
  const navigate = useNavigate();
  const [stageFilter, setStageFilter] = useState<Stage | 'all'>('all');
  const [industryFilter, setIndustryFilter] = useState<string>('all');
  const [customerFilter, setCustomerFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const industries = useMemo(() => Array.from(new Set(projects.map((p) => p.industry))), []);

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      if (stageFilter !== 'all' && p.stage !== stageFilter) return false;
      if (industryFilter !== 'all' && p.industry !== industryFilter) return false;
      if (customerFilter !== 'all' && p.customerId !== customerFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!p.name.toLowerCase().includes(q) && !p.industry.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [stageFilter, industryFilter, customerFilter, searchQuery]);

  const groupedByCustomer = useMemo(() => {
    const groups: Record<string, { customer: typeof customers[0]; projects: ProjectItem[] }> = {};
    filtered.forEach((p) => {
      const customer = customers.find((c) => c.id === p.customerId);
      if (!customer) return;
      if (!groups[customer.id]) {
        groups[customer.id] = { customer, projects: [] };
      }
      groups[customer.id].projects.push(p);
    });
    return Object.values(groups);
  }, [filtered]);

  const totalAmount = filtered.reduce((sum, p) => sum + p.amount, 0);

  return (
    <Layout>
      <div className="flex items-end justify-between mb-5">
            <div>
              <h1 className="text-2xl font-bold text-coffee-900 font-display mb-1">项目跟进</h1>
              <p className="text-sm text-coffee-500">多客户/多销售项目组合视图</p>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="px-3 py-1.5 bg-white rounded-xl shadow-soft">
                <span className="text-coffee-500">项目数 </span>
                <span className="font-bold text-coffee-900">{filtered.length}</span>
              </div>
              <div className="px-3 py-1.5 bg-white rounded-xl shadow-soft">
                <span className="text-coffee-500">总金额 </span>
                <span className="font-bold text-coffee-900">¥ {totalAmount.toLocaleString()} 万</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-3 shadow-soft mb-4 flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-coffee-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索项目名称或行业..."
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-cream text-sm text-coffee-800 placeholder:text-coffee-400 focus:outline-none focus:ring-2 focus:ring-coffee-300"
              />
            </div>
            <Filter className="w-4 h-4 text-coffee-400" />
          </div>

          <div className="space-y-3 mb-5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-coffee-500">阶段:</span>
              <button
                onClick={() => setStageFilter('all')}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-medium transition-colors',
                  stageFilter === 'all' ? 'bg-coffee-700 text-white' : 'bg-white text-coffee-600 border border-coffee-200'
                )}
              >
                全部
              </button>
              {(Object.keys(stageConfig) as Stage[]).map((key) => {
                const config = stageConfig[key];
                return (
                  <button
                    key={key}
                    onClick={() => setStageFilter(key)}
                    className={cn(
                      'px-3 py-1 rounded-full text-xs font-medium transition-colors',
                      stageFilter === key ? 'bg-coffee-700 text-white' : 'bg-white text-coffee-600 border border-coffee-200'
                    )}
                  >
                    {config.label}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-coffee-500">行业:</span>
              <button
                onClick={() => setIndustryFilter('all')}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-medium transition-colors',
                  industryFilter === 'all' ? 'bg-coffee-700 text-white' : 'bg-white text-coffee-600 border border-coffee-200'
                )}
              >
                全部
              </button>
              {industries.map((ind) => (
                <button
                  key={ind}
                  onClick={() => setIndustryFilter(ind)}
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-medium transition-colors',
                    industryFilter === ind ? 'bg-coffee-700 text-white' : 'bg-white text-coffee-600 border border-coffee-200'
                  )}
                >
                  {ind}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-coffee-500">客户:</span>
              <button
                onClick={() => setCustomerFilter('all')}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-medium transition-colors',
                  customerFilter === 'all' ? 'bg-coffee-700 text-white' : 'bg-white text-coffee-600 border border-coffee-200'
                )}
              >
                全部
              </button>
              {customers.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCustomerFilter(c.id)}
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-medium transition-colors',
                    customerFilter === c.id ? 'bg-coffee-700 text-white' : 'bg-white text-coffee-600 border border-coffee-200'
                  )}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {groupedByCustomer.length === 0 && (
              <div className="bg-white rounded-2xl p-8 text-center text-sm text-coffee-400">
                没有符合条件的项目
              </div>
            )}

            {groupedByCustomer.map(({ customer, projects: customerProjects }) => (
              <div key={customer.id} className="bg-white rounded-2xl p-5 shadow-soft">
                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-coffee-100">
                  <div className="w-12 h-12 rounded-xl bg-coffee-100 flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-coffee-700" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold text-coffee-900">{customer.name}</h3>
                      <span className="text-xs text-coffee-500">· {customer.industry}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-coffee-500 mt-1">
                      <span>📐 {customer.scale}</span>
                      <span>·</span>
                      <span>📍 {customer.region}</span>
                      <span>·</span>
                      <span>合作起始 {customer.cooperationSince}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-coffee-500">项目数</p>
                    <p className="text-lg font-bold text-coffee-900">{customerProjects.length}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {customerProjects.map((project) => {
                    const stage = stageConfig[project.stage];
                    return (
                      <div
                        key={project.id}
                        onClick={() => navigate(`/customer-tracker/${project.id}`)}
                        className={cn(
                          'p-4 rounded-xl border-2 cursor-pointer transition-all hover:shadow-card',
                          stage.bgColor, stage.borderColor
                        )}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="text-sm font-semibold text-coffee-900 flex-1 pr-2">{project.name}</h4>
                          <ChevronRight className="w-4 h-4 text-coffee-400 flex-shrink-0" />
                        </div>

                        <div className="flex items-center gap-2 mb-2">
                          <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium bg-white/70', stage.color)}>
                            {stage.label}
                          </span>
                          <span className="text-xs text-coffee-500">· {project.industry}</span>
                        </div>

                        <div className="flex items-baseline gap-1 mb-2">
                          <span className="text-xl font-bold text-coffee-900">¥ {project.amount}</span>
                          <span className="text-xs text-coffee-500">万</span>
                        </div>

                        <div className="mb-2">
                          <div className="flex items-center justify-between text-xs text-coffee-600 mb-1">
                            <span>进度</span>
                            <span className="font-semibold">{project.progress}%</span>
                          </div>
                          <div className="h-1.5 bg-white/60 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-coffee-500 to-caramel rounded-full transition-all"
                              style={{ width: `${project.progress}%` }}
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-1 text-xs text-coffee-600 pt-2 border-t border-coffee-200/50">
                          <TrendingUp className="w-3 h-3" />
                          <span className="truncate">下一步: {project.nextAction}</span>
                          <span className="ml-auto text-coffee-500">{project.nextActionAt}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
    </Layout>
  );
}
