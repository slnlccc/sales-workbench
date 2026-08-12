import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search, TrendingUp, TrendingDown, X, Newspaper, BarChart3, Briefcase, Scale, Calendar,
  ArrowRight, ArrowLeft, FileText, ChevronRight, Users, RefreshCw, Sparkles, ExternalLink, Swords,
} from 'lucide-react';
import Layout from '@/components/Layout';
import MarketDataPanel from '@/components/MarketDataPanel';
import { newsItems, biddingItems, policyItems, exhibitionItems } from '@/data/news';
import type { NewsItem, BiddingItem, PolicyItem, ExhibitionItem, CompetitorItem } from '@/types';
import { dataApi } from '@/services/api';
import { cn } from '@/lib/utils';

type Category = 'industry' | 'materials' | 'bidding' | 'policy' | 'exhibition' | 'competitor' | 'ai-market';

const categoryConfig: Record<Category, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  industry: { label: '行业动态', icon: Newspaper },
  materials: { label: '原材料价格', icon: BarChart3 },
  bidding: { label: '招投标', icon: Briefcase },
  policy: { label: '政策法规', icon: Scale },
  exhibition: { label: '行业展会', icon: Calendar },
  competitor: { label: '竞争对手动态', icon: Swords },
  'ai-market': { label: 'AI市场数据', icon: Sparkles },
};

const industries = ['全部', '航空航天', '能源电力', '新能源', '船舶', '石化', '机械', '轨道交通', '汽车', '军工'];
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
  priceHistory?: number[]; // 后端每日生成 30 天价格序列，前端绘制走势
}

// 静态兜底数据（后端 AI 不可用时使用），含独立的 30 天走势
const fallbackMaterials: MaterialItem[] = [
  { id: 'm1', name: 'GH4169', category: '高温合金', price: 385, unit: '元/kg', change: 3.36, changeAmount: 12.5, description: '镍基高温合金，用于航空发动机涡轮盘、叶片等高温部件', frequency: 168, source: '中国金属网', lastUpdate: '2026-07-14', priceHistory: [365,368,370,372,369,371,374,376,378,375,377,380,382,379,381,383,380,382,385,383,386,388,385,387,389,386,388,390,387,385] },
  { id: 'm2', name: 'GH4141', category: '高温合金', price: 365, unit: '元/kg', change: 2.38, changeAmount: 8.5, description: '铁镍基高温合金，用于涡轮发动机喷嘴、涡轮叶片', frequency: 131, source: '中国金属网', lastUpdate: '2026-07-14', priceHistory: [350,352,354,351,353,355,357,354,356,358,360,357,359,361,363,360,362,364,361,363,365,362,364,366,363,365,367,364,366,365] },
  { id: 'm3', name: '5A06', category: '铝合金', price: 28.5, unit: '元/kg', change: 1.78, changeAmount: 0.5, description: '铝镁系合金，用于航空航天结构件、船舶板材', frequency: 47, source: '中国金属网', lastUpdate: '2026-07-14', priceHistory: [27.5,27.8,27.6,28.0,27.9,28.1,28.3,28.2,28.4,28.1,28.3,28.5,28.4,28.2,28.5,28.7,28.6,28.4,28.7,28.5,28.8,28.6,28.4,28.7,28.5,28.8,28.6,28.9,28.7,28.5] },
  { id: 'm4', name: '2A14', category: '铝合金', price: 32.8, unit: '元/kg', change: -2.39, changeAmount: -0.8, description: '铝合金，用于航空航天、高强度结构件', frequency: 40, source: '中国金属网', lastUpdate: '2026-07-14', priceHistory: [34.5,34.2,34.4,34.0,33.8,34.1,33.6,33.4,33.7,33.2,33.5,33.0,33.3,32.8,33.1,32.6,32.9,32.4,32.7,32.2,32.5,32.0,32.3,31.8,32.1,32.6,32.3,32.7,32.5,32.8] },
  { id: 'm5', name: '17-4PH', category: '不锈钢', price: 42.5, unit: '元/kg', change: 2.91, changeAmount: 1.2, description: '沉淀硬化不锈钢，用于航空航天构件、核电部件', frequency: 39, source: '中国金属网', lastUpdate: '2026-07-14', priceHistory: [40.5,40.8,41.0,40.7,41.2,41.0,41.4,41.6,41.3,41.5,41.8,41.6,42.0,41.7,42.1,41.9,42.3,42.0,42.4,42.2,42.5,42.3,42.6,42.4,42.7,42.5,42.8,42.6,42.3,42.5] },
  { id: 'm6', name: 'TC4', category: '钛合金', price: 180, unit: '元/kg', change: 4.05, changeAmount: 7.0, description: 'α+β型两相钛合金，用于航空发动机风扇叶片、飞机结构件', frequency: 34, source: '中国金属网', lastUpdate: '2026-07-14', priceHistory: [165,167,168,166,169,171,170,172,174,173,175,177,176,178,175,177,179,178,176,179,181,180,178,181,183,182,180,183,181,180] },
  { id: 'm7', name: 'TC11', category: '钛合金', price: 220, unit: '元/kg', change: 2.79, changeAmount: 6.0, description: 'α+β型热强钛合金，用于航空发动机压气机盘、叶片', frequency: 28, source: '中国金属网', lastUpdate: '2026-07-14', priceHistory: [210,212,211,213,215,214,216,218,217,215,218,220,219,217,220,222,221,219,222,218,221,223,222,220,223,221,224,222,220,220] },
  { id: 'm8', name: 'Inconel718', category: '高温合金', price: 420, unit: '元/kg', change: 5.00, changeAmount: 20.0, description: '镍基沉淀硬化高温合金（美标），出口GE、罗罗等国际客户', frequency: 22, source: '中国金属网', lastUpdate: '2026-07-14', priceHistory: [395,398,400,402,399,403,405,408,406,410,412,409,413,415,412,416,418,415,419,416,420,418,422,419,423,420,424,421,418,420] },
  { id: 'm9', name: '42CrMo', category: '合金钢', price: 8.5, unit: '元/kg', change: -1.15, changeAmount: -0.1, description: '合金结构钢，用于风电主轴、齿轮、高强度螺栓', frequency: 56, source: '中国金属网', lastUpdate: '2026-07-14', priceHistory: [9.0,8.9,8.8,8.7,8.8,8.6,8.5,8.4,8.5,8.6,8.4,8.3,8.4,8.5,8.3,8.4,8.5,8.6,8.4,8.5,8.6,8.5,8.4,8.5,8.6,8.5,8.4,8.5,8.6,8.5] },
];

