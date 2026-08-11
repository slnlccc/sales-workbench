import { useEffect, useState, useMemo, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Package, Users, StickyNote, TrendingUp, ArrowRight,
  FileText, Rocket, Trophy, ChevronLeft, ChevronRight,
  Sparkles, Phone, Mail, Calendar,
} from 'lucide-react'
import { orderApi, customerApi, memoApi } from '@/lib/api'

// ============ 航天行业动态 mock 数据 ============
// 后续可接入真实 API：替换 newsData / launchesData / bidsData 为接口返回即可

type NewsItem = { id: string; title: string; source: string; date: string; summary: string; tag?: string }
type LaunchItem = { id: string; mission: string; rocket: string; launchDate: string; launchSite: string; status: string; payload: string }
type BidItem = { id: string; projectName: string; purchaser: string; budget: string; deadline: string; region: string; category: string }

const NEWS_DATA: NewsItem[] = [
  { id: 'p1', title: '国务院印发《关于加快推进商业航天发展的指导意见》', source: '中国政府网', date: '2026-08-08', tag: '重磅',
    summary: '明确提出到 2030 年商业航天产业规模突破万亿元，支持可重复使用运载火箭、低轨卫星互联网、太空旅游等重点方向。' },
  { id: 'p2', title: '工信部发布《航空航天锻件行业规范条件（2026年修订）》', source: '工信部', date: '2026-08-05', tag: '政策',
    summary: '强化高温合金、钛合金锻件的质量追溯与工艺认证，鼓励企业加大自由锻、精密模锻、近净成形等核心工艺的研发投入。' },
  { id: 'p3', title: '国防科工局："十四五"后两年航空航天配套锻件采购预算上调 15%', source: '国防科工局', date: '2026-08-01', tag: '采购',
    summary: '重点支持航空发动机涡轮盘、航天舱体结构件、导弹弹体等关键锻件国产化配套，相关企业订单景气度持续上行。' },
  { id: 'p4', title: '上海自贸区推出商业航天企业登记与跨境结算便利化 8 条新政', source: '上海市政府', date: '2026-07-28', tag: '地方',
    summary: '允许商业航天企业以认缴制登记火箭制造业务，跨境卫星发射服务结算纳入自由贸易账户便利化通道。' },
  { id: 'p5', title: '国家知识产权局：航天领域专利申请费减免延长至 2030 年', source: '国家知识产权局', date: '2026-07-20', tag: '政策',
    summary: '适用于火箭发动机、在轨服务、航天器结构件、卫星载荷等细分技术方向，大幅降低中小企业研发成本。' },
]

const LAUNCHES_DATA: LaunchItem[] = [
  { id: 'l1', mission: '长征十号 Y5 · 神舟三十号载人任务', rocket: '长征十号', launchDate: '2026-08-15 08:20', launchSite: '酒泉卫星发射中心', status: '即将发射',
    payload: '神舟三十号载人飞船 × 1（送 3 名航天员至天宫空间站）' },
  { id: 'l2', mission: '长征八号 R Y3 · 一箭 22 星可回收任务', rocket: '长征八号 R（可回收）', launchDate: '2026-08-09 11:45', launchSite: '海南文昌航天发射场', status: '成功',
    payload: '千帆星座 09 组 20 星 + 海南一号 06/07 星，一子级成功垂直回收' },
  { id: 'l3', mission: '长征五号 Y10 · 巡天光学舱核心舱发射', rocket: '长征五号 B', launchDate: '2026-07-28 14:12', launchSite: '海南文昌航天发射场', status: '成功',
    payload: '巡天光学舱核心舱（约 22 吨），与天宫空间站前向对接口对接成功' },
  { id: 'l4', mission: '朱雀三号 Y2 · 亚轨道可回收验证', rocket: '朱雀三号（蓝箭航天）', launchDate: '2026-07-15 15:30', launchSite: '酒泉卫星发射中心', status: '成功',
    payload: '不携带有效载荷，完成 120km 顶点 + 3 次气动精确落点控制验证，一子级定点回收' },
  { id: 'l5', mission: '天龙三号 Y4 · 千帆星座补网发射', rocket: '天龙三号（天兵科技）', launchDate: '2026-07-03 09:28', launchSite: '酒泉卫星发射中心', status: '成功',
    payload: '千帆星座 11 组 24 颗 5G IoT 卫星，全部进入 550km SSO 轨道' },
  { id: 'l6', mission: '长征十一号 H Y6 · 海上发射任务', rocket: '长征十一号 H（固体）', launchDate: '2026-06-22 13:18', launchSite: '黄海海上发射平台', status: '成功',
    payload: '天启星座 3 颗 + 大连海洋大学试验星 1 颗，共计 4 星，一箭四星' },
]

