import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, Minus, RefreshCw, Newspaper, Building2, Loader2, ExternalLink, Info, BookOpen } from 'lucide-react'
import { dataApi } from '@/services/api'
import { cn } from '@/lib/utils'

interface MetalPrice {
  name: string
  price: number
  unit: string
  change: number
  changePercent: number
  sourceName?: string
  sourceUrl?: string
}

interface NewsItem {
  title: string
  source: string
  sourceName?: string
  sourceUrl?: string
  category: string
  summary: string
  publishDate: string
  url?: string
}

interface Exhibition {
  name: string
  date: string
  location: string
  description: string
  status: string
  organizer?: string
  sourceName?: string
  sourceUrl?: string
  url?: string
}

/** 安全的外链跳转：新标签页 + noopener */
function openSource(url: string | undefined, e?: React.MouseEvent) {
  if (!url) return
  if (!/^https?:\/\//i.test(url)) return
  if (e) e.preventDefault()
  window.open(url, '_blank', 'noopener,noreferrer')
}

export default function MarketDataPanel() {
  const [activeTab, setActiveTab] = useState<'prices' | 'news' | 'exhibitions'>('prices')
  const [metals, setMetals] = useState<MetalPrice[]>([])
  const [news, setNews] = useState<NewsItem[]>([])
  const [exhibitions, setExhibitions] = useState<Exhibition[]>([])
  const [analysis, setAnalysis] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [date, setDate] = useState('')

  const loadData = async () => {
    try {
      setLoading(true)
      const result = await dataApi.marketOverview()
      if (result.success) {
        setMetals(result.data.metalPrices?.metals || [])
        setDate(result.data.metalPrices?.date || '')
        setNews(result.data.news || [])
        setExhibitions(result.data.exhibitions || [])
        setAnalysis(result.data.analysis || '')
      }
    } catch (err) {
      console.error('加载市场数据失败:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await dataApi.refresh()
      await loadData()
    } catch (err) {
      console.error('刷新数据失败:', err)
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const getCategoryLabel = (cat: string) => {
    const map: Record<string, string> = { policy: '政策', market: '市场', technology: '技术', exhibition: '展会', price: '价格' }
    return map[cat] || cat
  }

  const getCategoryColor = (cat: string) => {
    const map: Record<string, string> = { policy: 'bg-blue-100 text-blue-700', market: 'bg-green-100 text-green-700', technology: 'bg-purple-100 text-purple-700', exhibition: 'bg-amber-100 text-amber-700', price: 'bg-red-100 text-red-700' }
    return map[cat] || 'bg-cream-100 text-cream-700'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-cream-500 animate-spin" />
        <span className="ml-2 text-cream-600">加载市场数据...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg md:text-xl font-bold text-cream-900">市场数据中心</h2>
          <div className="flex items-center gap-2 mt-0.5">
            {date && <p className="text-xs text-cream-500">数据日期：{date}</p>}
            <span className="flex items-center gap-1 text-[10px] text-cream-400">
              <Info className="w-3 h-3" />
              数据来源均可点击核实准确性
            </span>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-cream-100 text-cream-700 hover:bg-cream-200 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          刷新
        </button>
      </div>

      {/* AI 分析摘要 */}
      {analysis && (
        <div className="p-3 rounded-xl bg-gradient-to-r from-cream-100 to-cream-50 border border-cream-200">
          <div className="flex items-start gap-2">
            <TrendingUp className="w-4 h-4 text-cream-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-cream-800 leading-relaxed">{analysis}</p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-cream-100 rounded-xl">
        {[
          { key: 'prices', label: '金属价格', icon: TrendingUp },
          { key: 'news', label: '行业资讯', icon: Newspaper },
          { key: 'exhibitions', label: '展会信息', icon: Building2 },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as any)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs md:text-sm font-medium rounded-lg transition-all ${
              activeTab === key
                ? 'bg-white text-cream-900 shadow-sm'
                : 'text-cream-600 hover:text-cream-800'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* 金属价格 */}
      {activeTab === 'prices' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {metals.map((metal, i) => (
            <div key={i} className="p-3 rounded-xl bg-white border border-cream-200 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-cream-800">{metal.name}</span>
                <div className={`flex items-center gap-0.5 text-xs font-medium ${
                  metal.change > 0 ? 'text-red-600' : metal.change < 0 ? 'text-green-600' : 'text-cream-500'
                }`}>
                  {metal.change > 0 ? <TrendingUp className="w-3 h-3" /> : metal.change < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                  {metal.change > 0 ? '+' : ''}{metal.changePercent}%
                </div>
              </div>
              <div className="text-xl font-bold text-cream-900">
                {metal.price?.toLocaleString()}
                <span className="text-xs font-normal text-cream-500 ml-1">{metal.unit}</span>
              </div>
              <div className={`text-xs mt-1 ${
                metal.change > 0 ? 'text-red-500' : metal.change < 0 ? 'text-green-500' : 'text-cream-500'
              }`}>
                {metal.change > 0 ? '↑' : metal.change < 0 ? '↓' : '-'} {Math.abs(metal.change)?.toLocaleString()} {metal.unit}
              </div>
              {/* 来源链接 */}
              {metal.sourceUrl && (
                <button
                  onClick={(e) => openSource(metal.sourceUrl, e)}
                  className={cn(
                    'mt-2 pt-2 border-t border-cream-100 w-full flex items-center justify-between text-[10px] transition-colors',
                    'text-cream-400 hover:text-cream-700'
                  )}
                >
                  <span className="flex items-center gap-1">
                    <BookOpen className="w-2.5 h-2.5" />
                    参考来源：{metal.sourceName || '行业平台'}
                  </span>
                  <span className="flex items-center gap-0.5 text-cream-500">
                    点击核实
                    <ExternalLink className="w-2.5 h-2.5" />
                  </span>
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 行业资讯 */}
      {activeTab === 'news' && (
        <div className="space-y-3">
          {news.length > 0 ? news.map((item, i) => {
            // 优先用文章具体页，其次用来源官网
            const href = item.url || item.sourceUrl
            const sourceName = item.sourceName || item.source
            return (
              <div key={i} className="p-3 rounded-xl bg-white border border-cream-200 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-2">
                  <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded flex-shrink-0 ${getCategoryColor(item.category)}`}>
                    {getCategoryLabel(item.category)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-cream-900 leading-snug">{item.title}</h4>
                    <p className="text-xs text-cream-500 mt-1 line-clamp-2">{item.summary}</p>

                    {/* 元信息 + 来源链接 */}
                    <div className="mt-2 flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2 text-[10px] text-cream-400">
                        <span>{item.publishDate}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {href && (
                          <button
                            onClick={(e) => openSource(href, e)}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] transition-colors bg-cream-50 text-cream-600 hover:bg-cream-100 hover:text-cream-900"
                            title={`来源：${sourceName}（点击核实）`}
                          >
                            <BookOpen className="w-2.5 h-2.5" />
                            <span>{sourceName || '来源'}</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          }) : (
            <div className="text-center py-8 text-cream-500 text-sm">暂无行业资讯</div>
          )}
        </div>
      )}

      {/* 展会信息 */}
      {activeTab === 'exhibitions' && (
        <div className="space-y-3">
          {exhibitions.length > 0 ? exhibitions.map((exh, i) => {
            const href = exh.url || exh.sourceUrl
            return (
              <div key={i} className="p-3 rounded-xl bg-white border border-cream-200 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-2">
                  <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-medium text-cream-900 leading-snug">{exh.name}</h4>
                      {exh.status && (
                        <span className={cn(
                          'px-1.5 py-0.5 rounded text-[10px] font-medium flex-shrink-0',
                          exh.status === 'upcoming' ? 'bg-blue-50 text-blue-600' :
                          exh.status === 'ongoing' ? 'bg-green-50 text-green-600' :
                          'bg-cream-50 text-cream-500'
                        )}>
                          {exh.status === 'upcoming' ? '即将开始' : exh.status === 'ongoing' ? '进行中' : '已结束'}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-cream-500 mt-1">{exh.description}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-2 text-[10px] text-cream-400">
                      <span>{exh.date}</span>
                      <span>•</span>
                      <span>{exh.location}</span>
                      {exh.organizer && (
                        <>
                          <span>•</span>
                          <span>{exh.organizer}</span>
                        </>
                      )}
                    </div>

                    {/* 展会官方链接 */}
                    <div className="mt-2 flex items-center justify-between flex-wrap gap-2">
                      <span className="text-[10px] text-cream-400" />
                      {href && (
                        <button
                          onClick={(e) => openSource(href, e)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium transition-colors bg-amber-50 text-amber-700 hover:bg-amber-100"
                          title={`${exh.sourceName || exh.organizer || '展会官网'}（点击核实）`}
                        >
                          <BookOpen className="w-2.5 h-2.5" />
                          <span>展会官网</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          }) : (
            <div className="text-center py-8 text-cream-500 text-sm">暂无展会信息</div>
          )}
        </div>
      )}
    </div>
  )
}
