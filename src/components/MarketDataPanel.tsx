import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, TrendingDown, Minus, RefreshCw, Newspaper, Calendar, AlertCircle, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { dataApi } from '@/services/api';

interface MetalPrice {
  name: string;
  category: string;
  price: number;
  unit: string;
  change: number;
  changePercent: number;
  trend: string;
}

interface IndustryNews {
  title: string;
  summary: string;
  category: string;
  source: string;
  sourceUrl?: string;
  date: string;
}

interface Exhibition {
  name: string;
  date: string;
  location: string;
  description: string;
  category: string;
  sourceUrl?: string;
}

interface MarketData {
  metalPrices: MetalPrice[];
  industryNews: IndustryNews[];
  exhibitions: Exhibition[];
  lastUpdate: string | null;
  aiEnabled: boolean;
}

const categoryColors: Record<string, string> = {
  '高温合金': 'bg-orange-100 text-orange-700',
  '钛合金': 'bg-cyan-100 text-cyan-700',
  '不锈钢': 'bg-blue-100 text-blue-700',
  '铝合金': 'bg-gray-100 text-gray-700',
  '合金钢': 'bg-purple-100 text-purple-700',
};

const newsCategoryColors: Record<string, string> = {
  '航空': 'bg-sky-100 text-sky-700',
  '核电': 'bg-yellow-100 text-yellow-700',
  '风电': 'bg-green-100 text-green-700',
  '石化': 'bg-red-100 text-red-700',
  '船舶': 'bg-indigo-100 text-indigo-700',
  '市场': 'bg-amber-100 text-amber-700',
  '政策': 'bg-rose-100 text-rose-700',
};

export default function MarketDataPanel() {
  const [data, setData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const result = await dataApi.marketOverview();
      setData(result);
      setError('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const result = await dataApi.refresh();
      setData(result);
      setError('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-3xl p-6 shadow-soft animate-pulse">
        <div className="h-6 bg-coffee-100 rounded w-1/3 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-coffee-50 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 头部 */}
      <div className="bg-white rounded-3xl p-5 shadow-soft">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-coffee-600 to-caramel flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-coffee-900">市场数据概览</h3>
              <p className="text-xs text-coffee-400">
                {data?.lastUpdate
                  ? `最后更新: ${new Date(data.lastUpdate).toLocaleString('zh-CN')}`
                  : '暂无数据'}
              </p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing || !data?.aiEnabled}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all',
              data?.aiEnabled
                ? 'bg-coffee-50 text-coffee-700 hover:bg-coffee-100'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            )}
          >
            <RefreshCw className={cn('w-3.5 h-3.5', refreshing && 'animate-spin')} />
            <span>{refreshing ? '刷新中...' : '刷新数据'}</span>
          </button>
        </div>

        {!data?.aiEnabled && (
          <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-amber-50 rounded-xl">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <p className="text-xs text-amber-700">
              AI 功能未启用，数据为空。配置 DEEPSEEK_API_KEY 后可自动生成市场数据。
            </p>
          </div>
        )}
      </div>

      {/* 金属价格 */}
      {data?.metalPrices && data.metalPrices.length > 0 && (
        <div className="bg-white rounded-3xl p-5 shadow-soft">
          <h4 className="text-sm font-semibold text-coffee-700 mb-3">金属材料参考价格</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {data.metalPrices.map((item, idx) => {
              const TrendIcon = item.trend === 'up' ? TrendingUp : item.trend === 'down' ? TrendingDown : Minus;
              const trendColor = item.trend === 'up' ? 'text-emerald-600' : item.trend === 'down' ? 'text-red-500' : 'text-coffee-400';
              return (
                <div key={idx} className="flex items-center justify-between p-3 bg-coffee-50/50 rounded-xl">
                  <div className="flex items-center gap-2">
                    <span className={cn('px-2 py-0.5 rounded text-[10px] font-medium', categoryColors[item.category] || 'bg-gray-100 text-gray-600')}>
                      {item.category}
                    </span>
                    <span className="text-sm font-medium text-coffee-800">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-coffee-900">
                      {item.price.toLocaleString()} <span className="text-xs text-coffee-400">{item.unit}</span>
                    </p>
                    <div className={cn('flex items-center justify-end gap-0.5 text-xs', trendColor)}>
                      <TrendIcon className="w-3 h-3" />
                      <span>{item.changePercent > 0 ? '+' : ''}{item.changePercent}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 行业资讯 */}
      {data?.industryNews && data.industryNews.length > 0 && (
        <div className="bg-white rounded-3xl p-5 shadow-soft">
          <div className="flex items-center gap-2 mb-3">
            <Newspaper className="w-4 h-4 text-coffee-500" />
            <h4 className="text-sm font-semibold text-coffee-700">行业资讯</h4>
          </div>
          <div className="space-y-3">
            {data.industryNews.map((news, idx) => (
              <div key={idx} className="p-3 bg-coffee-50/40 rounded-xl hover:bg-coffee-50 transition-colors">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h5 className="text-sm font-medium text-coffee-800 flex-1">{news.title}</h5>
                  <span className={cn('px-2 py-0.5 rounded text-[10px] font-medium flex-shrink-0', newsCategoryColors[news.category] || 'bg-gray-100 text-gray-600')}>
                    {news.category}
                  </span>
                </div>
                <p className="text-xs text-coffee-500 leading-relaxed">{news.summary}</p>
                <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-xs text-coffee-400 mt-1">
                  <span>{news.source}</span>
                  <span>·</span>
                  <span>{news.date}</span>
                  {news.sourceUrl && (
                    <>
                      <span>·</span>
                      <a
                        href={news.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-0.5 text-coffee-600 hover:text-coffee-900 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>核实来源</span>
                      </a>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 展会信息 */}
      {data?.exhibitions && data.exhibitions.length > 0 && (
        <div className="bg-white rounded-3xl p-5 shadow-soft">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-coffee-500" />
            <h4 className="text-sm font-semibold text-coffee-700">近期展会</h4>
          </div>
          <div className="space-y-3">
            {data.exhibitions.map((ex, idx) => (
              <div key={idx} className="p-3 bg-coffee-50/40 rounded-xl hover:bg-coffee-50 transition-colors">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h5 className="text-sm font-medium text-coffee-800 flex-1">{ex.name}</h5>
                  <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-700 flex-shrink-0">
                    {ex.category}
                  </span>
                </div>
                <p className="text-xs text-coffee-500 leading-relaxed mb-1">{ex.description}</p>
                <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-xs text-coffee-400">
                  <span>{ex.date}</span>
                  <span>·</span>
                  <span>{ex.location}</span>
                </div>
                {ex.sourceUrl && (
                  <a
                    href={ex.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-0.5 text-xs text-coffee-600 hover:text-coffee-900 hover:underline mt-1.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>展会官网/核实来源</span>
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 空状态 */}
      {data && data.aiEnabled && !data.metalPrices.length && !data.industryNews.length && !data.exhibitions.length && (
        <div className="bg-white rounded-3xl p-8 shadow-soft text-center">
          <p className="text-sm text-coffee-400">暂无市场数据，点击右上角"刷新数据"按钮获取</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 rounded-2xl p-4 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}
    </div>
  );
}
