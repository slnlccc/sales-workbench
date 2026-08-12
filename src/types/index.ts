export type RecordType =
  | 'schedule'
  | 'memo'
  | 'order'
  | 'visit'
  | 'quote'
  | 'task'
  | 'call'
  | 'meeting';

export type RecordSource = 'voice' | 'memo' | 'manual';

export type TabKey = 'voice' | 'calendar' | 'memo' | 'records' | 'stats';

export type Stage = 'lead' | 'contact' | 'quote' | 'won' | 'aftersale';
export type MeetingType = 'minutes' | 'methodology' | 'todo' | 'insight';

export interface WorkbenchRecord {
  id: string;
  type: RecordType;
  content: string;
  createdAt: string;
  customer?: string;
  reminderAt?: string;
  done?: boolean;
  closed?: boolean;
  expired?: boolean;
  notified?: boolean;
  source?: RecordSource;
}

export interface MemoKnowledge {
  id: string;
  title: string;
  summary: string;
  source: string;
  createdAt: string;
}

export interface UserStats {
  joinDate: string;
  lastUpdated: string;
}

export interface NavItem {
  id: string;
  icon: string;
  label: string;
  subLabel: string;
  path: string;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

export interface NewsItem {
  id: string;
  title: string;
  source: string;
  summary: string;
  keywords: string[];
  publishedAt: string;
  category: string;
  industry: string;          // 新增：航空航天/核电/火电/新能源等
  impactLevel: '高' | '中' | '低';  // 新增：与派克新材产品关联度
  insights?: string;          // 新增：见解点评
  businessValue?: string;     // 新增：商业价值思考
  relatedCustomers?: string[];// 新增：关联客户
  sourceUrl?: string;         // 新增：原文链接（可点击核实）
}

export interface MaterialItem {
  id: string;
  name: string;
  category: string;
  price: number;
  unit: string;
  change: number;        // 涨跌幅 %
  trend: number[];       // 30天价格走势
  composition: string;   // 新增：材料成分
  application: string;   // 新增：主要用途
  relatedIndustry: string; // 新增：关联行业
}

export interface BiddingItem {
  id: string;
  title: string;
  org: string;
  amount: number;
  deadline: string;
  type: 'tender' | 'win';
  region?: string;
  industry: string;
  status: string;
  description: string;
  requirements: string[];
  competitors: { name: string; advantage: string; disadvantage: string }[];
  sourceUrl?: string;      // 新增：来源网站链接
  sourceName?: string;     // 新增：来源网站名称
}

export interface PolicyItem {
  id: string;
  title: string;
  policyType: string;
  department: string;
  publishedAt: string;
  keywords: string[];
  content: string;
  summary: string;
  aiAnalysis?: string;   // 新增：AI分析政策对销售影响
  salesImpact?: string;  // 新增：对销售的具体影响
  sourceUrl?: string;    // 新增：政策原文链接（可点击核实）
}

// 竞争对手动态（派克新材竞品扒取公众号/官网/招投标）
export interface CompetitorItem {
  id: string;
  competitorName: string;        // 竞争对手名称
  stockCode?: string;            // 股票代码 如 600765.SH
  channel: string;               // 信息来源渠道：公众号/官网/招投标/财报/行业研报
  title: string;                 // 动态标题
  summary: string;               // 内容摘要
  publishedAt: string;           // 发布日期
  sourceUrl: string;             // 信息来源网址（可点击核实）
  sourceName: string;            // 来源名称
  category: string;              // 动态类别：产能扩张/技术突破/订单中标/资本运作/客户拓展/人事变动/其他
  impactOnUs?: string;           // 对我方影响分析
  isHighImpact?: boolean;        // 是否高影响
  isNew?: boolean;               // 是否最新（新标签）
  keywords?: string[];           // 关键词标签：如 ['中标','中国航发','框架采购']
}

export interface ExhibitionItem {
  id: string;
  title: string;
  location: string;
  description: string;
  importance: '重点' | '一般';
  month: string;
  frequency: string;
  keyCustomers: string[];
  expectedRevenue: {
    estimateCount: string;
    estimateValue: string;
  };
  expectedLeads?: number; // 新增：预计线索数
  relatedBids: {
    title: string;
    customer: string;
    deadline: string;
    amount: number;
    status: string;
  }[];
  competitors: {
    name: string;
    advantage: string;
    disadvantage: string;
    products: string[];
  }[];
  opportunityAssessment: {
    title: string;
    probability: string;
    value: string;
    suggestion: string;
  }[];
  strategy: {
    preShow: string[];
    duringShow: string[];
    afterShow: string[];
  };
}

export interface MeetingItem {
  id: string;
  type: MeetingType;
  customer: string;
  content: string;
  date: string;
  done?: boolean;
}

export interface CustomerItem {
  id: string;
  name: string;
  industry: string;
  scale: string;
  contact: string;
  region?: string;
  cooperationSince?: string;
}

export interface ProjectTask {
  id: string;
  name: string;
  progress: number;
  status: 'pending' | 'in-progress' | 'done';
  deadline: string;
}

export interface ProjectTimelineNode {
  id: string;
  label: string;
  date: string;
  done: boolean;
}

export interface ProjectItem {
  id: string;
  name: string;
  customerId: string;
  stage: Stage;
  amount: number;
  progress: number;
  nextAction: string;
  nextActionAt: string;
  industry: string;
  tasks?: ProjectTask[];
  timeline?: ProjectTimelineNode[];
  description?: string;
}
