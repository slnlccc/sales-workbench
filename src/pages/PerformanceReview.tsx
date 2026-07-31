import { useState } from 'react';
import {
  TrendingUp, TrendingDown, BarChart3, Users, Package,
  ChevronDown, AlertTriangle, Zap, FileText, X, Download, Check,
} from 'lucide-react';
import Layout from '@/components/Layout';
import { cn } from '@/lib/utils';

const monthlyData = [
  { month: '7月', target: 320, actual: 425 },
  { month: '8月', target: 350, actual: 310 },
  { month: '9月', target: 380, actual: 360 },
  { month: '10月', target: 390, actual: 355 },
  { month: '11月', target: 420, actual: 425 },
];

const keyProjects = [
  {
    id: 'p1',
    name: '中国航发XX项目',
    customer: '中国航发',
    stage: '推进中',
    amount: 120,
    progress: 75,
  },
  {
    id: 'p2',
    name: '航天科工XX所',
    customer: '航天科工',
    stage: '试样阶段',
    amount: 80,
    progress: 45,
  },
  {
    id: 'p3',
    name: '中航工业XX公司',
    customer: '中航工业',
    stage: '报价阶段',
    amount: 60,
    progress: 30,
  },
];

const lostDeals = [
  {
    id: 'l1',
    name: 'XX科技GH4169项目',
    customer: 'XX科技',
    amount: 45,
    reason: '价格竞争',
    competitor: 'XX锻造',
  },
  {
    id: 'l2',
    name: 'XX航空零部件项目',
    customer: 'XX航空',
    amount: 35,
    reason: '交付周期',
    competitor: 'XX重工',
  },
];

