import { useState, useEffect } from 'react';
import {
  Search, TrendingUp, TrendingDown, X, Newspaper, BarChart3, Briefcase, Scale, Calendar,
  ArrowRight, ArrowLeft, FileText, ChevronRight, Users, RefreshCw, Sparkles,
} from 'lucide-react';
import Layout from '@/components/Layout';
import { newsItems, biddingItems, policyItems, exhibitionItems } from '@/data/news';
import type { NewsItem, BiddingItem, PolicyItem, ExhibitionItem } from '@/types';
import { cn } from '@/lib/utils';

type Category = 'industry' | 'materials' | 'bidding' | 'policy' | 'exhibition';

const categoryConfig: Record<Category, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  industry: { label: '行业动态', icon: Newspaper },
  materials: { label: '原材料价格', icon: BarChart3 },
  bidding: { label: '招投标', icon: Briefcase },
  policy: { label: '政策法规', icon: Scale },
  exhibition: { label: '行业展会', icon: Calendar },
};

const industries = ['全部', '航空航天', '能源电力', '新能源', '船舶', '石化', '机械'];
const customers = ['全部客户', '中国航发', '中国航天', '航空工业', '中航集团', '西门子歌美飒', '东方电气', '中国船舶', 'GE Aerospace', 'Rolls-Royce', 'Vestas'];
const impactLevels = ['全部级别', '高影响', '中影响', '低影响'];

interface MaterialItem {
  id: string;
  name: string;
  category: string;
  price: number;
  unit: string;
  change: number;
  changeAmount: number;
  description: string;
  frequency: number;
  source: string;
  lastUpdate: string;
}

const materialsData: MaterialItem[] = [
  { id: 'm1', name: 'GH4169', category: '高温合金', price: 385, unit: '元/kg', change: 3.36, changeAmount: 12.5, description: '镍基高温合金，用于航空发动机涡轮盘、叶片等高温部件', frequency: 168, source: '中国金属网', lastUpdate: '2026-07-14' },
  { id: 'm2', name: 'GH141', category: '高温合金', price: 365, unit: '元/kg', change: 2.38, changeAmount: 8.5, description: '铁镍基高温合金，用于涡轮发动机喷嘴、涡轮叶片', frequency: 131, source: '中国金属网', lastUpdate: '2026-07-14' },
  { id: 'm3', name: '5A06', category: '铝合金', price: 28.5, unit: '元/kg', change: 1.78, changeAmount: 0.5, description: '铝镁系合金，用于航空航天结构件、船舶板材', frequency: 47, source: '中国金属网', lastUpdate: '2026-07-14' },
  { id: 'm4', name: '2A14', category: '铝合金', price: 32.8, unit: '元/kg', change: -2.39, changeAmount: -0.8, description: '铝合金，用于航空航天、高强度结构件', frequency: 40, source: '中国金属网', lastUpdate: '2026-07-14' },
  { id: 'm5', name: '17-4ph', category: '不锈钢', price: 42.5, unit: '元/kg', change: 2.91, changeAmount: 1.2, description: '沉淀硬化不锈钢，用于航空航天构件、核电部件', frequency: 39, source: '中国金属网', lastUpdate: '2026-07-14' },
  { id: 'm6', name: 'GH188', category: '高温合金', price: 320, unit: '元/kg', change: -1.69, changeAmount: -5.5, description: '钴基高温合金，用于涡轮发动机燃烧室、导向叶片', frequency: 34, source: '中国金属网', lastUpdate: '2026-07-14' },
  { id: 'm7', name: 'GH3039', category: '高温合金', price: 295, unit: '元/kg', change: 0.85, changeAmount: 2.5, description: '镍基高温合金板材，用于燃烧室部件', frequency: 28, source: '中国金属网', lastUpdate: '2026-07-14' },
  { id: 'm8', name: 'GH4099', category: '高温合金', price: 410, unit: '元/kg', change: 1.74, changeAmount: 7.0, description: '镍基时效硬化高温合金', frequency: 22, source: '中国金属网', lastUpdate: '2026-07-14' },
  { id: 'm9', name: '7050', category: '铝合金', price: 31.2, unit: '元/kg', change: 0.65, changeAmount: 0.2, description: '航空高强铝合金，用于飞机机身框架', frequency: 56, source: '中国金属网', lastUpdate: '2026-07-14' },
];

const impactLevelMap: Record<string, string> = {
  '高影响': 'bg-red-500',
  '中影响': 'bg-amber-500',
  '低影响': 'bg-blue-500',
};

