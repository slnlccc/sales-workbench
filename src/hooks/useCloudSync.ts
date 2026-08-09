import { useState, useEffect, useCallback, useRef } from 'react'
import { syncApi } from '@/services/api'
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

const SYNC_INTERVAL = 5 * 60 * 1000 // 5分钟自动同步

const getAutoSyncKey = (userId: string | null | undefined) => {
  const ns = userId ? `u_${userId}` : 'guest'
  return `sw_${ns}_auto_sync`
}

export function useCloudSync() {
  const { user } = useAuth()
  const [status, setStatus] = useState<SyncStatus | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [autoSync, setAutoSync] = useState(() => {
    return localStorage.getItem(getAutoSyncKey(user?._id)) === 'true'
  })
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // 当切换用户时重新读取该用户的自动同步开关偏好
  useEffect(() => {
    setAutoSync(localStorage.getItem(getAutoSyncKey(user?._id)) === 'true')
  }, [user?._id])

  const refreshStatus = useCallback(async () => {
    try {
      const res = await syncApi.status()
      setStatus(res)
      setError(null)
    } catch {
      // 后端未启动时静默处理
    }
  }, [])

  const upload = useCallback(async (): Promise<SyncResult> => {
    setSyncing(true)
    setError(null)
    try {
      const res = await syncApi.upload()
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

  const pull = useCallback(async (): Promise<SyncResult> => {
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

  const toggleAutoSync = useCallback(() => {
    const key = getAutoSyncKey(user?._id)
    const newValue = !autoSync
    setAutoSync(newValue)
    localStorage.setItem(key, String(newValue))
  }, [autoSync, user?._id])

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

  useEffect(() => {
    refreshStatus()
  }, [refreshStatus])

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