export default function PerformanceReview() {
  const [customerType, setCustomerType] = useState('客户结构分析');
  const [productType, setProductType] = useState('产品结构分析');
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);
  const [productDropdownOpen, setProductDropdownOpen] = useState(false);

  // 一键生成复盘弹窗状态
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [reviewContent, setReviewContent] = useState<string[]>([]);
  const [reviewSaved, setReviewSaved] = useState(false);

  // 计算统计数据
  const totalTarget = monthlyData.reduce((sum, d) => sum + d.target, 0);
  const totalActual = monthlyData.reduce((sum, d) => sum + d.actual, 0);
  const completionRate = Math.round((totalActual / totalTarget) * 100);
  const projectTotal = keyProjects.reduce((sum, p) => sum + p.amount, 0);
  const lostTotal = lostDeals.reduce((sum, d) => sum + d.amount, 0);

  // 一键生成复盘报告
  const handleGenerateReview = () => {
    setGenerating(true);
    setShowReviewModal(true);
    setReviewContent([]);
    setReviewSaved(false);

    const sections = [
      '一、业绩概况',
      `本周期累计目标销售额 ${totalTarget} 万元，实际完成 ${totalActual} 万元，完成率 ${completionRate}%。`,
      '同比增长 21.4%，环比上月略有波动，整体保持良好增长态势。',
      '',
      '二、客户结构分析',
      '航空航天领域占比 45%，能源电力 25%，新能源 18%，船舶 12%。',
      '航空航天核心客户群稳定，新能源客户增长明显，建议持续深耕。',
      '',
      '三、产品结构分析',
      '高温合金锻件贡献最大，占比 40%；钛合金锻件 28%，铝合金 15%。',
      '高温合金与钛合金是主力产品，建议加大产能投入。',
      '',
      '四、重点项目进展',
      `当前在手重点项目 ${keyProjects.length} 个，涉及金额 ${projectTotal} 万元。`,
      '中国航发项目进度 75%，处于推进中，需持续跟踪。',
      '航天科工项目进度 45%，试样阶段需技术支持。',
      '',
      '五、丢单分析',
      `本周期丢单 ${lostDeals.length} 个，损失金额 ${lostTotal} 万元。`,
      `主要原因：价格竞争（${lostDeals.find(d => d.reason === '价格竞争')?.amount || 0}万）、交付周期问题。`,
      '建议优化报价策略，缩短交付周期。',
      '',
      '六、下阶段计划',
      '1. 重点跟进中国航发、航天科工在手项目，确保按时交付',
      '2. 针对丢单原因，优化报价和交付策略',
      '3. 加强新能源客户开发，挖掘新增量',
      '4. 加大高温合金、钛合金产能建设',
    ];

    setTimeout(() => {
      setReviewContent(sections);
      setGenerating(false);
    }, 1200);
  };

  const maxValue = 500;
  const chartWidth = 600;
  const barWidth = 40;
  const barGap = 50;
  const chartHeight = 200;

  return (
    <Layout>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg md:text-xl font-bold text-coffee-900 font-display">业绩复盘</h1>
                <p className="text-xs text-coffee-500">数据驱动增长 · 一键生成复盘</p>
              </div>
            </div>
            <button
              onClick={handleGenerateReview}
              className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl text-sm font-semibold hover:opacity-90 flex items-center gap-2 shadow-md hover:shadow-lg transition-shadow"
            >
              <Zap className="w-4 h-4" />
              <span>一键生成复盘</span>
            </button>
          </div>

          <p className="text-xs text-coffee-400 mb-4">自动调取数据 → 智能分析 → 可视化呈现 → 一键生成报告</p>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            <div className="bg-white rounded-2xl p-4 shadow-soft">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-coffee-500">本月目标</span>
                <span className="text-lg">🎯</span>
              </div>
              <p className="text-xl md:text-2xl font-bold text-coffee-900">500<span className="text-sm font-normal text-coffee-500">万</span></p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-soft">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-coffee-500">实际完成</span>
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-xl md:text-2xl font-bold text-coffee-900">425<span className="text-sm font-normal text-coffee-500">万</span></p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-soft">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-coffee-500">目标完成率</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">良好</span>
              </div>
              <p className="text-xl md:text-2xl font-bold text-amber-600">85<span className="text-sm font-normal">%</span></p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-soft">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-coffee-500">同比增长</span>
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-xl md:text-2xl font-bold text-emerald-600">21.4<span className="text-sm font-normal">%</span></p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-soft mb-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-coffee-600" />
                <h3 className="text-base font-semibold text-coffee-900">业绩趋势分析</h3>
              </div>
              <ChevronDown className="w-5 h-5 text-coffee-400" />
            </div>
            <div className="relative h-56">
              <svg viewBox={`0 0 ${chartWidth} ${chartHeight + 40}`} className="w-full h-full">
                {[0, 25, 50, 75, 100].map((pct) => {
                  const y = chartHeight - (chartHeight * pct / 100);
                  return (
                    <g key={pct}>
                      <line x1="40" y1={y} x2={chartWidth} y2={y} stroke="#E8DED1" strokeDasharray="4,4" />
                      <text x="35" y={y + 4} textAnchor="end" fontSize="10" fill="#999">
                        {(maxValue * pct / 100)}万
                      </text>
                    </g>
                  );
                })}
                {monthlyData.map((d, i) => {
                  const x = 60 + i * (barWidth + barGap);
                  const targetHeight = (d.target / maxValue) * chartHeight;
                  const actualHeight = (d.actual / maxValue) * chartHeight;
                  return (
                    <g key={d.month}>
                      <rect
                        x={x}
                        y={chartHeight - targetHeight}
                        width={barWidth / 2}
                        height={targetHeight}
                        fill="#E8DED1"
                        rx="4"
                      />
                      <rect
                        x={x + barWidth / 2 + 4}
                        y={chartHeight - actualHeight}
                        width={barWidth / 2}
                        height={actualHeight}
                        fill="#8B5A2B"
                        rx="4"
                      />
                      <text x={x + barWidth / 2} y={chartHeight + 16} textAnchor="middle" fontSize="11" fill="#666">
                        {d.month}
                      </text>
                      <text x={x + barWidth / 2} y={chartHeight + 30} textAnchor="middle" fontSize="9" fill="#999">
                        {d.actual}万
                      </text>
                    </g>
                  );
                })}
              </svg>
              <div className="absolute top-0 right-0 flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-coffee-200 inline-block" />
                  目标
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-coffee-700 inline-block" />
                  实际
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="bg-white rounded-2xl p-5 shadow-soft">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-coffee-600" />
                  <h3 className="text-sm font-semibold text-coffee-900">客户结构分析</h3>
                </div>
                <div className="relative">
                  <button
                    onClick={() => setCustomerDropdownOpen(!customerDropdownOpen)}
                    className="flex items-center gap-1 text-xs text-coffee-500"
                  >
                    {customerType}
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  {customerDropdownOpen && (
                    <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-coffee-200 z-10">
                      {['客户结构分析', '行业分布', '区域分布'].map((o) => (
                        <button
                          key={o}
                          onClick={() => { setCustomerType(o); setCustomerDropdownOpen(false); }}
                          className="block w-full px-3 py-2 text-left text-xs hover:bg-coffee-50"
                        >
                          {o}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-3">
                {[
                  { name: '航空航天', value: 45, color: 'bg-coffee-700' },
                  { name: '能源电力', value: 25, color: 'bg-amber-500' },
                  { name: '新能源', value: 18, color: 'bg-emerald-500' },
                  { name: '船舶', value: 12, color: 'bg-blue-500' },
                ].map((item) => (
                  <div key={item.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-coffee-700">{item.name}</span>
                      <span className="text-xs font-medium text-coffee-900">{item.value}%</span>
                    </div>
                    <div className="w-full h-2 bg-coffee-100 rounded-full overflow-hidden">
                      <div className={cn('h-full rounded-full', item.color)} style={{ width: `${item.value}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-soft">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-coffee-600" />
                  <h3 className="text-sm font-semibold text-coffee-900">产品结构分析</h3>
                </div>
                <div className="relative">
                  <button
                    onClick={() => setProductDropdownOpen(!productDropdownOpen)}
                    className="flex items-center gap-1 text-xs text-coffee-500"
                  >
                    {productType}
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  {productDropdownOpen && (
                    <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-coffee-200 z-10">
                      {['产品结构分析', '材料分布', '工艺类型'].map((o) => (
                        <button
                          key={o}
                          onClick={() => { setProductType(o); setProductDropdownOpen(false); }}
                          className="block w-full px-3 py-2 text-left text-xs hover:bg-coffee-50"
                        >
                          {o}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-3">
                {[
                  { name: '高温合金锻件', value: 40, color: 'bg-coffee-700' },
                  { name: '钛合金锻件', value: 28, color: 'bg-amber-500' },
                  { name: '铝合金锻件', value: 15, color: 'bg-emerald-500' },
                  { name: '不锈钢锻件', value: 10, color: 'bg-blue-500' },
                  { name: '结构钢锻件', value: 7, color: 'bg-purple-500' },
                ].map((item) => (
                  <div key={item.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-coffee-700">{item.name}</span>
                      <span className="text-xs font-medium text-coffee-900">{item.value}%</span>
                    </div>
                    <div className="w-full h-2 bg-coffee-100 rounded-full overflow-hidden">
                      <div className={cn('h-full rounded-full', item.color)} style={{ width: `${item.value}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl p-5 shadow-soft">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-base">🎯</span>
                <h3 className="text-sm font-semibold text-coffee-900">重点项目进展</h3>
              </div>
              <div className="space-y-3">
                {keyProjects.map((p) => (
                  <div key={p.id} className="p-3 rounded-xl bg-cream hover:bg-coffee-50 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-sm font-medium text-coffee-900">{p.name}</p>
                        <p className="text-xs text-coffee-500">{p.customer} · {p.stage}</p>
                      </div>
                      <span className="text-sm font-bold text-coffee-700">{p.amount}万</span>
                    </div>
                    <div className="w-full h-1.5 bg-coffee-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-coffee-600 to-caramel rounded-full"
                        style={{ width: `${p.progress}%` }}
                      />
                    </div>
                    <p className="text-xs text-coffee-400 mt-1 text-right">{p.progress}%</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-soft">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <h3 className="text-sm font-semibold text-coffee-900">丢单分析</h3>
              </div>
              <div className="space-y-3">
                {lostDeals.map((d) => (
                  <div key={d.id} className="p-3 rounded-xl bg-red-50 border border-red-100">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-coffee-900">{d.name}</p>
                      <span className="text-sm font-bold text-red-500">{d.amount}万</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-coffee-500">
                      <span>{d.customer}</span>
                      <span>·</span>
                      <span>原因: <span className="text-red-600">{d.reason}</span></span>
                    </div>
                    <p className="text-xs text-coffee-400 mt-1">对手: {d.competitor}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
      {/* 一键生成复盘弹窗 */}
      {showReviewModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-coffee-900/40 backdrop-blur-sm animate-fade-in"
          onClick={() => !generating && setShowReviewModal(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-3xl w-full max-h-[85vh] overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-coffee-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-coffee-900">业绩复盘报告</h3>
                  <p className="text-xs text-coffee-500">AI 智能生成 · 数据驱动分析</p>
                </div>
              </div>
              <button
                onClick={() => setShowReviewModal(false)}
                disabled={generating}
                className="p-2 hover:bg-coffee-100 rounded-lg text-coffee-400 hover:text-coffee-600 disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-amber-50/30 to-white">
              {generating ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center mb-4 animate-pulse">
                    <Zap className="w-8 h-8 text-white" />
                  </div>
                  <p className="text-sm font-medium text-coffee-700">正在分析数据生成报告...</p>
                  <p className="text-xs text-coffee-400 mt-1">预计需要 3-5 秒</p>
                </div>
              ) : reviewContent.length === 0 ? null : (
                <div className="space-y-1 leading-relaxed">
                  {reviewContent.map((line, i) => (
                    <p
                      key={i}
                      className={cn(
                        'text-sm',
                        line.startsWith('一、') || line.startsWith('二、') || line.startsWith('三、') || line.startsWith('四、') || line.startsWith('五、') || line.startsWith('六、')
                          ? 'text-base font-semibold text-coffee-900 mt-4 mb-2'
                          : line === ''
                            ? 'h-2'
                            : 'text-coffee-700'
                      )}
                    >
                      {line}
                    </p>
                  ))}
                </div>
              )}
            </div>

            {!generating && reviewContent.length > 0 && (
              <div className="px-6 py-4 border-t border-coffee-100 flex items-center justify-between bg-white">
                <p className="text-xs text-coffee-400">
                  生成时间：{new Date().toLocaleString('zh-CN', { hour12: false })}
                </p>
                <div className="flex items-center gap-2">
                  {reviewSaved ? (
                    <span className="flex items-center gap-1 px-4 py-2 text-sm text-emerald-600 font-medium">
                      <Check className="w-4 h-4" /> 已保存
                    </span>
                  ) : (
                    <button
                      onClick={() => setReviewSaved(true)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-coffee-100 text-coffee-700 rounded-xl text-sm font-medium hover:bg-coffee-200"
                    >
                      <FileText className="w-4 h-4" /> 保存报告
                    </button>
                  )}
                  <button
                    onClick={() => {
                      const text = reviewContent.join('\n');
                      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `业绩复盘报告_${new Date().toISOString().slice(0, 10)}.txt`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl text-sm font-medium hover:opacity-90"
                  >
                    <Download className="w-4 h-4" /> 导出报告
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}