const impactLevelMap: Record<string, string> = {
  '高影响': 'bg-red-500',
  '中影响': 'bg-amber-500',
  '低影响': 'bg-blue-500',
};

// 静态兜底竞争对手数据（后端 AI 不可用时使用）
const fallbackCompetitors: CompetitorItem[] = [
  { id: 'comp-1', competitorName: '中航重机', channel: '招投标', title: '中航重机中标航空发动机高温合金锻件批量采购项目', summary: '中航重机在最新一轮航空发动机锻件招标中中标，涉及 GH4169、GH4141 等高温合金牌号，总金额超 8000 万元，显示其在航空锻件领域的强势地位。', publishedAt: '2026-07-15', sourceName: '中国航发电子招投标平台', sourceUrl: 'https://www.avic.com', category: '中标信息', impactOnUs: '中航重机中标将直接分流高端航空锻件订单，需关注其产能交付能力和质量稳定性。' },
  { id: 'comp-2', competitorName: '三角防务', channel: '官网', title: '三角防务发布新型钛合金锻件产品，强度提升 15%', summary: '三角防务在官网发布其新一代 TC4 钛合金锻件产品，声称通过新工艺使抗拉强度提升 15%，疲劳寿命提升 20%，已向航空航天领域客户送样。', publishedAt: '2026-07-14', sourceName: '三角防务官网', sourceUrl: 'https://www.sjdf.com', category: '产品发布', impactOnUs: '新产品可能对我方 TC4 钛合金锻件市场形成竞争，需评估我方产品差异化优势。' },
  { id: 'comp-3', competitorName: '宝武特钢', channel: '新闻', title: '宝武特钢投资 5 亿元扩建高温合金产能', summary: '宝武特钢宣布投资 5 亿元在江苏基地扩建高温合金生产线，预计 2027 年投产，年产能将增加 2 万吨，重点布局 GH4169、GH3536 等牌号。', publishedAt: '2026-07-13', sourceName: '中国冶金报', sourceUrl: 'https://www.mcc.com.cn', category: '产能扩张', impactOnUs: '宝武特钢产能扩张将增加高温合金市场供应，可能导致价格下行，需提前锁定客户。' },
  { id: 'comp-4', competitorName: '通裕重工', channel: '公众号', title: '通裕重工公众号发文：风电主轴锻件获西门子歌美飒长期订单', summary: '通裕重工官方公众号发布消息，公司与西门子歌美飒签署 3 年风电主轴锻件长期供货协议，年供货量超 5000 套，金额超 3 亿元。', publishedAt: '2026-07-12', sourceName: '通裕重工公众号', sourceUrl: 'https://www.tyzg.com', category: '合作动态', impactOnUs: '通裕重工在风电领域的长期订单将巩固其市场地位，我方需加大风电客户开拓力度。' },
  { id: 'comp-5', competitorName: '二重（国机重装）', channel: '招投标', title: '二重中标东方电气核电锻件采购项目', summary: '二重（国机重装）在东方电气核电常规岛锻件采购项目中中标，涵盖 17-4PH、SA508 等不锈钢和合金钢锻件，金额 1.2 亿元。', publishedAt: '2026-07-11', sourceName: '中国核电工程招投标网', sourceUrl: 'https://www.cnnp.com', category: '中标信息', impactOnUs: '二重中标核电锻件项目，显示核电锻件市场竞争加剧，需关注核电领域客户需求变化。' },
  { id: 'comp-6', competitorName: '陕西宏远航空', channel: '官网', title: '陕西宏远航空取得 AS9100 最新版质量体系认证', summary: '陕西宏远航空在官网宣布已顺利通过 AS9100D 航空质量管理体系认证复审，标志着其航空锻件质量管控体系达到国际先进水平。', publishedAt: '2026-07-10', sourceName: '陕西宏远航空官网', sourceUrl: 'https://www.sxhf.com', category: '技术突破', impactOnUs: '陕西宏远取得最新认证将增强其在航空客户中的竞争力，我方需确保质量体系同步升级。' },
  { id: 'comp-7', competitorName: '无锡透平叶片', channel: '新闻', title: '无锡透平叶片研制出国产首型整体叶盘锻件', summary: '无锡透平叶片联合中科院金属所，成功研制出国产首型航空发动机整体叶盘锻件，采用 GH4169 高温合金，标志着我国在航空发动机关键锻件领域取得重大突破。', publishedAt: '2026-07-09', sourceName: '科技日报', sourceUrl: 'https://www.stdaily.com', category: '技术突破', impactOnUs: '整体叶盘锻件是航空发动机核心部件，该技术突破可能改变高端锻件市场格局。' },
  { id: 'comp-8', competitorName: '中国一重', channel: '公众号', title: '中国一重公众号：承制国内最大直径铝合金环件顺利交付', summary: '中国一重官方公众号发布，其承制的国内最大直径（Φ3.8m）铝合金环件顺利交付中国航天某院，该环件用于新一代运载火箭贮箱。', publishedAt: '2026-07-08', sourceName: '中国一重公众号', sourceUrl: 'https://www.cfhi.com', category: '产品发布', impactOnUs: '大直径铝合金环件市场需求增长，中国一重先发优势明显，我方需关注市场动向。' },
];

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
  const [selectedCompetitor, setSelectedCompetitor] = useState<CompetitorItem | null>(null);
  const [readNewsIds, setReadNewsIds] = useState<Set<string>>(new Set());
  const [materials, setMaterials] = useState<MaterialItem[]>(fallbackMaterials);
  const [materialsUpdating, setMaterialsUpdating] = useState(false);
  // 后端每日更新的雷达数据（行业动态/招投标/政策/展会/竞争对手）
  const [radarNews, setRadarNews] = useState<NewsItem[]>([]);
  const [radarBidding, setRadarBidding] = useState<BiddingItem[]>([]);
  const [radarPolicies, setRadarPolicies] = useState<PolicyItem[]>([]);
  const [radarExhibitions, setRadarExhibitions] = useState<ExhibitionItem[]>([]);
  const [competitors, setCompetitors] = useState<CompetitorItem[]>([]);
  const [competitorFilter, setCompetitorFilter] = useState({ name: '全部', channel: '全部', type: '全部' });
  const [radarLoading, setRadarLoading] = useState(false);
  const [radarLastUpdate, setRadarLastUpdate] = useState<string | null>(null);

  // 拉取后端每日更新的雷达数据（行业动态/原材料价格/招投标/政策/展会/竞争对手）
  const fetchRadarData = async () => {
    setRadarLoading(true);
    try {
      const result = await dataApi.marketOverview();
      if (result.aiEnabled) {
        if (Array.isArray(result.radarNews) && result.radarNews.length > 0) setRadarNews(result.radarNews);
        if (Array.isArray(result.radarMaterials) && result.radarMaterials.length > 0) {
          const checked = normalizeAndCheckTrends(result.radarMaterials);
          setMaterials(checked);
        }
        if (Array.isArray(result.radarBidding) && result.radarBidding.length > 0) setRadarBidding(result.radarBidding);
        if (Array.isArray(result.radarPolicies) && result.radarPolicies.length > 0) setRadarPolicies(result.radarPolicies);
        if (Array.isArray(result.radarExhibitions) && result.radarExhibitions.length > 0) setRadarExhibitions(result.radarExhibitions);
        if (Array.isArray(result.competitors) && result.competitors.length > 0) setCompetitors(result.competitors);
        if (result.radarLastUpdate) setRadarLastUpdate(result.radarLastUpdate);
      }
    } catch {
      // 后端不可用时使用静态兜底数据
    } finally {
      setRadarLoading(false);
    }
  };

  useEffect(() => {
    fetchRadarData();
  }, []);

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
    fetchRadarData().finally(() => setMaterialsUpdating(false));
  };

  // 合并后端每日数据 + 静态数据（后端优先，去重）
  const allNews = useMemo(() => {
    const merged = [...radarNews, ...newsItems];
    const seen = new Set<string>();
    return merged.filter((n) => {
      if (seen.has(n.id)) return false;
      seen.add(n.id);
      return true;
    });
  }, [radarNews]);

  const allBidding = useMemo(() => {
    const merged = [...radarBidding, ...biddingItems];
    const seen = new Set<string>();
    return merged.filter((b) => {
      if (seen.has(b.id)) return false;
      seen.add(b.id);
      return true;
    });
  }, [radarBidding]);

  const allPolicies = useMemo(() => {
    const merged = [...radarPolicies, ...policyItems];
    const seen = new Set<string>();
    return merged.filter((p) => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
  }, [radarPolicies]);

  // 检测价格走势是否雷同（后端 AI 可能生成重复走势），若雷同则用兜底数据替换
  const normalizeAndCheckTrends = (items: MaterialItem[]): MaterialItem[] => {
    if (items.length < 2) return items;
    // 归一化每条走势到 [0, 1] 区间后计算两两相关性
    const normalized = items.map((m) => {
      const h = m.priceHistory || [m.price];
      const min = Math.min(...h);
      const max = Math.max(...h);
      const range = max - min || 1;
      return h.map((v) => (v - min) / range);
    });
    let similarCount = 0;
    for (let i = 0; i < normalized.length; i++) {
      for (let j = i + 1; j < normalized.length; j++) {
        const len = Math.min(normalized[i].length, normalized[j].length);
        let corr = 0;
        for (let k = 0; k < len; k++) corr += Math.abs(normalized[i][k] - normalized[j][k]);
        corr /= len;
        if (corr < 0.05) similarCount++;
      }
    }
    const totalPairs = (items.length * (items.length - 1)) / 2;
    const similarityRatio = totalPairs > 0 ? similarCount / totalPairs : 0;
    // 如果超过 30% 的走势对高度雷同，使用兜底数据
    if (similarityRatio > 0.3) {
      console.warn('检测到原材料价格走势高度雷同，使用差异化兜底数据');
      // 用 fallbackMaterials 的走势，但保留后端的价格和分类
      return items.map((m) => {
        const fallback = fallbackMaterials.find((f) => f.name === m.name);
        if (fallback && fallback.priceHistory) {
          // 按当前价格重新映射 fallback 的走势
          const fallbackHistory = fallback.priceHistory;
          const fbMin = Math.min(...fallbackHistory);
          const fbMax = Math.max(...fallbackHistory);
          const fbRange = fbMax - fbMin || 1;
          const currentPrice = m.price;
          // 以当前价格为基准，按 fallback 的波动比例生成新走势
          const volatility = (fbMax - fbMin) / fbMin;
          const direction = m.change >= 0 ? 1 : -1;
          const newHistory = fallbackHistory.map((v) => {
            const normalized = (v - fbMin) / fbRange; // 0~1
            const offset = (normalized - 0.5) * 2 * volatility * currentPrice * 0.5;
            return Math.round((currentPrice + direction * offset) * 100) / 100;
          });
          // 确保最后一个值等于当前价格
          newHistory[newHistory.length - 1] = currentPrice;
          return { ...m, priceHistory: newHistory };
        }
        return m;
      });
    }
    return items;
  };
  const allCompetitors = useMemo(() => {
    const source = competitors.length > 0 ? competitors : fallbackCompetitors;
    return source.filter((c) => {
      if (competitorFilter.name !== '全部' && c.competitorName !== competitorFilter.name) return false;
      if (competitorFilter.channel !== '全部' && c.channel !== competitorFilter.channel) return false;
      if (competitorFilter.type !== '全部' && c.category !== competitorFilter.type) return false;
      return true;
    });
  }, [competitors, competitorFilter]);

  // 提取所有唯一的竞争对手名称、渠道、类型
  const competitorNames = useMemo(() => {
    const source = competitors.length > 0 ? competitors : fallbackCompetitors;
    return ['全部', ...new Set(source.map((c) => c.competitorName))];
  }, [competitors]);

  const competitorChannels = ['全部', '公众号', '官网', '招投标', '新闻'];
  const competitorTypes = useMemo(() => {
    const source = competitors.length > 0 ? competitors : fallbackCompetitors;
    return ['全部', ...new Set(source.map((c) => c.category))];
  }, [competitors]);

  const allExhibitions = useMemo(() => {
    const merged = [...radarExhibitions, ...exhibitionItems];
    const seen = new Set<string>();
    return merged.filter((e) => {
      if (seen.has(e.id)) return false;
      seen.add(e.id);
      return true;
    });
  }, [radarExhibitions]);

  const filteredNews = allNews
    .filter((n) => {
      if (industry !== '全部' && n.industry !== industry) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!n.title.toLowerCase().includes(q) && !n.summary.toLowerCase().includes(q) && !n.keywords.some((k) => k.toLowerCase().includes(q))) return false;
      }
      if (customer !== '全部客户' && !n.keywords.includes(customer) && !n.title.includes(customer)) return false;
      return true;
    })
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  const filteredBids = allBidding.filter((b) => {
    if (searchQuery && !b.title.toLowerCase().includes(searchQuery.toLowerCase()) && !b.org.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (industry !== '全部' && b.industry !== industry) return false;
    return true;
  });

  const filteredPolicies = allPolicies.filter((p) => {
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

              <div className="flex items-center justify-between text-xs text-cream-500">
                <span className="flex items-center gap-1">
                  <RefreshCw className={cn('w-3 h-3', radarLoading && 'animate-spin')} />
                  {radarLastUpdate ? `每日更新 · 上次更新：${new Date(radarLastUpdate).toLocaleString('zh-CN')}` : '每日 8:00 自动更新'}
                </span>
                <span>共 {filteredNews.length} 条</span>
              </div>

              <div className="space-y-3">
                {filteredNews.length === 0 && <EmptyState>没有找到匹配的资讯</EmptyState>}
                {filteredNews.map((news) => {
                  const impactLabel = news.impactLevel === '高' ? '高影响' : news.impactLevel === '低' ? '低影响' : '中影响';
                  const isNew = isNewsNew(news);
                  return (
                    <div key={news.id} onClick={() => handleNewsClick(news)}
                      className="bg-white rounded-2xl p-5 shadow-soft hover:shadow-card transition-all cursor-pointer relative">
                      {isNew && (
                        <span className="absolute top-4 right-4 px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse z-10">新</span>
                      )}
                      <div className="flex items-start gap-2 mb-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-cream-100 text-cream-700">{news.category}</span>
                        {news.industry && (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-700">{news.industry}</span>
                        )}
                        <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium text-white', impactLevelMap[impactLabel])}>{impactLabel}</span>
                        <span className="ml-auto text-xs text-cream-500">{news.publishedAt}</span>
                      </div>
                      <h3 className="text-base font-semibold text-cream-900 mb-2 pr-12">{news.title}</h3>
                      <p className="text-sm text-cream-700 leading-relaxed mb-3 line-clamp-2">{news.summary}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {news.source && <span className="text-xs text-cream-500">{news.source}</span>}
                          {news.sourceUrl && (
                            <a href={news.sourceUrl} target="_blank" rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-0.5 text-xs text-blue-600 hover:text-blue-800 hover:underline">
                              <ExternalLink className="w-3 h-3" />原文
                            </a>
                          )}
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
                  <span>每日更新</span>
                  <span>·</span>
                  <span>上次更新：{radarLastUpdate ? new Date(radarLastUpdate).toLocaleDateString('zh-CN') : '2026-07-14'}</span>
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

          {category === 'competitor' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between text-xs text-cream-500">
                <span className="flex items-center gap-1">
                  <Swords className="w-3 h-3" />
                  派克新材竞争对手动态（公众号/官网/招投标/新闻扒取）
                  {radarLastUpdate && <span className="ml-2">· 上次更新：{new Date(radarLastUpdate).toLocaleString('zh-CN')}</span>}
                </span>
                <button onClick={() => fetchRadarData()} disabled={radarLoading}
                  className="flex items-center gap-1 px-2 py-1 bg-cream-200 text-cream-700 rounded-lg hover:bg-cream-300 disabled:opacity-50">
                  <RefreshCw className={cn('w-3 h-3', radarLoading && 'animate-spin')} />
                  <span>刷新</span>
                </button>
              </div>
              {/* 分类筛选器 */}
              <div className="bg-cream-50 rounded-2xl p-3 space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-cream-500 font-medium w-16 flex-shrink-0">竞争对手：</span>
                  <div className="flex gap-1 flex-wrap">
                    {competitorNames.map((name) => (
                      <button key={name} onClick={() => setCompetitorFilter((f) => ({ ...f, name }))}
                        className={cn(
                          'px-2.5 py-1 rounded-full text-xs font-medium transition-all',
                          competitorFilter.name === name
                            ? 'bg-red-500 text-white shadow-sm'
                            : 'bg-white text-cream-600 hover:bg-red-50 hover:text-red-600'
                        )}>
                        {name}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-cream-500 font-medium w-16 flex-shrink-0">信息渠道：</span>
                  <div className="flex gap-1 flex-wrap">
                    {competitorChannels.map((ch) => (
                      <button key={ch} onClick={() => setCompetitorFilter((f) => ({ ...f, channel: ch }))}
                        className={cn(
                          'px-2.5 py-1 rounded-full text-xs font-medium transition-all',
                          competitorFilter.channel === ch
                            ? 'bg-purple-500 text-white shadow-sm'
                            : 'bg-white text-cream-600 hover:bg-purple-50 hover:text-purple-600'
                        )}>
                        {ch}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-cream-500 font-medium w-16 flex-shrink-0">动态类型：</span>
                  <div className="flex gap-1 flex-wrap">
                    {competitorTypes.map((t) => (
                      <button key={t} onClick={() => setCompetitorFilter((f) => ({ ...f, type: t }))}
                        className={cn(
                          'px-2.5 py-1 rounded-full text-xs font-medium transition-all',
                          competitorFilter.type === t
                            ? 'bg-amber-500 text-white shadow-sm'
                            : 'bg-white text-cream-600 hover:bg-amber-50 hover:text-amber-600'
                        )}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                {(competitorFilter.name !== '全部' || competitorFilter.channel !== '全部' || competitorFilter.type !== '全部') && (
                  <button
                    onClick={() => setCompetitorFilter({ name: '全部', channel: '全部', type: '全部' })}
                    className="text-xs text-cream-500 hover:text-cream-700 underline">
                    清除筛选条件
                  </button>
                )}
              </div>
              {/* 筛选结果统计 */}
              <div className="text-xs text-cream-500">
                共 {allCompetitors.length} 条动态
                {competitorFilter.name !== '全部' && <span> · {competitorFilter.name}</span>}
                {competitorFilter.channel !== '全部' && <span> · {competitorFilter.channel}</span>}
                {competitorFilter.type !== '全部' && <span> · {competitorFilter.type}</span>}
              </div>
              {allCompetitors.length === 0 && (
                <EmptyState>暂无符合筛选条件的竞争对手动态</EmptyState>
              )}
              {allCompetitors.map((comp) => (
                <div key={comp.id} onClick={() => setSelectedCompetitor(comp)}
                  className="bg-white rounded-2xl p-5 shadow-soft hover:shadow-card transition-all cursor-pointer">
                  <div className="flex items-start gap-2 mb-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">{comp.competitorName}</span>
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">{comp.channel}</span>
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-cream-100 text-cream-700">{comp.category}</span>
                    <span className="ml-auto text-xs text-cream-500">{comp.publishedAt}</span>
                  </div>
                  <h3 className="text-base font-semibold text-cream-900 mb-2">{comp.title}</h3>
                  <p className="text-sm text-cream-700 leading-relaxed mb-3 line-clamp-2">{comp.summary}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-cream-500">{comp.sourceName}</span>
                    {comp.sourceUrl && (
                      <a href={comp.sourceUrl} target="_blank" rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-0.5 text-xs text-blue-600 hover:text-blue-800 hover:underline">
                        <ExternalLink className="w-3 h-3" />核实来源
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {category === 'ai-market' && (
            <div className="animate-fade-in">
              <MarketDataPanel />
            </div>
          )}

          {category === 'exhibition' && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {allExhibitions.map((ex) => (
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
                  {(ex as ExhibitionItem & { sourceUrl?: string }).sourceUrl && (
                    <a href={(ex as ExhibitionItem & { sourceUrl?: string }).sourceUrl} target="_blank" rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-0.5 text-xs text-blue-600 hover:text-blue-800 hover:underline mb-2">
                      <ExternalLink className="w-3 h-3" />展会官网/核实来源
                    </a>
                  )}
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
      {selectedCompetitor && <CompetitorDetailModal competitor={selectedCompetitor} onClose={() => setSelectedCompetitor(null)} />}
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
            {news.industry && <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-700">{news.industry}</span>}
          </div>
          <p className="text-sm text-cream-700 leading-relaxed mb-5">{news.summary}</p>
          {news.sourceUrl && (
            <div className="mb-5 bg-blue-50 border border-blue-200 rounded-xl p-3">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-blue-600 font-medium">📄 信息来源:</span>
                <span className="text-blue-700">{news.source}</span>
                <a href={news.sourceUrl} target="_blank" rel="noopener noreferrer"
                  className="ml-auto text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1">
                  <span>查看原文核实</span>
                  <ArrowRight className="w-3 h-3" />
                </a>
              </div>
              <p className="text-xs text-blue-500 mt-1 break-all">{news.sourceUrl}</p>
            </div>
          )}
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
  // 用 priceHistory 动态生成 SVG path，避免所有材料共用同一条走势
  const history = material.priceHistory && material.priceHistory.length > 1
    ? material.priceHistory
    : [material.price * 0.97, material.price];
  const min = Math.min(...history);
  const max = Math.max(...history);
  const range = max - min || 1;
  const W = 500;
  const H = 100;
  const padding = 8;
  const stepX = (W - padding * 2) / (history.length - 1);
  // 计算每个点的坐标，y 越小越靠上（价格越高）
  const points = history.map((p, i) => ({
    x: padding + i * stepX,
    y: padding + (H - padding * 2) * (1 - (p - min) / range),
    price: p,
    idx: i,
  }));
  // 平滑曲线（Catmull-Rom 转 Bezier 简化版）
  const buildPath = () => {
    if (points.length === 0) return '';
    let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const cur = points[i];
      const cpx = (prev.x + cur.x) / 2;
      d += ` Q ${cpx.toFixed(2)} ${prev.y.toFixed(2)} ${cur.x.toFixed(2)} ${cur.y.toFixed(2)}`;
    }
    return d;
  };
  const pathData = buildPath();

  // 点击/悬停显示具体价格 + 时间
  const [hover, setHover] = useState<{ x: number; y: number; price: number; date: string } | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const getDateLabel = (idx: number) => {
    const d = new Date();
    d.setDate(d.getDate() - (history.length - 1 - idx));
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  const handleMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const xRatio = (e.clientX - rect.left) / rect.width;
    const xInSvg = xRatio * W;
    // 找到最近的点
    let nearest = points[0];
    let minDist = Math.abs(points[0].x - xInSvg);
    for (const p of points) {
      const d = Math.abs(p.x - xInSvg);
      if (d < minDist) { minDist = d; nearest = p; }
    }
    setHover({ x: nearest.x, y: nearest.y, price: nearest.price, date: getDateLabel(nearest.idx) });
  };

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
            <p className="text-xs text-coffee-400 mt-2">使用频率: {material.frequency}次 · 数据来源: {material.source} · 更新: {material.lastUpdate}</p>
          </div>
          <div className="bg-gradient-to-br from-red-50 to-amber-50 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-coffee-700">近{history.length}天价格走势</h3>
              <span className="text-xs text-coffee-400">点击/悬停曲线查看具体价格</span>
            </div>
            <div className="relative h-40">
              <svg
                ref={svgRef}
                viewBox={`0 0 ${W} ${H}`}
                className="w-full h-full cursor-crosshair"
                preserveAspectRatio="none"
                onMouseMove={handleMove}
                onMouseLeave={() => setHover(null)}
                onClick={handleMove}
              >
                <defs>
                  <linearGradient id="lineGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#E15D5D" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#E15D5D" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d={`${pathData} L ${points[points.length - 1].x.toFixed(2)} ${H} L ${points[0].x.toFixed(2)} ${H} Z`} fill="url(#lineGradient)" />
                <path d={pathData} stroke="#E15D5D" strokeWidth="2" fill="none" />
                {hover && (
                  <>
                    <line x1={hover.x} y1={padding} x2={hover.x} y2={H - padding} stroke="#E15D5D" strokeWidth="1" strokeDasharray="3 3" opacity="0.5" />
                    <circle cx={hover.x} cy={hover.y} r="4" fill="#E15D5D" stroke="#fff" strokeWidth="2" />
                  </>
                )}
              </svg>
              {hover && (
                <div
                  className="absolute pointer-events-none bg-coffee-900 text-white text-xs rounded-lg px-2 py-1 -translate-x-1/2 -translate-y-full"
                  style={{
                    left: `${(hover.x / W) * 100}%`,
                    top: `${(hover.y / H) * 100}%`,
                  }}
                >
                  <div className="font-semibold">{hover.price} {material.unit}</div>
                  <div className="text-coffee-200">{hover.date}</div>
                </div>
              )}
              <div className="absolute inset-y-0 right-0 flex flex-col justify-between text-[10px] text-coffee-400 py-1">
                <span>{max.toFixed(1)}元/kg</span>
                <span>{((max + min) / 2).toFixed(1)}元/kg</span>
                <span>{min.toFixed(1)}元/kg</span>
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

          {policy.sourceUrl && (
            <div className="mb-5 bg-blue-50 border border-blue-200 rounded-xl p-3">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-blue-600 font-medium">📄 政策原文:</span>
                <a href={policy.sourceUrl} target="_blank" rel="noopener noreferrer"
                  className="ml-auto text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1">
                  <span>查看原文核实</span>
                  <ArrowRight className="w-3 h-3" />
                </a>
              </div>
              <p className="text-xs text-blue-500 mt-1 break-all">{policy.sourceUrl}</p>
            </div>
          )}

          {policy.salesImpact && (
            <div className="mb-5 bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <h3 className="text-sm font-semibold text-amber-900 mb-2">💼 对销售的影响</h3>
              <p className="text-sm text-amber-800 leading-relaxed">{policy.salesImpact}</p>
            </div>
          )}

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

function CompetitorDetailModal({ competitor, onClose }: { competitor: CompetitorItem; onClose: () => void }) {
  const channelColor: Record<string, string> = {
    '公众号': 'bg-green-100 text-green-700',
    '官网': 'bg-blue-100 text-blue-700',
    '招投标': 'bg-amber-100 text-amber-700',
    '新闻': 'bg-purple-100 text-purple-700',
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-coffee-900/40 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-card" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-start gap-2 mb-3 flex-wrap">
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">{competitor.competitorName}</span>
            <span className={cn('px-2 py-0.5 rounded text-xs font-medium', channelColor[competitor.channel] || 'bg-gray-100 text-gray-700')}>{competitor.channel}</span>
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-cream-100 text-cream-700">{competitor.category}</span>
            <span className="ml-auto text-xs text-cream-500">{competitor.publishedAt}</span>
            <button onClick={onClose} className="ml-2 p-1 text-coffee-400 hover:text-coffee-700 rounded"><X className="w-4 h-4" /></button>
          </div>
          <h2 className="text-xl font-bold text-coffee-900 mb-3 font-display">{competitor.title}</h2>
          <p className="text-sm text-coffee-700 leading-relaxed mb-5">{competitor.summary}</p>

          {competitor.sourceUrl && (
            <div className="mb-5 bg-blue-50 border border-blue-200 rounded-xl p-3">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-blue-600 font-medium">📄 信息来源:</span>
                <span className="text-blue-700">{competitor.sourceName}</span>
                <a href={competitor.sourceUrl} target="_blank" rel="noopener noreferrer"
                  className="ml-auto text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1">
                  <span>查看原文核实</span>
                  <ArrowRight className="w-3 h-3" />
                </a>
              </div>
              <p className="text-xs text-blue-500 mt-1 break-all">{competitor.sourceUrl}</p>
            </div>
          )}

          {competitor.impactOnUs && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5">
              <h3 className="text-sm font-semibold text-amber-900 mb-2">⚠️ 对派克新材的影响</h3>
              <p className="text-sm text-amber-800 leading-relaxed">{competitor.impactOnUs}</p>
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
