import { create } from 'zustand';
import type { NewsItem, BiddingItem, PolicyItem, ExhibitionItem, CompetitorItem } from '@/types';
import { newsItems, biddingItems, policyItems, exhibitionItems, competitorItems } from '@/data/news';
import { dataApi } from '@/services/api';

// 原材料价格本地类型（与 MarketRadar 中一致）
export interface MaterialItem {
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

const initialMaterials: MaterialItem[] = [
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

const STORAGE_KEY = 'sw_market_radar_data_v8';

// 获取今天日期字符串
const todayStr = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// 生成随机波动（-5% ~ +5%）
const randomFluctuation = (base: number): number => {
  const delta = (Math.random() - 0.5) * 0.1; // -0.05 ~ +0.05
  return Math.round(base * (1 + delta) * 100) / 100;
};

interface MarketRadarState {
  news: NewsItem[];
  materials: MaterialItem[];
  bids: BiddingItem[];
  policies: PolicyItem[];
  exhibitions: ExhibitionItem[];
  competitors: CompetitorItem[];
  lastUpdateDate: string;
  updating: boolean;

  // 服务端锚点日期（北京时间权威），优先使用；null表示尚未取到
  _serverAnchor?: { todayStr: string; daySeed: number } | null;

  // 异步拉取服务端权威日期锚点（部署后优先走服务端北京时间，不受手机本地时钟/时区影响）
  // 拉取完成后自动用锚点日期校验是否需跨天更新
  loadServerAnchorAndCheck: () => Promise<void>;

  // 检查是否需要每日更新（页面加载时调用，同步，优先用已缓存的服务端锚点日期）
  checkDailyUpdate: () => void;
  // 手动刷新
  refresh: () => Promise<void>;
}

// 从 localStorage 加载
const loadFromStorage = (): Partial<MarketRadarState> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
};

// 持久化到 localStorage
const saveToStorage = (state: MarketRadarState) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      news: state.news,
      materials: state.materials,
      bids: state.bids,
      policies: state.policies,
      exhibitions: state.exhibitions,
      competitors: state.competitors,
      lastUpdateDate: state.lastUpdateDate,
    }));
  } catch {
    // 静默失败
  }
};

