import { useState } from 'react'
import { CloudUpload, CloudDownload, RefreshCw, Cloud, CloudOff, CheckCircle, AlertCircle, Loader2, Settings, X } from 'lucide-react'
import { useCloudSync } from '@/hooks/useCloudSync'
import { cn } from '@/lib/utils'

export default function CloudSyncPanel({ compact = false }: { compact?: boolean }) {
  const { status, syncing, error, autoSync, upload, pull, refreshStatus, toggleAutoSync } = useCloudSync()
  const [showDetail, setShowDetail] = useState(false)

  const configured = status?.configured ?? false
  const lastSync = status?.lastSyncAt
    ? new Date(status.lastSyncAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
    : null

  const handleUpload = async () => {
    const result = await upload()
    if (result.success) {
      refreshStatus()
    }
  }

  const handlePull = async () => {
    const result = await pull()
    if (result.success) {
      refreshStatus()
    }
  }

  // 紧凑模式（用于侧边栏底部）
  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs px-3">
          {configured ? (
            <Cloud className="w-4 h-4 text-green-500" />
          ) : error ? (
            <AlertCircle className="w-4 h-4 text-amber-500" />
          ) : (
            <CloudOff className="w-4 h-4 text-cream-400" />
          )}
          <span className="text-cream-600">
            {configured ? '云端同步' : error ? '同步异常' : '云端未配置'}
          </span>
          {configured && lastSync && (
            <span className="text-cream-400 ml-auto">{lastSync}</span>
          )}
        </div>
        {!configured && error && (
          <div className="px-3 text-xs text-amber-600 flex items-start gap-1">
            <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {configured && (
          <div className="flex gap-1.5 px-2">
            <button
              onClick={handleUpload}
              disabled={syncing}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs rounded-lg bg-cream-100 hover:bg-cream-200 text-cream-700 transition-colors disabled:opacity-50"
            >
              {syncing ? <Loader2 className="w-3 h-3 animate-spin" /> : <CloudUpload className="w-3 h-3" />}
              上传
            </button>
            <button
              onClick={handlePull}
              disabled={syncing}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs rounded-lg bg-cream-100 hover:bg-cream-200 text-cream-700 transition-colors disabled:opacity-50"
            >
              {syncing ? <Loader2 className="w-3 h-3 animate-spin" /> : <CloudDownload className="w-3 h-3" />}
              拉取
            </button>
            <button
              onClick={() => setShowDetail(!showDetail)}
              className="p-1.5 text-xs rounded-lg bg-cream-100 hover:bg-cream-200 text-cream-700 transition-colors"
              title="同步详情"
            >
              <Settings className="w-3 h-3" />
            </button>
          </div>
        )}
        {showDetail && configured && (
          <div className="mx-2 p-3 rounded-xl bg-cream-50 border border-cream-200 space-y-2">
            <label className="flex items-center justify-between text-xs text-cream-600">
              <span>自动同步（5分钟）</span>
              <button
                onClick={toggleAutoSync}
                className={cn(
                  'relative w-8 h-4 rounded-full transition-colors',
                  autoSync ? 'bg-green-500' : 'bg-cream-300'
                )}
              >
                <span className={cn(
                  'absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform',
                  autoSync ? 'translate-x-4' : 'translate-x-0.5'
                )} />
              </button>
            </label>
            {status?.recordCount && (
              <div className="text-xs text-cream-500 space-y-0.5">
                <p>项目: {status.recordCount.projects} | 合同: {status.recordCount.contracts}</p>
                <p>日程: {status.recordCount.schedules} | 客户: {status.recordCount.customers}</p>
              </div>
            )}
            {error && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {error}
              </p>
            )}
          </div>
        )}
      </div>
    )
  }

  // 完整模式（用于独立面板）
  return (
    <div className="bg-white rounded-2xl p-5 shadow-soft border border-cream-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center',
            configured ? 'bg-green-50' : 'bg-cream-100'
          )}>
            {configured ? (
              <Cloud className="w-4 h-4 text-green-600" />
            ) : (
              <CloudOff className="w-4 h-4 text-cream-400" />
            )}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-cream-900">云端数据同步</h3>
            <p className="text-xs text-cream-500">
              {configured ? `腾讯云COS · ${status?.region || ''}` : '未配置腾讯云COS'}
            </p>
          </div>
        </div>
        {configured && (
          <span className={cn(
            'flex items-center gap-1 text-xs px-2 py-1 rounded-full',
            lastSync ? 'bg-green-50 text-green-600' : 'bg-cream-100 text-cream-500'
          )}>
            {lastSync ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
            {lastSync ? `已同步 ${lastSync}` : '尚未同步'}
          </span>
        )}
      </div>

      {configured ? (
        <>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <button
              onClick={handleUpload}
              disabled={syncing}
              className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-gradient-to-br from-cream-600 to-cream-500 text-white hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {syncing ? <Loader2 className="w-5 h-5 animate-spin" /> : <CloudUpload className="w-5 h-5" />}
              <span className="text-xs font-medium">上传到云端</span>
            </button>
            <button
              onClick={handlePull}
              disabled={syncing}
              className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-cream-100 text-cream-700 hover:bg-cream-200 transition-colors disabled:opacity-50"
            >
              {syncing ? <Loader2 className="w-5 h-5 animate-spin" /> : <CloudDownload className="w-5 h-5" />}
              <span className="text-xs font-medium">从云端拉取</span>
            </button>
          </div>

          <label className="flex items-center justify-between py-2">
            <div>
              <span className="text-sm text-cream-700">自动同步</span>
              <p className="text-xs text-cream-400">每5分钟自动上传数据</p>
            </div>
            <button
              onClick={toggleAutoSync}
              className={cn(
                'relative w-10 h-5 rounded-full transition-colors',
                autoSync ? 'bg-green-500' : 'bg-cream-300'
              )}
            >
              <span className={cn(
                'absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform',
                autoSync ? 'translate-x-5' : 'translate-x-0.5'
              )} />
            </button>
          </label>

          {status?.recordCount && (
            <div className="mt-3 p-3 rounded-xl bg-cream-50">
              <p className="text-xs text-cream-400 mb-2">云端数据统计</p>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div>
                  <p className="text-lg font-semibold text-cream-700">{status.recordCount.projects}</p>
                  <p className="text-xs text-cream-400">项目</p>
                </div>
                <div>
                  <p className="text-lg font-semibold text-cream-700">{status.recordCount.contracts}</p>
                  <p className="text-xs text-cream-400">合同</p>
                </div>
                <div>
                  <p className="text-lg font-semibold text-cream-700">{status.recordCount.schedules}</p>
                  <p className="text-xs text-cream-400">日程</p>
                </div>
                <div>
                  <p className="text-lg font-semibold text-cream-700">{status.recordCount.customers}</p>
                  <p className="text-xs text-cream-400">客户</p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-3 p-2 rounded-lg bg-red-50 text-xs text-red-500 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              {error}
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-6">
          <CloudOff className="w-10 h-10 text-cream-300 mx-auto mb-2" />
          <p className="text-sm text-cream-500 mb-1">腾讯云COS尚未配置</p>
          <p className="text-xs text-cream-400">
            请在服务器 .env 文件中配置以下参数：
          </p>
          <div className="mt-3 p-3 rounded-lg bg-cream-50 text-left text-xs text-cream-500 font-mono space-y-0.5">
            <p>TENCENT_SECRET_ID=你的密钥ID</p>
            <p>TENCENT_SECRET_KEY=你的密钥Key</p>
            <p>TENCENT_COS_BUCKET=存储桶名称</p>
            <p>TENCENT_COS_REGION=地域如ap-guangzhou</p>
          </div>
          <p className="text-xs text-cream-400 mt-2">
            获取密钥：console.cloud.tencent.com/cam/capi
          </p>
        </div>
      )}
    </div>
  )
}