const BIDS_DATA: BidItem[] = [
  { id: 'b1', projectName: 'XX 航发厂 GH4169 涡轮盘锻件年度框架采购', purchaser: '中国航发西安航空发动机有限公司', budget: '¥ 4,800 万元',
    deadline: '2026-08-20', region: '陕西 · 西安', category: '高温合金锻件' },
  { id: 'b2', projectName: '天宫空间站舱体结构 TC4 钛合金大型环件招标', purchaser: '中国航天科技集团五院', budget: '¥ 2,650 万元',
    deadline: '2026-08-25', region: '北京', category: '钛合金锻件' },
  { id: 'b3', projectName: '某型空空弹弹体 300M 钢模锻件 2026 年下半年批次', purchaser: '中国空空导弹研究院', budget: '¥ 1,980 万元',
    deadline: '2026-08-30', region: '河南 · 洛阳', category: '结构钢锻件' },
  { id: 'b4', projectName: 'C919 量产批次 2A14 铝合金起落架锻件 2027 年度框架', purchaser: '中国商飞上海飞机制造有限公司', budget: '¥ 6,200 万元',
    deadline: '2026-09-05', region: '上海', category: '铝合金锻件' },
  { id: 'b5', projectName: '嫦娥七号备份着陆器 GH4141 发动机支架锻件', purchaser: '中国航天科技集团五院 508 所', budget: '¥ 860 万元',
    deadline: '2026-09-10', region: '北京', category: '高温合金锻件' },
  { id: 'b6', projectName: '太行 WS-20 改型 TC17 钛合金整体叶盘模锻', purchaser: '中国航发沈阳黎明航空发动机有限责任公司', budget: '¥ 3,400 万元',
    deadline: '2026-09-15', region: '辽宁 · 沈阳', category: '钛合金锻件' },
  { id: 'b7', projectName: '某型远程火箭弹 40CrNiMoA 弹体毛坯锻件 3 年框架', purchaser: '中国兵器工业集团江山重工', budget: '¥ 5,100 万元',
    deadline: '2026-09-20', region: '湖北 · 襄阳', category: '结构钢锻件' },
]

// 每个大屏一次显示几条
const PAGE_SIZE = 3
// 轮播间隔（毫秒）
const ROTATE_INTERVAL = 10_000

// ============ 工具组件：轮播容器 ============
function Carousel<T>({
  items, pageSize = PAGE_SIZE, interval = ROTATE_INTERVAL,
  renderItem, emptyText,
}: {
  items: T[]
  pageSize?: number
  interval?: number
  renderItem: (item: T, i: number) => React.ReactNode
  emptyText?: string
}) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))
  const [page, setPage] = useState(0)
  const hoverRef = useRef(false)

  useEffect(() => {
    if (totalPages <= 1) return
    const t = setInterval(() => {
      if (hoverRef.current) return
      setPage((p) => (p + 1) % totalPages)
    }, interval)
    return () => clearInterval(t)
  }, [totalPages, interval])

  const slice = items.slice(page * pageSize, page * pageSize + pageSize)

  const prev = () => setPage((p) => (p - 1 + totalPages) % totalPages)
  const next = () => setPage((p) => (p + 1) % totalPages)

  return (
    <div
      className="relative flex flex-col h-full"
      onMouseEnter={() => { hoverRef.current = true }}
      onMouseLeave={() => { hoverRef.current = false }}
    >
      <div className="flex-1 min-h-0 flex flex-col">
        {slice.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-sm text-slate-400">{emptyText || '暂无数据'}</div>
        ) : (
          <div className="flex-1 min-h-0 flex flex-col gap-3 py-1">
            {slice.map((it, i) => renderItem(it, i))}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
          <button
            onClick={prev}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="上一页"
          >
            <ChevronLeft size={16} />
          </button>
          <div className="flex items-center gap-1.5">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i)}
                aria-label={`第 ${i + 1} 页`}
                className={`w-1.5 h-1.5 rounded-full transition-all ${i === page ? 'bg-brand-500 w-4' : 'bg-slate-200 hover:bg-slate-300'}`}
              />
            ))}
          </div>
          <button
            onClick={next}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="下一页"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  )
}