// 生成相对日期字符串（N天前）
const daysAgoStr = (days: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// 模拟每日数据更新
// 若传入 serverAnchor，则以服务端"北京时间 todayStr + daySeed"为准（防手机时钟/时区错）
const generateUpdatedData = (
  state: MarketRadarState,
  serverAnchor?: { todayStr: string; daySeed: number },
) => {
  const today = serverAnchor?.todayStr ?? todayStr();
  const baseDaySeed = serverAnchor?.daySeed;

  // 相对日期用今天锚点推：今天字符串 - N天
  const dateAddDays = (base: string, days: number): string => {
    const [y, m, d] = base.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + days);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  };
  const yesterday = dateAddDays(today, -1);
  const twoDaysAgo = dateAddDays(today, -2);

  // ===== 行业动态每日更新 =====
  // 1. 按行业分组（航空航天、核电→能源电力，以及其他5个行业）
  const groupByIndustry = (items: NewsItem[]): Record<string, NewsItem[]> => {
    const groups: Record<string, NewsItem[]> = {};
    items.forEach((n) => {
      const key = n.industry === '核电' ? '能源电力' : n.industry;
      if (!groups[key]) groups[key] = [];
      groups[key].push(n);
    });
    return groups;
  };

  const newsSource = state.news.length > 0 ? state.news : newsItems;
  const industryGroups = groupByIndustry(newsSource);
  const industries = Object.keys(industryGroups);

  // 2. 根据今天日期确定每个行业的"起始偏移量"，保证每天轮换不同条目
  const todayDayNum = (() => {
    if (typeof baseDaySeed === 'number') return baseDaySeed;
    // 兜底本地
    const d = new Date();
    return d.getDate() + d.getMonth() * 31;
  })();
  const perIndustryToday = 1;       // 每个行业每天"新"（今日发布）的条数
  const perIndustryYesterday = 1;   // 每个行业昨日发布的条数

  const updatedNewsToday: NewsItem[] = [];
  const updatedNewsYesterday: NewsItem[] = [];
  const updatedNewsTwoDays: NewsItem[] = [];
  const updatedNewsRest: NewsItem[] = [];

  industries.forEach((ind) => {
    const items = industryGroups[ind];
    if (!items || items.length === 0) return;
    const startIdx = todayDayNum % items.length;
    for (let i = 0; i < items.length; i++) {
      const original = items[(startIdx + i) % items.length];
      let dated: NewsItem;
      if (i < perIndustryToday) {
        dated = { ...original, publishedAt: today };
        updatedNewsToday.push(dated);
      } else if (i < perIndustryToday + perIndustryYesterday) {
        dated = { ...original, publishedAt: yesterday };
        updatedNewsYesterday.push(dated);
      } else if (i < perIndustryToday + perIndustryYesterday + 1) {
        dated = { ...original, publishedAt: twoDaysAgo };
        updatedNewsTwoDays.push(dated);
      } else {
        // 剩余的按天数递增分配日期
        const dayOffset = 2 + (i - perIndustryToday - perIndustryYesterday - 1) + 1;
        dated = { ...original, publishedAt: daysAgoStr(dayOffset) };
        updatedNewsRest.push(dated);
      }
    }
  });

  // 3. 内部按行业交叉洗牌，避免同一行业堆在一起
  const shuffleInterleave = (lists: NewsItem[][]): NewsItem[] => {
    const result: NewsItem[] = [];
    const maxLen = Math.max(...lists.map((l) => l.length));
    for (let i = 0; i < maxLen; i++) {
      for (const list of lists) {
        if (list[i]) result.push(list[i]);
      }
    }
    return result;
  };

  const groupByIndustryInner = (items: NewsItem[]): NewsItem[][] => {
    const groups: Record<string, NewsItem[]> = {};
    items.forEach((n) => {
      const key = n.industry === '核电' ? '能源电力' : n.industry;
      if (!groups[key]) groups[key] = [];
      groups[key].push(n);
    });
    return Object.values(groups);
  };

  const interleavedToday = shuffleInterleave(groupByIndustryInner(updatedNewsToday));
  const interleavedYesterday = shuffleInterleave(groupByIndustryInner(updatedNewsYesterday));
  const interleavedTwoDays = shuffleInterleave(groupByIndustryInner(updatedNewsTwoDays));
  const interleavedRest = shuffleInterleave(groupByIndustryInner(updatedNewsRest));

  const updatedNews = [...interleavedToday, ...interleavedYesterday, ...interleavedTwoDays, ...interleavedRest];

  // 原材料价格：模拟价格波动
  const updatedMaterials = state.materials.map((m) => {
    const newPrice = randomFluctuation(m.price);
    const changeAmount = Math.round((newPrice - m.price) * 100) / 100;
    const change = Math.round((changeAmount / m.price) * 10000) / 100;
    return {
      ...m,
      price: newPrice,
      change,
      changeAmount,
      lastUpdate: today,
    };
  });

  // 招投标：更新截止日期（过期的标更新为新的状态）
  const updatedBids = state.bids.map((b) => {
    const deadline = new Date(b.deadline);
    const now = new Date();
    if (deadline < now && b.status === '招标中') {
      // 过期的招标标记为"已截止"
      return { ...b, status: '已截止' as const };
    }
    return b;
  });

  // 政策法规：保持不变（政策发布日期不变）
  // 行业展会：保持不变（展会日期是固定的）

  // 竞争对手动态：按竞争对手分组，每天轮换不同条目排到最新，日期按天均匀分配
  const competitorSource = state.competitors.length > 0 ? state.competitors : competitorItems;
  const groupByCompetitor = (items: CompetitorItem[]): Record<string, CompetitorItem[]> => {
    const groups: Record<string, CompetitorItem[]> = {};
    items.forEach((c) => {
      const key = c.competitor;
      if (!groups[key]) groups[key] = [];
      groups[key].push(c);
    });
    return groups;
  };
  const compGroups = groupByCompetitor(competitorSource);
  const compKeys = Object.keys(compGroups);
  const compTodayList: CompetitorItem[] = [];
  const compYesterdayList: CompetitorItem[] = [];
  const compRestList: CompetitorItem[] = [];
  compKeys.forEach((k) => {
    const items = compGroups[k];
    if (!items || items.length === 0) return;
    const startIdx = todayDayNum % items.length;
    for (let i = 0; i < items.length; i++) {
      const original = items[(startIdx + i) % items.length];
      if (i < 1) {
        compTodayList.push({ ...original, publishedAt: today });
      } else if (i < 2) {
        compYesterdayList.push({ ...original, publishedAt: yesterday });
      } else {
        compRestList.push({ ...original, publishedAt: daysAgoStr(i + 1) });
      }
    }
  });
  // 按竞争对手交错洗牌 + 按日期倒序
  const compInterleave = (lists: CompetitorItem[][]): CompetitorItem[] => {
    const result: CompetitorItem[] = [];
    const maxLen = Math.max(...lists.map((l) => l.length));
    for (let i = 0; i < maxLen; i++) {
      for (const list of lists) if (list[i]) result.push(list[i]);
    }
    return result;
  };
  const groupByCompInner = (items: CompetitorItem[]): CompetitorItem[][] =>
    Object.values(groupByCompetitor(items));
  const updatedCompetitors: CompetitorItem[] = [
    ...compInterleave(groupByCompInner(compTodayList)),
    ...compInterleave(groupByCompInner(compYesterdayList)),
    ...compInterleave(groupByCompInner(compRestList)),
  ];

  return {
    news: updatedNews,
    materials: updatedMaterials,
    bids: updatedBids,
    policies: state.policies,
    exhibitions: state.exhibitions,
    competitors: updatedCompetitors ?? state.competitors,
    lastUpdateDate: today,
  };
};