export default function MarketRadar() {
  const [category, setCategory] = useState<Category>('industry');
  const [searchQuery, setSearchQuery] = useState('');
  const [industry, setIndustry] = useState('全部');
  const [customer, setCustomer] = useState('全部客户');
  const [impact, setImpact] = useState('全部级别');
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialItem | null>(null);
  const [selectedBid, setSelectedBid] = useState<BiddingItem | null>(null);
  const [selectedPolicy, setSelectedPolicy] = useState<PolicyItem | null>(null);
  const [selectedExhibition, setSelectedExhibition] = useState<ExhibitionItem | null>(null);
  const [readNewsIds, setReadNewsIds] = useState<Set<string>>(new Set());
  const [materials, setMaterials] = useState<MaterialItem[]>(materialsData);
  const [materialsUpdating, setMaterialsUpdating] = useState(false);

  useEffect(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    if (dayOfWeek === 1) {
      setMaterialsUpdating(true);
      setTimeout(() => setMaterialsUpdating(false), 2000);
    }
  }, []);

  const handleNewsClick = (news: NewsItem) => {
    setSelectedNews(news);
    setReadNewsIds((prev) => new Set(prev).add(news.id));
  };

  const isNewsNew = (news: NewsItem) => {
    const newsDate = new Date(news.publishedAt);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - newsDate.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 2 && !readNewsIds.has(news.id);
  };

  const refreshMaterials = () => {
    setMaterialsUpdating(true);
    setTimeout(() => {
      setMaterialsUpdating(false);
    }, 1500);
  };

  const filteredNews = newsItems
    .filter((n) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!n.title.toLowerCase().includes(q) && !n.summary.toLowerCase().includes(q) && !n.keywords.some((k) => k.toLowerCase().includes(q))) return false;
      }
      if (customer !== '全部客户' && !n.keywords.includes(customer) && !n.title.includes(customer)) return false;
      return true;
    })
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  const filteredBids = biddingItems.filter((b) => {
    if (searchQuery && !b.title.toLowerCase().includes(searchQuery.toLowerCase()) && !b.org.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (industry !== '全部' && b.industry !== industry) return false;
    return true;
  });

  const filteredPolicies = policyItems.filter((p) => {
    if (searchQuery && !p.title.toLowerCase().includes(searchQuery.toLowerCase()) && !p.department.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <Layout>
          <div className="bg-cream-100 rounded-2xl p-3 shadow-soft mb-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-cream-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索关键词..."
                className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-white text-sm text-cream-800 placeholder:text-cream-500 focus:outline-none focus:ring-2 focus:ring-cream-400 transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {(Object.keys(categoryConfig) as Category[]).map((key) => {
              const config = categoryConfig[key];
              const Icon = config.icon;
              return (
                <button
                  key={key}
                  onClick={() => setCategory(key)}
                  className={cn(
                    'flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all',
                    category === key
                      ? 'bg-cream-700 text-white shadow-md'
                      : 'bg-white text-cream-700 hover:bg-cream-100 border border-cream-300'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span>{config.label}</span>
                </button>
              );
            })}
          </div>

          {category === 'industry' && (
            <div className="space-y-4 animate-fade-in">
              <FilterBar industries={industries} customers={customers} impactLevels={impactLevels}
                industry={industry} customer={customer} impact={impact}
                onIndustryChange={setIndustry} onCustomerChange={setCustomer} onImpactChange={setImpact} />

              <div className="space-y-3">
                {filteredNews.length === 0 && <EmptyState>没有找到匹配的资讯</EmptyState>}
                {filteredNews.map((news) => {
                  const isHigh = news.keywords.includes('中国航发') || news.keywords.includes('航天科工');
                  const impactLabel = isHigh ? '高影响' : '中影响';
                  const isNew = isNewsNew(news);
                  return (
                    <div key={news.id} onClick={() => handleNewsClick(news)}
                      className="bg-white rounded-2xl p-5 shadow-soft hover:shadow-card transition-all cursor-pointer relative">
                      {isNew && (
                        <span className="absolute top-4 right-4 px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse z-10">新</span>
                      )}
                      <div className="flex items-start gap-3 mb-2">
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-cream-100 text-cream-700">{news.category}</span>
                        <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium text-white', impactLevelMap[impactLabel])}>{impactLabel}</span>
                        <span className="ml-auto text-xs text-cream-500">{news.publishedAt}</span>
                      </div>
                      <h3 className="text-base font-semibold text-cream-900 mb-2 pr-12">{news.title}</h3>
                      <p className="text-sm text-cream-700 leading-relaxed mb-3 line-clamp-2">{news.summary}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {news.keywords.slice(0, 3).map((kw) => (
                            <span key={kw} className="px-2 py-0.5 rounded-full text-xs bg-cream-100 text-cream-700 border border-cream-300">{kw}</span>
                          ))}
                        </div>
                        <button className="flex items-center gap-1 text-sm text-cream-700 hover:text-cream-900">
                          <span>查看详情</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {category === 'materials' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-cream-600">
                  <BarChart3 className="w-4 h-4" />
                  <span>数据来源：中国金属网</span>
                  <span>·</span>
                  <span>每周一更新</span>
                  <span>·</span>
                  <span>上次更新：2026-07-14</span>
                </div>
                <button
                  onClick={refreshMaterials}
                  disabled={materialsUpdating}
                  className="flex items-center gap-1 px-3 py-1.5 bg-cream-200 text-cream-700 rounded-lg text-xs font-medium hover:bg-cream-300 disabled:opacity-50"
                >
                  <RefreshCw className={cn('w-3.5 h-3.5', materialsUpdating && 'animate-spin')} />
                  <span>{materialsUpdating ? '更新中...' : '刷新数据'}</span>
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {materials.map((mat) => (
                  <div key={mat.id} onClick={() => setSelectedMaterial(mat)}
                    className="bg-white rounded-2xl p-4 shadow-soft hover:shadow-card transition-all cursor-pointer">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-lg font-bold text-cream-900">{mat.name}</h3>
                        <span className="text-xs text-cream-600">{mat.category}</span>
                      </div>
                      {mat.change > 0 ? <TrendingUp className="w-4 h-4 text-red-500" /> : <TrendingDown className="w-4 h-4 text-emerald-500" />}
                    </div>
                    <div className="flex items-baseline gap-1 mb-2">
                      <span className="text-2xl font-bold text-cream-900">{mat.price}</span>
                      <span className="text-sm text-cream-600">{mat.unit}</span>
                    </div>
                    <div className={cn('text-xs font-medium', mat.change > 0 ? 'text-red-500' : 'text-emerald-500')}>
                      {mat.change > 0 ? '+' : ''}{mat.change}% ({mat.change > 0 ? '+' : ''}{mat.changeAmount})
                    </div>
                    <p className="text-xs text-cream-600 mt-2 line-clamp-2">{mat.description}</p>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-cream-200">
                      <span className="text-xs text-cream-500">使用: {mat.frequency}次</span>
                      <span className="text-xs text-cream-500">{mat.source}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {category === 'bidding' && (
            <div className="space-y-4 animate-fade-in">
              {filteredBids.length === 0 && <EmptyState>没有找到匹配的招标信息</EmptyState>}
              {filteredBids.map((bid) => (
                <div key={bid.id} onClick={() => setSelectedBid(bid)}
                  className="bg-white rounded-2xl p-5 shadow-soft hover:shadow-card transition-all cursor-pointer flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">{bid.industry}</span>
                      <span className={cn(
                        'px-2 py-0.5 rounded-full text-xs font-medium',
                        bid.status === '招标中' ? 'bg-emerald-100 text-emerald-700' :
                        bid.status === '即将截止' ? 'bg-amber-100 text-amber-700' :
                        'bg-cream-200 text-cream-700'
                      )}>
                        {bid.status}
                      </span>
                    </div>
                    <h3 className="text-base font-semibold text-cream-900 mb-1.5">{bid.title}</h3>
                    <div className="flex items-center gap-3 text-xs text-cream-600">
                      <span>🏢 {bid.org}</span>
                      <span>💰 {bid.amount}万</span>
                      <span>📅 截止 {bid.deadline}</span>
                    </div>
                    {bid.sourceName && (
                      <div className="flex items-center gap-1 mt-2 text-xs text-cream-500">
                        <span className="px-1.5 py-0.5 rounded bg-cream-100">📄</span>
                        <span>来源: {bid.sourceName}</span>
                      </div>
                    )}
                  </div>
                  <ChevronRight className="w-5 h-5 text-cream-400 flex-shrink-0" />
                </div>
              ))}
            </div>
          )}

          {category === 'policy' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 animate-fade-in">
              {filteredPolicies.length === 0 && <EmptyState>没有找到匹配的政策法规</EmptyState>}
              {filteredPolicies.map((pol) => (
                <div key={pol.id} onClick={() => setSelectedPolicy(pol)}
                  className="bg-white rounded-2xl p-5 shadow-soft hover:shadow-card transition-all cursor-pointer">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-cream-200 text-cream-700">{pol.policyType}</span>
                    <span className="text-xs text-cream-500">{pol.publishedAt}</span>
                  </div>
                  <h3 className="text-base font-semibold text-cream-900 mb-2 line-clamp-2">{pol.title}</h3>
                  <p className="text-xs text-cream-600 mb-3 flex items-center gap-1">
                    🏛 {pol.department}
                  </p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {pol.keywords.map((kw) => (
                      <span key={kw} className="px-2 py-0.5 rounded-full text-xs bg-cream-100 text-cream-700 border border-cream-300">{kw}</span>
                    ))}
                  </div>
                  <div className="mt-3 flex items-center gap-1 text-xs text-cream-600 hover:text-cream-800">
                    <span>查看详情</span>
                    <ArrowRight className="w-3 h-3" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {category === 'exhibition' && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {exhibitionItems.map((ex) => (
                  <div key={ex.id} onClick={() => setSelectedExhibition(ex)}
                  className="bg-white rounded-2xl p-5 shadow-soft hover:shadow-card transition-all cursor-pointer">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium',
                        ex.importance === '重点' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700')}>
                        {ex.importance}
                      </span>
                      <span className="text-xs text-cream-600">{ex.month}</span>
                      <span className="text-xs text-cream-500">{ex.frequency}</span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-cream-400" />
                  </div>
                  <h3 className="text-base font-semibold text-cream-900 mb-2">{ex.title}</h3>
                  <p className="text-xs text-cream-600 mb-3 flex items-center gap-1">📍 {ex.location}</p>
                  <p className="text-xs text-cream-700 mb-3 line-clamp-2">{ex.description}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-cream-600">关键客户:</span>
                    {ex.keyCustomers.slice(0, 5).map((c) => (
                      <span key={c} className="px-2 py-0.5 rounded text-xs bg-cream-100 text-cream-700">{c}</span>
                    ))}
                    {ex.keyCustomers.length > 5 && (
                      <span className="text-xs text-cream-500">+{ex.keyCustomers.length - 5}</span>
                    )}
                  </div>
                </div>
                ))}
              </div>
            </div>
          )}
      {selectedNews && <NewsDetailModal news={selectedNews} onClose={() => setSelectedNews(null)} />}
      {selectedMaterial && <MaterialDetailModal material={selectedMaterial} onClose={() => setSelectedMaterial(null)} />}
      {selectedBid && <BidDetailModal bid={selectedBid} onClose={() => setSelectedBid(null)} />}
      {selectedPolicy && <PolicyDetailModal policy={selectedPolicy} onClose={() => setSelectedPolicy(null)} />}
      {selectedExhibition && <ExhibitionDetailModal exhibition={selectedExhibition} onClose={() => setSelectedExhibition(null)} />}
    </Layout>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl p-8 text-center text-sm text-cream-500">
      {children}
    </div>
  );
}

function FilterBar({ industries, customers, impactLevels, industry, customer, impact, onIndustryChange, onCustomerChange, onImpactChange }: {
  industries: string[]; customers: string[]; impactLevels: string[];
  industry: string; customer: string; impact: string;
  onIndustryChange: (v: string) => void; onCustomerChange: (v: string) => void; onImpactChange: (v: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-cream-600 w-20">行业分类:</span>
        {industries.map((ind) => (
          <button key={ind} onClick={() => onIndustryChange(ind)}
            className={cn('px-3 py-1 rounded-full text-xs font-medium transition-colors', industry === ind ? 'bg-cream-700 text-white' : 'bg-white text-cream-700 border border-cream-300 hover:bg-cream-100')}>
            {ind}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-cream-600 w-20">重点客户:</span>
        {customers.map((c) => (
          <button key={c} onClick={() => onCustomerChange(c)}
            className={cn('px-3 py-1 rounded-full text-xs font-medium transition-colors', customer === c ? 'bg-cream-700 text-white' : 'bg-white text-cream-700 border border-cream-300 hover:bg-cream-100')}>
            {c}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-cream-600 w-20">影响级别:</span>
        {impactLevels.map((lv) => (
          <button key={lv} onClick={() => onImpactChange(lv)}
            className={cn('px-3 py-1 rounded-full text-xs font-medium transition-colors', impact === lv ? 'bg-cream-700 text-white' : 'bg-white text-cream-700 border border-cream-300 hover:bg-cream-100')}>
            {lv}
          </button>
        ))}
      </div>
    </div>
  );
}

function NewsDetailModal({ news, onClose }: { news: NewsItem; onClose: () => void }) {
  const generateForgingInsights = (n: NewsItem) => {
    const title = n.title;
    if (title.includes('液体火箭') || title.includes('航天')) {
      return {
        insight: '从锻件行业视角看，航天领域液体火箭发动机的快速迭代对高温合金、钛合金锻件需求拉动显著。尤其是涡轮泵、燃烧室等核心部件，对大规格、高均质锻件的技术要求持续提升。派克新材在航天领域的布局将直接受益于商业航天的爆发式增长，建议重点关注可重复使用火箭对锻件疲劳寿命、高温性能的新要求。',
        business: [
          '加大航天领域高温合金/钛合金锻件研发投入，重点突破大规格整体锻造成型技术',
          '深度参与航天科技/航天科工型号预研，建立技术前置优势',
          '关注可重复使用火箭技术路线，提前布局抗疲劳、长寿命锻件工艺',
          '与航天院所共建联合实验室，深化产学研合作',
        ],
      };
    }
    if (title.includes('航空发动机') || title.includes('航发')) {
      return {
        insight: '航空发动机国产化加速推进，直接带动高温合金锻件需求大幅增长。作为航空发动机产业链的核心上游，锻件企业迎来黄金发展期。派克新材需抓住国产替代窗口期，重点突破GH4169、GH4099等高温合金大规格盘件、环件的稳定批量生产能力，提升材料利用率和成品率。',
        business: [
          '加速航空发动机用高温合金锻件资质认证，进入中国航发核心供应商体系',
          '重点布局大规格盘锻件、环锻件产能，抢占国产替代市场份额',
          '提升热处理工艺水平，满足航空发动机对材料组织性能的严苛要求',
          '建立航空发动机锻件全流程质量追溯体系',
        ],
      };
    }
    if (title.includes('供应链') || title.includes('国产')) {
      return {
        insight: '供应链国产化为国内锻造企业带来重大战略机遇。航空航天、能源等高端装备领域的关键材料国产化趋势明确，锻件作为核心基础零部件，将持续受益于进口替代。对于派克新材而言，需在技术标准、质量稳定性上对标国际一流企业，同时发挥本土服务响应快、定制化能力强的优势。',
        business: [
          '对标国际一流锻造企业，全面提升工艺技术和质量管理水平',
          '聚焦高端装备关键锻件国产化机会，加大研发投入',
          '强化与主机厂的深度合作，建立长期战略合作伙伴关系',
          '发挥本土优势，提供快速响应和定制化技术服务',
        ],
      };
    }
    if (title.includes('核电') || title.includes('能源')) {
      return {
        insight: '核电等清洁能源的快速发展为锻件行业带来新增长极。核电压力容器、蒸汽发生器、主管道等大型锻件技术门槛高、价值量大，是重型锻造企业的核心产品方向。派克新材在核电锻件领域已积累一定技术优势，建议持续加大投入，巩固在核电锻件市场的领先地位。',
        business: [
          '持续加大核电锻件技术研发，重点突破大型不锈钢、低合金钢锻件',
          '完善核电资质体系，扩大核电产品认证范围',
          '与核电设计院、主机厂深度合作，参与新一代核电技术研发',
          '布局四代核电、小堆等新兴技术方向的锻件预研',
        ],
      };
    }
    return {
      insight: '该条资讯反映了行业发展的重要趋势，从锻件行业角度分析，建议结合公司核心产品（高温合金、钛合金、不锈钢锻件）和目标市场（航空航天、能源电力）进行深度研判。锻件作为装备制造业的基础核心零部件，行业景气度与下游投资高度相关，需持续跟踪重点客户的投资计划和技术路线变化。',
      business: [
        '持续跟踪行业动态，及时调整市场策略',
        '加强与重点客户的技术交流，把握需求变化',
        '聚焦公司优势产品领域，深化技术积累',
        '关注行业技术标准变化，提前布局技术升级',
      ],
    };
  };

  const { insight, business } = generateForgingInsights(news);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-cream-900/40 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-card" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-start gap-2 mb-3">
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-cream-200 text-cream-700">{news.category}</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-medium text-white bg-red-500">高影响</span>
            <span className="ml-auto text-xs text-cream-500">{news.publishedAt}</span>
          </div>
          <h2 className="text-xl font-bold text-cream-900 mb-2 font-display">{news.title}</h2>
          <div className="flex items-center gap-2 text-xs text-cream-600 mb-5">
            <span>{news.source}</span>
            <span>· {news.publishedAt}</span>
          </div>
          <p className="text-sm text-cream-700 leading-relaxed mb-5">{news.summary}</p>
          <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 mb-3">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-semibold text-indigo-900">锻件行业见解点评</h3>
            </div>
            <p className="text-sm text-indigo-800 leading-relaxed">{insight}</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5">
            <h3 className="text-sm font-semibold text-amber-900 mb-2">💼 商业价值思考</h3>
            <ol className="text-sm text-amber-800 leading-relaxed space-y-1.5 list-decimal pl-5">
              {business.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ol>
          </div>
          <div className="flex items-center justify-end">
            <button onClick={onClose} className="px-5 py-2 bg-cream-700 text-white rounded-xl text-sm font-medium hover:bg-cream-800">关闭</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MaterialDetailModal({ material, onClose }: { material: MaterialItem; onClose: () => void }) {
  const isUp = material.change > 0;
  const pathData = 'M 0 80 Q 50 60, 100 70 T 200 65 T 300 75 T 400 60 T 500 70';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-coffee-900/40 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-card" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-start gap-2 mb-3">
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-coffee-100 text-coffee-700">{material.category}</span>
            <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', isUp ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700')}>{isUp ? '↗ 上涨' : '↘ 下跌'}</span>
            <button onClick={onClose} className="ml-auto p-1 text-coffee-400 hover:text-coffee-700 rounded"><X className="w-4 h-4" /></button>
          </div>
          <h2 className="text-2xl font-bold text-coffee-900 mb-2 font-display">{material.name}</h2>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-3xl font-bold text-coffee-900">{material.price}</span>
            <span className="text-sm text-coffee-500">{material.unit}</span>
          </div>
          <div className={cn('text-sm font-medium', isUp ? 'text-red-500' : 'text-emerald-500')}>{isUp ? '+' : ''}{material.change}% ({isUp ? '+' : ''}{material.changeAmount})</div>
          <div className="mt-5 mb-4">
            <div className="flex items-center gap-2 mb-2"><span className="text-sm text-coffee-700 font-medium">📋 材料说明</span></div>
            <p className="text-sm text-coffee-700 leading-relaxed">{material.description}</p>
            <p className="text-xs text-coffee-400 mt-2">使用频率: {material.frequency}次</p>
          </div>
          <div className="bg-gradient-to-br from-red-50 to-amber-50 rounded-2xl p-4">
            <h3 className="text-sm font-semibold text-coffee-700 mb-3">近30天价格走势</h3>
            <div className="relative h-32">
              <svg viewBox="0 0 500 100" className="w-full h-full" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="lineGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#E15D5D" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#E15D5D" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d={`${pathData} L 500 100 L 0 100 Z`} fill="url(#lineGradient)" />
                <path d={pathData} stroke="#E15D5D" strokeWidth="2" fill="none" />
              </svg>
              <div className="absolute inset-y-0 right-0 flex flex-col justify-between text-[10px] text-coffee-400 py-1">
                {[100, 80, 60, 40, 20].map((v) => <span key={v}>{Math.round(v * material.price / 100)}元/kg</span>)}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-end mt-5">
            <button onClick={onClose} className="px-5 py-2 bg-cream-700 text-white rounded-xl text-sm font-medium hover:bg-cream-800">关闭</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function BidDetailModal({ bid, onClose }: { bid: BiddingItem; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-coffee-900/40 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-card" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-start gap-2 mb-3">
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">{bid.industry}</span>
            <span className={cn(
              'px-2 py-0.5 rounded-full text-xs font-medium',
              bid.status === '招标中' ? 'bg-emerald-100 text-emerald-700' :
              bid.status === '即将截止' ? 'bg-amber-100 text-amber-700' :
              'bg-coffee-100 text-coffee-700'
            )}>{bid.status}</span>
            <button onClick={onClose} className="ml-auto p-1 text-coffee-400 hover:text-coffee-700 rounded"><X className="w-4 h-4" /></button>
          </div>
          <h2 className="text-xl font-bold text-coffee-900 mb-1 font-display">{bid.title}</h2>
          <div className="flex items-center gap-3 text-xs text-coffee-500 mb-5">
            <span>🏢 {bid.org}</span>
            <span>💰 {bid.amount}万</span>
            <span>📅 截止 {bid.deadline}</span>
          </div>

          {bid.sourceName && (
            <div className="mb-5 bg-blue-50 border border-blue-200 rounded-xl p-3">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-blue-600 font-medium">📄 信息来源:</span>
                <span className="text-blue-700">{bid.sourceName}</span>
                {bid.sourceUrl && (
                  <a href={bid.sourceUrl} target="_blank" rel="noopener noreferrer" className="ml-auto text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1">
                    <span>查看原文</span>
                    <ArrowRight className="w-3 h-3" />
                  </a>
                )}
              </div>
              {bid.sourceUrl && (
                <p className="text-xs text-blue-500 mt-1 break-all">{bid.sourceUrl}</p>
              )}
            </div>
          )}

          <div className="mb-5">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-coffee-600" />
              <h3 className="text-sm font-semibold text-coffee-900">项目描述</h3>
            </div>
            <p className="text-sm text-coffee-700 leading-relaxed bg-coffee-50 rounded-xl p-3">{bid.description}</p>
          </div>

          {bid.requirements.length > 0 && (
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base">📋</span>
                <h3 className="text-sm font-semibold text-coffee-900">投标要求</h3>
              </div>
              <ol className="text-sm text-coffee-700 leading-relaxed space-y-1.5 list-decimal pl-5">
                {bid.requirements.map((req, i) => (
                  <li key={i}>{req}</li>
                ))}
              </ol>
            </div>
          )}

          {bid.competitors.length > 0 && (
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-coffee-600" />
                <h3 className="text-sm font-semibold text-coffee-900">主要竞争对手分析</h3>
              </div>
              <div className="space-y-3">
                {bid.competitors.map((comp) => (
                  <div key={comp.name} className="bg-coffee-50 rounded-xl p-3">
                    <p className="text-sm font-semibold text-coffee-900 mb-2">{comp.name}</p>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-start gap-2">
                        <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-medium flex-shrink-0">优势</span>
                        <span className="text-coffee-700">{comp.advantage}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-medium flex-shrink-0">劣势</span>
                        <span className="text-coffee-700">{comp.disadvantage}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-end">
            <button onClick={onClose} className="px-5 py-2 bg-cream-700 text-white rounded-xl text-sm font-medium hover:bg-cream-800">关闭</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PolicyDetailModal({ policy, onClose }: { policy: PolicyItem; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-coffee-900/40 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-card" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-start gap-2 mb-3">
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-coffee-100 text-coffee-700">{policy.policyType}</span>
            <button onClick={onClose} className="ml-auto p-1 text-coffee-400 hover:text-coffee-700 rounded"><X className="w-4 h-4" /></button>
          </div>
          <h2 className="text-xl font-bold text-coffee-900 mb-1 font-display">{policy.title}</h2>
          <div className="flex items-center gap-3 text-xs text-coffee-500 mb-5">
            <span>🏛 {policy.department}</span>
            <span>📅 {policy.publishedAt}</span>
          </div>

          <div className="mb-5">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-coffee-600" />
              <h3 className="text-sm font-semibold text-coffee-900">政策全文</h3>
            </div>
            <div className="bg-cream border border-coffee-200 rounded-2xl p-4 text-sm text-coffee-800 leading-relaxed whitespace-pre-line">
              {policy.content}
            </div>
          </div>

          <div className="mb-4">
            <h3 className="text-xs font-semibold text-coffee-500 mb-2">关键词</h3>
            <div className="flex items-center gap-1.5 flex-wrap">
              {policy.keywords.map((kw) => (
                <span key={kw} className="px-2 py-0.5 rounded-full text-xs bg-coffee-50 text-coffee-600 border border-coffee-200">{kw}</span>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end">
            <button onClick={onClose} className="px-5 py-2 bg-cream-700 text-white rounded-xl text-sm font-medium hover:bg-cream-800">关闭</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ExhibitionDetailModal({ exhibition, onClose }: { exhibition: ExhibitionItem; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-coffee-900/40 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-card" onClick={(e) => e.stopPropagation()}>
        <div className="bg-blue-600 px-6 py-4">
          <div className="flex items-center gap-2">
            <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium',
              exhibition.importance === '重点' ? 'bg-red-500 text-white' : 'bg-blue-400 text-white')}>
              {exhibition.importance}展会
            </span>
            <span className="text-white/80 text-xs">{exhibition.month} | {exhibition.frequency}</span>
            <button onClick={onClose} className="ml-auto p-1 text-white/60 hover:text-white rounded"><X className="w-4 h-4" /></button>
          </div>
          <h2 className="text-xl font-bold text-white mt-2">{exhibition.title}</h2>
          <p className="text-white/80 text-sm">{exhibition.location} | {exhibition.description}</p>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-green-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base">📊</span>
                <h3 className="text-xs font-semibold text-green-800">预期收益</h3>
              </div>
              <p className="text-xs text-green-700">预计线索数</p>
              <p className="text-2xl font-bold text-green-600">{exhibition.expectedRevenue.estimateCount}</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base">🤝</span>
                <h3 className="text-xs font-semibold text-blue-800">关键客户</h3>
              </div>
              <div className="flex flex-wrap gap-1">
                {exhibition.keyCustomers.slice(0, 3).map((c) => (
                  <span key={c} className="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700">{c}</span>
                ))}
              </div>
              <p className="text-xs text-blue-600 mt-2">预估订单价值</p>
              <p className="text-xl font-bold text-blue-600">{exhibition.expectedRevenue.estimateValue}</p>
            </div>
          </div>

          {exhibition.relatedBids.length > 0 && (
            <div className="bg-amber-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-base">📋</span>
                <h3 className="text-sm font-semibold text-amber-800">相关招标信息</h3>
              </div>
              <div className="space-y-3">
                {exhibition.relatedBids.map((bid, i) => (
                  <div key={i} className="bg-white rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-coffee-900">{bid.title}</p>
                      <span className="text-xs font-bold text-amber-600">{bid.amount}万</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-coffee-500">
                      <span>客户: {bid.customer}</span>
                      <span>截止日期: {bid.deadline}</span>
                      <span className="px-1.5 py-0.5 rounded bg-green-100 text-green-700">{bid.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {exhibition.competitors.length > 0 && (
            <div className="bg-red-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-base">⚠️</span>
                <h3 className="text-sm font-semibold text-red-800">竞争对手分析</h3>
              </div>
              <div className="space-y-3">
                {exhibition.competitors.map((comp) => (
                  <div key={comp.name} className="bg-white rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold text-coffee-900">{comp.name}</p>
                      <div className="flex items-center gap-1">
                        {comp.products.map((p) => (
                          <span key={p} className="text-[10px] px-1.5 py-0.5 rounded bg-coffee-100 text-coffee-600">{p}</span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-start gap-2 mb-1">
                      <span className="px-1.5 py-0.5 rounded bg-green-100 text-green-700 font-medium text-xs flex-shrink-0">优势</span>
                      <span className="text-xs text-coffee-700">{comp.advantage}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-medium text-xs flex-shrink-0">劣势</span>
                      <span className="text-xs text-coffee-700">{comp.disadvantage}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {exhibition.opportunityAssessment.length > 0 && (
            <div className="bg-purple-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-base">💡</span>
                <h3 className="text-sm font-semibold text-purple-800">招投标机会评估</h3>
              </div>
              <div className="space-y-3">
                {exhibition.opportunityAssessment.map((opp, i) => (
                  <div key={i} className="bg-white rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-coffee-900">{opp.title}</p>
                      <div className="flex items-center gap-2">
                        <span className={cn('text-xs px-2 py-0.5 rounded-full',
                          opp.probability === '高' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700')}>
                          成功率: {opp.probability}
                        </span>
                        <span className="text-xs font-bold text-purple-600">{opp.value}</span>
                      </div>
                    </div>
                    <p className="text-xs text-coffee-600 mt-2">建议行动: {opp.suggestion}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(exhibition.strategy.preShow.length > 0 || exhibition.strategy.duringShow.length > 0 || exhibition.strategy.afterShow.length > 0) && (
            <div className="bg-teal-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-base">📝</span>
                <h3 className="text-sm font-semibold text-teal-800">参展策略</h3>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <h4 className="text-xs font-semibold text-teal-700 mb-2">展前准备</h4>
                  <ul className="text-xs text-teal-700 space-y-1 list-disc pl-3">
                    {exhibition.strategy.preShow.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-teal-700 mb-2">展中执行</h4>
                  <ul className="text-xs text-teal-700 space-y-1 list-disc pl-3">
                    {exhibition.strategy.duringShow.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-teal-700 mb-2">展后跟进</h4>
                  <ul className="text-xs text-teal-700 space-y-1 list-disc pl-3">
                    {exhibition.strategy.afterShow.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end">
            <button onClick={onClose} className="px-5 py-2 bg-cream-700 text-white rounded-xl text-sm font-medium hover:bg-cream-800">关闭</button>
          </div>
        </div>
      </div>
    </div>
  );
}