// ============ 主页面 ============
export default function DashboardPage() {
  const navigate = useNavigate()
  const [stats, setStats] = useState({ orders: 0, customers: 0, memos: 0, memoClosed: 0 })
  const [recentOrders, setRecentOrders] = useState<any[]>([])
  const [upcomingMemos, setUpcomingMemos] = useState<any[]>([])
  const [topCustomers, setTopCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // 获取业务数据（用户隔离已由后端 enforce）
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const [orders, customers, memos] = await Promise.all([
          orderApi.list(),
          customerApi.list(),
          memoApi.list(),
        ])
        if (!alive) return
        const oList = normalizeList(orders)
        const cList = normalizeList(customers)
        const mList = normalizeList(memos)
        setStats({
          orders: oList.length,
          customers: cList.length,
          memos: mList.length,
          memoClosed: mList.filter((m: any) => m.closed).length,
        })
        setRecentOrders(oList.slice(0, 5))
        setUpcomingMemos(
          mList
            .filter((m: any) => !m.closed)
            .sort((a: any, b: any) => (a.date || '').localeCompare(b.date || ''))
            .slice(0, 5)
        )
        // 客户按等级简单排一下取前 4
        const levelRank: Record<string, number> = { A: 0, B: 1, C: 2 }
        setTopCustomers(
          [...cList]
            .sort((a: any, b: any) => (levelRank[a.level ?? a.creditLevel] ?? 9) - (levelRank[b.level ?? b.creditLevel] ?? 9))
            .slice(0, 4)
        )
      } catch {
        // 静默处理
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [])

  const statCards = useMemo(() => [
    { label: '订单总数', value: stats.orders, icon: Package, color: 'bg-blue-50 text-blue-600', desc: '追踪生产与交付', link: '/orders', action: '+ 新增订单' },
    { label: '客户画像', value: stats.customers, icon: Users, color: 'bg-emerald-50 text-emerald-600', desc: '管理客户关系', link: '/customers', action: '+ 新增客户' },
    { label: '待办事项', value: stats.memos - stats.memoClosed, icon: StickyNote, color: 'bg-amber-50 text-amber-600', desc: '日历形式管理', link: '/memo', action: '+ 新建备忘' },
    { label: '待办完成率',
      value: stats.memos > 0 ? `${Math.round((stats.memoClosed / stats.memos) * 100)}%` : '—',
      icon: TrendingUp, color: 'bg-violet-50 text-violet-600', desc: 'AI 协助规划', link: '/ai', action: '问 AI 助手' },
  ], [stats])

  if (loading) {
    return <div className="text-center text-slate-400 py-20">加载中...</div>
  }

  return (
    <div className="space-y-6">
      {/* ====== 顶部：航天行业动态三大屏 ====== */}
      <section>
        <div className="flex items-end justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Sparkles size={20} className="text-brand-500" />
              航天行业动态
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">政策信息 · 发射情况 · 中标信息 — 每 10 秒自动翻页，鼠标悬停可暂停</p>
          </div>
          <div className="text-xs text-slate-400">
            更新时间：{new Date().toLocaleDateString('zh-CN')}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          {/* 大屏 1：政策信息 */}
          <div className="card p-5 flex flex-col" style={{ minHeight: 360 }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <FileText size={18} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-700">政策信息</h3>
                  <p className="text-xs text-slate-400">{NEWS_DATA.length} 条 · 国家/地方政策</p>
                </div>
              </div>
            </div>
            <div className="flex-1 min-h-0">
              <Carousel
                items={NEWS_DATA}
                renderItem={(n) => (
                  <article className="p-3 rounded-lg bg-slate-50/60 hover:bg-slate-50 border border-slate-100 transition-colors">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-600 font-medium">{n.tag || '政策'}</span>
                      <span className="text-[10px] text-slate-400">{n.date}</span>
                    </div>
                    <h4 className="text-sm font-medium text-slate-700 leading-snug mb-1 line-clamp-1">{n.title}</h4>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{n.summary}</p>
                    <div className="text-[10px] text-slate-400 mt-1">来源：{n.source}</div>
                  </article>
                )}
              />
            </div>
          </div>

          {/* 大屏 2：发射情况 */}
          <div className="card p-5 flex flex-col" style={{ minHeight: 360 }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Rocket size={18} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-700">发射情况</h3>
                  <p className="text-xs text-slate-400">{LAUNCHES_DATA.length} 次 · 近 90 天任务</p>
                </div>
              </div>
            </div>
            <div className="flex-1 min-h-0">
              <Carousel
                items={LAUNCHES_DATA}
                renderItem={(l) => (
                  <article className="p-3 rounded-lg bg-slate-50/60 hover:bg-slate-50 border border-slate-100 transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        l.status === '成功' ? 'bg-emerald-100 text-emerald-600' :
                        l.status === '即将发射' ? 'bg-amber-100 text-amber-600' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {l.status}
                      </span>
                      <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                        <Calendar size={10} /> {l.launchDate.slice(0, 16)}
                      </span>
                    </div>
                    <h4 className="text-sm font-medium text-slate-700 leading-snug mb-1 line-clamp-1">{l.mission}</h4>
                    <div className="text-xs text-slate-500 space-y-0.5">
                      <div>🚀 {l.rocket} · {l.launchSite}</div>
                      <div className="line-clamp-1">📦 {l.payload}</div>
                    </div>
                  </article>
                )}
              />
            </div>
          </div>

          {/* 大屏 3：中标信息 */}
          <div className="card p-5 flex flex-col" style={{ minHeight: 360 }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Trophy size={18} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-700">中标信息</h3>
                  <p className="text-xs text-slate-400">{BIDS_DATA.length} 条 · 锻件招标商机</p>
                </div>
              </div>
            </div>
            <div className="flex-1 min-h-0">
              <Carousel
                items={BIDS_DATA}
                renderItem={(b) => (
                  <article className="p-3 rounded-lg bg-slate-50/60 hover:bg-slate-50 border border-slate-100 transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-600 font-medium">{b.category}</span>
                      <span className="text-xs font-semibold text-slate-700">{b.budget}</span>
                    </div>
                    <h4 className="text-sm font-medium text-slate-700 leading-snug mb-1 line-clamp-2">{b.projectName}</h4>
                    <div className="text-xs text-slate-500 space-y-0.5">
                      <div>采购方：{b.purchaser}</div>
                      <div className="flex items-center justify-between">
                        <span>📍 {b.region}</span>
                        <span className="text-amber-600">截止 {b.deadline}</span>
                      </div>
                    </div>
                  </article>
                )}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ====== 中部：快速入口统计卡片 ====== */}
      <section>
        <div className="flex items-end justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-800">工作台</h2>
          <p className="text-xs text-slate-400">点击卡片跳转对应模块</p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map(({ label, value, desc, icon: Icon, color, link, action }) => (
            <div key={label} className="card p-5 hover:shadow-soft transition-shadow group">
              <div className="flex items-start justify-between mb-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
                  <Icon size={20} />
                </div>
                <button
                  onClick={() => navigate(link)}
                  className="text-[11px] px-2 py-1 rounded-md bg-slate-50 text-slate-500 hover:bg-brand-50 hover:text-brand-600 transition-colors"
                >
                  {action}
                </button>
              </div>
              <Link to={link} className="block">
                <p className="text-2xl font-bold text-slate-800 group-hover:text-brand-600 transition-colors">{value}</p>
                <p className="text-sm text-slate-400 mt-0.5">{label}</p>
                <p className="text-xs text-slate-400 mt-1">{desc}</p>
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ====== 底部：最近订单 + 待办 + 重点客户 ====== */}
      <section className="grid lg:grid-cols-3 gap-4">
        {/* 最近订单 */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-700 flex items-center gap-2">
              <Package size={16} className="text-blue-500" /> 最近订单
            </h2>
            <Link to="/orders" className="text-sm text-brand-600 hover:underline flex items-center gap-0.5">
              全部 <ArrowRight size={14} />
            </Link>
          </div>
          {recentOrders.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-slate-400 mb-3">暂无订单</p>
              <button onClick={() => navigate('/orders')} className="btn-secondary text-sm py-1.5 px-3">
                + 新建订单
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {recentOrders.map((o) => (
                <div key={o._id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{o.productionNo || '—'}</p>
                    <p className="text-xs text-slate-400 truncate">{o.customer || o.customerName || '—'}</p>
                  </div>
                  <span className="text-sm text-slate-600 shrink-0 ml-3">{o.totalPrice ? `¥${o.totalPrice.toLocaleString()}` : '—'}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 待办事项 */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-700 flex items-center gap-2">
              <StickyNote size={16} className="text-amber-500" /> 待办事项
            </h2>
            <Link to="/memo" className="text-sm text-brand-600 hover:underline flex items-center gap-0.5">
              全部 <ArrowRight size={14} />
            </Link>
          </div>
          {upcomingMemos.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-slate-400 mb-3">暂无待办</p>
              <button onClick={() => navigate('/memo')} className="btn-secondary text-sm py-1.5 px-3">
                + 新建备忘
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {upcomingMemos.map((m) => (
                <div key={m._id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{m.title}</p>
                    <p className="text-xs text-slate-400 flex items-center gap-1">
                      <Calendar size={10} /> {m.date} {m.startTime || m.time || ''}
                    </p>
                  </div>
                  <span className="badge bg-amber-50 text-amber-600 shrink-0 ml-3">{m.type || '待办'}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 重点客户 */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-700 flex items-center gap-2">
              <Users size={16} className="text-emerald-500" /> 重点客户
            </h2>
            <Link to="/customers" className="text-sm text-brand-600 hover:underline flex items-center gap-0.5">
              全部 <ArrowRight size={14} />
            </Link>
          </div>
          {topCustomers.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-slate-400 mb-3">暂无客户</p>
              <button onClick={() => navigate('/customers')} className="btn-secondary text-sm py-1.5 px-3">
                + 新增客户
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {topCustomers.map((c) => {
                const level = c.level || c.creditLevel || 'B'
                const contact = c.contactPerson || c.contact || '—'
                return (
                  <div key={c._id} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
                    <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs font-medium shrink-0">
                      {(c.name || '客').slice(0, 1)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium text-slate-700 truncate">{c.name}</p>
                        <span className={`badge ${
                          level === 'A' ? 'bg-emerald-50 text-emerald-600' :
                          level === 'B' ? 'bg-blue-50 text-blue-600' :
                          'bg-slate-100 text-slate-500'
                        }`}>{level}</span>
                      </div>
                      <p className="text-xs text-slate-400 truncate flex items-center gap-1">
                        <span>{contact}</span>
                        {c.phone && <><span>·</span><Phone size={10} /><span>{c.phone}</span></>}
                      </p>
                    </div>
                    {c.email && (
                      <button
                        onClick={() => window.location.href = `mailto:${c.email}`}
                        className="p-1.5 rounded-md text-slate-300 hover:text-slate-500 hover:bg-slate-50 shrink-0"
                        title={`发邮件给 ${contact}`}
                      >
                        <Mail size={14} />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function normalizeList(res: any): any[] {
  if (Array.isArray(res)) return res
  return res?.data || []
}