export const useMarketRadarStore = create<MarketRadarState>((set, get) => {
  const persisted = loadFromStorage();
  const today = todayStr();

  // 初始基准状态（优先使用localStorage缓存，否则用原始数据）
  const rawInitial: MarketRadarState = {
    news: (persisted.news && persisted.news.length > 0) ? persisted.news : newsItems,
    materials: (persisted.materials && persisted.materials.length > 0) ? persisted.materials : initialMaterials,
    bids: (persisted.bids && persisted.bids.length > 0) ? persisted.bids : biddingItems,
    policies: (persisted.policies && persisted.policies.length > 0) ? persisted.policies : policyItems,
    exhibitions: (persisted.exhibitions && persisted.exhibitions.length > 0) ? persisted.exhibitions : exhibitionItems,
    competitors: (persisted.competitors && persisted.competitors.length > 0) ? persisted.competitors : competitorItems,
    lastUpdateDate: persisted.lastUpdateDate || '1970-01-01',
    updating: false,
    _serverAnchor: null,
    loadServerAnchorAndCheck: async () => Promise.resolve(),
    checkDailyUpdate: () => {},
    refresh: async () => Promise.resolve(),
  };

  // 如果缓存不是今天的，立即同步应用每日更新（不等1.5秒的模拟延迟）
  const needInitUpdate = rawInitial.lastUpdateDate !== today;
  const initUpdated = needInitUpdate ? generateUpdatedData(rawInitial) : null;

  const initialState = needInitUpdate
    ? {
        news: initUpdated!.news,
        materials: initUpdated!.materials,
        bids: initUpdated!.bids,
        policies: initUpdated!.policies,
        exhibitions: initUpdated!.exhibitions,
        competitors: initUpdated!.competitors,
        lastUpdateDate: today,
      }
    : {
        news: rawInitial.news,
        materials: rawInitial.materials,
        bids: rawInitial.bids,
        policies: rawInitial.policies,
        exhibitions: rawInitial.exhibitions,
        competitors: rawInitial.competitors,
        lastUpdateDate: rawInitial.lastUpdateDate,
      };

  // 初次加载立即持久化一次（保证刷新页面后仍显示当日已更新的数据）
  if (needInitUpdate) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        ...initialState,
      }));
    } catch {
      // 静默
    }
  }

  return {
    ...initialState,
    updating: false,
    _serverAnchor: null,

    // 异步从服务端取"北京时间今天"作为权威日期锚点，并在取到后立即校验跨天更新
    // 注意：fetch 会先返回一个 Promise，但是在移动端后台页面中，fetch 通常不受节流
    // （只有 setTimeout/setInterval 被节流），所以这里用 fetch 比 setTimeout 更靠谱
    loadServerAnchorAndCheck: async () => {
      let anchor: { todayStr: string; daySeed: number } | null = null;
      try {
        const r = await dataApi.marketRadarAnchor();
        if (r && r.todayStr) anchor = { todayStr: r.todayStr, daySeed: r.daySeed ?? (new Date().getDate() + new Date().getMonth() * 31) };
      } catch {
        // 离线/后端故障时静默降级到本地日期，不抛错
      }
      set({ _serverAnchor: anchor } as Partial<MarketRadarState>);

      const effectiveNow = anchor?.todayStr ?? todayStr();
      const state = get();
      if (state.lastUpdateDate !== effectiveNow) {
        const updated = generateUpdatedData(state, anchor ?? undefined);
        set({ ...updated, updating: false });
        saveToStorage({ ...get(), ...updated, updating: false } as MarketRadarState);
      }
    },

    checkDailyUpdate: () => {
      const state = get();
      const anchor = state._serverAnchor;
      const effectiveNow = anchor?.todayStr ?? todayStr();
      if (state.lastUpdateDate !== effectiveNow) {
        // 重要：同步立即执行更新（不能用setTimeout 1.5s，移动端后台/休眠页会被节流挂起）
        const updated = generateUpdatedData(state, anchor ?? undefined);
        set({ ...updated, updating: false });
        saveToStorage({ ...get(), ...updated, updating: false } as MarketRadarState);
      }
    },

    refresh: async () => {
      set({ updating: true });
      // 手动刷新保留1.5s动画，但后半部分更新也同步落地（避免移动端setTimeout不可靠）
      const synced: Promise<void> = new Promise((resolve) => {
        setTimeout(() => {
          const state = get();
          const anchor = state._serverAnchor;
          const updated = generateUpdatedData(state, anchor ?? undefined);
          set({ ...updated, updating: false });
          saveToStorage({ ...get(), ...updated, updating: false } as MarketRadarState);
          resolve();
        }, 1500);
      });
      return synced;
    },
  };
});
