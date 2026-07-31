import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, Minus, RefreshCw, Newspaper, Building2, Loader2 } from 'lucide-react'
import { dataApi } from '@/services/api'

interface MetalPrice {
  name: string
  price: number
  unit: string
  change: number
  changePercent: number
}

interface NewsItem {
  title: string
  source: string
  category: string
  summary: string
  publishDate: string
}

interface Exhibition {
  name: string
  date: string
  location: string
  description: string
  status: string
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg md:text-xl font-bold text-cream-900">市场数据中心</h2>
          {date && <p className="text-xs text-cream-500 mt-0.5">数据日期：{date}</p>}
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
            <p className="text-sm text-cream-800 leading-relaxed">{analysis}</p>
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
            </div>
          ))}
        </div>
      )}

      {/* 行业资讯 */}
      {activeTab === 'news' && (
        <div className="space-y-3">
          {news.length > 0 ? news.map((item, i) => (
            <div key={i} className="p-3 rounded-xl bg-white border border-cream-200 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-2">
                <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${getCategoryColor(item.category)}`}>
                  {getCategoryLabel(item.category)}
                </span>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-cream-900 leading-snug">{item.title}</h4>
                  <p className="text-xs text-cream-500 mt-1 line-clamp-2">{item.summary}</p>
                  <div className="flex items-center gap-2 mt-2 text-[10px] text-cream-400">
                    <span>{item.source}</span>
                    <span>•</span>
                    <span>{item.publishDate}</span>
                  </div>
                </div>
              </div>
            </div>
          )) : (
            <div className="text-center py-8 text-cream-500 text-sm">暂无行业资讯</div>
          )}
        </div>
      )}

      {/* 展会信息 */}
      {activeTab === 'exhibitions' && (
        <div className="space-y-3">
          {exhibitions.length > 0 ? exhibitions.map((exh, i) => (
            <div key={i} className="p-3 rounded-xl bg-white border border-cream-200 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-2">
                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-5 h-5 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-cream-900">{exh.name}</h4>
                  <p className="text-xs text-cream-500 mt-1">{exh.description}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-2 text-[10px] text-cream-400">
                    <span>{exh.date}</span>
                    <span>•</span>
                    <span>{exh.location}</span>
                    {exh.status && (
                      <>
                        <span>•</span>
                        <span className={`px-1.5 py-0.5 rounded font-medium ${
                          exh.status === 'upcoming' ? 'bg-blue-50 text-blue-600' : exh.status === 'ongoing' ? 'bg-green-50 text-green-600' : 'bg-cream-50 text-cream-500'
                        }`}>
                          {exh.status === 'upcoming' ? '即将开始' : exh.status === 'ongoing' ? '进行中' : '已结束'}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )) : (
            <div className="text-center py-8 text-cream-500 text-sm">暂无展会信息</div>
          )}
        </div>
      )}
    </div>
  )
}
