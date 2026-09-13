import { useState, useEffect, useCallback, useRef } from 'react'
import { syncApi, collectLocalStorageData } from '@/services/api'
import { useAuth } from '@/context/AuthContext'

interface SyncStatus {
  configured: boolean
  lastSyncAt: string | null
  recordCount: { projects: number; contracts: number; schedules: number; customers: number } | null
  message: string
  region?: string
}

interface SyncResult {
  success: boolean
  message: string
  lastSyncAt?: string
  recordCount?: { projects: number; contracts: number; schedules: number; customers: number }
  imported?: { projects: number; contracts: number; schedules: number; customers: number }
}

const SYNC_INTERVAL = 5 * 60 * 1000 // 5分钟周期性同步（兜底）
const AUTO_SYNC_DEBOUNCE = 3 * 1000  // 数据变更后防抖 3 秒再上传

// 判断当前是否为本地降级登录（token 非后端 JWT），此时云同步不可用
const isLocalToken = () => {
  const token = localStorage.getItem('token')
  return !token || token.startsWith('local.')
}

export function useCloudSync() {
  const { token } = useAuth()
  const [status, setStatus] = useState<SyncStatus | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // 默认开启自动同步（新用户无需手动打开）
  const [autoSync, setAutoSync] = useState<boolean>(() => {
    const stored = localStorage.getItem('sw_auto_sync')
    return stored === null ? true : stored === 'true'
  })
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // 请求序列号：防止过期请求覆盖新结果（竞态条件）
  const requestSeqRef = useRef(0)
  // 数据变更防抖定时器
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 获取同步状态（带竞态保护）
  const refreshStatus = useCallback(async () => {
    const mySeq = ++requestSeqRef.current

    // 本地降级登录时不调用云同步接口
    if (isLocalToken()) {
      if (mySeq === requestSeqRef.current) {
        setStatus(null)
        setError('当前为本地模式，未连接云端同步服务')
      }
      return
    }

    try {
      const res = await syncApi.status()
      // 只有最新请求才能应用结果
      if (mySeq === requestSeqRef.current) {
        setStatus(res)
        setError(null)
      }
    } catch (err: any) {
      if (mySeq !== requestSeqRef.current) return // 已过期，忽略
      const msg = err?.message || ''
      if (msg.includes('未授权') || msg.includes('401') || msg.includes('令牌') || msg.includes('用户不存在')) {
        setError('登录已过期，请重新登录')
      } else {
        setError('无法连接同步服务：' + (msg || '网络错误'))
      }
    }
  }, [token])

  // 上传数据到云端（从 localStorage 采集，前端真实数据源）
  const upload = useCallback(async (): Promise<SyncResult> => {
    if (isLocalToken()) {
      return { success: false, message: '本地模式下无法使用云端同步' }
    }
    setSyncing(true)
    setError(null)
    try {
      // 收集 localStorage 中的业务数据，直接上传到云端
      const localData = collectLocalStorageData()
      const res = await syncApi.uploadLocal(localData)
      await refreshStatus()
      return { success: true, message: res.message || '同步成功', lastSyncAt: res.lastSyncAt, recordCount: res.recordCount }
    } catch (err: any) {
      const msg = err.message || '同步失败'
      setError(msg)
      return { success: false, message: msg }
    } finally {
      setSyncing(false)
    }
  }, [refreshStatus])

  // 从云端拉取数据
  const pull = useCallback(async (): Promise<SyncResult> => {
    if (isLocalToken()) {
      return { success: false, message: '本地模式下无法使用云端同步' }
    }
    setSyncing(true)
    setError(null)
    try {
      const res = await syncApi.pull()
      await refreshStatus()
      return {
        success: true,
        message: res.message || '拉取成功',
        imported: res.imported,
      }
    } catch (err: any) {
      const msg = err.message || '拉取失败'
      setError(msg)
      return { success: false, message: msg }
    } finally {
      setSyncing(false)
    }
  }, [refreshStatus])

  // 切换自动同步
  const toggleAutoSync = useCallback(() => {
    const newValue = !autoSync
    setAutoSync(newValue)
    localStorage.setItem('sw_auto_sync', String(newValue))
  }, [autoSync])

  // 自动同步定时器
  useEffect(() => {
    if (autoSync && status?.configured) {
      timerRef.current = setInterval(() => {
        upload()
      }, SYNC_INTERVAL)
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [autoSync, status?.configured, upload])

  // token 变化时重置所有状态并重新获取（登录/登出都会触发）
  useEffect(() => {
    // 取消所有正在进行的旧请求
    requestSeqRef.current++
    if (!token) {
      setStatus(null)
      setError(null)
      return
    }
    refreshStatus()
  }, [token, refreshStatus])

  // ===== 实时自动上传：监听 data:changed 事件，防抖 3 秒后上传 =====
  useEffect(() => {
    if (!autoSync || !token || isLocalToken()) return

    const handler = () => {
      // 防抖：如果 3 秒内又有新变更，重新计时
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        // 如果正在手动同步中，跳过这次自动上传
        if (syncing) return
        upload().catch(() => { /* 静默失败，错误已通过状态面板显示 */ })
      }, AUTO_SYNC_DEBOUNCE)
    }

    window.addEventListener('data:changed', handler)
    return () => {
      window.removeEventListener('data:changed', handler)
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [autoSync, token, syncing, upload])

  return {
    status,
    syncing,
    error,
    autoSync,
    upload,
    pull,
    refreshStatus,
    toggleAutoSync,
  }
}
