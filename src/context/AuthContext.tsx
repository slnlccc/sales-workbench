import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useWorkbenchStore } from '@/store/useWorkbenchStore'

interface User {
  _id: string
  username: string
  email: string
  name: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  login: (username: string, password: string) => Promise<void>
  register: (username: string, email: string, password: string, name?: string) => Promise<void>
  logout: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// ===== 本地认证系统（兜底机制，后端不可用时使用）=====
interface LocalUser {
  _id: string
  username: string
  email: string
  name: string
  password: string
}

const LOCAL_USERS_KEY = 'sw_local_users'
const LOCAL_TOKEN_KEY = 'token'

const getLocalUsers = (): LocalUser[] => {
  try {
    const raw = localStorage.getItem(LOCAL_USERS_KEY)
    if (!raw) {
      const defaultUsers: LocalUser[] = [
        {
          _id: 'local-admin',
          username: 'admin',
          email: 'admin@example.com',
          name: '管理员',
          password: 'admin123',
        },
      ]
      localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(defaultUsers))
      return defaultUsers
    }
    return JSON.parse(raw)
  } catch {
    return []
  }
}

const saveLocalUser = (user: LocalUser) => {
  const users = getLocalUsers()
  users.push(user)
  localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users))
}

const generateLocalToken = (userId: string): string => {
  return btoa(`local.${userId}.${Date.now()}`)
}

const localLogin = (username: string, password: string): User => {
  const users = getLocalUsers()
  const found = users.find(u => u.username === username && u.password === password)
  if (!found) {
    throw new Error('用户名或密码错误')
  }
  return {
    _id: found._id,
    username: found.username,
    email: found.email,
    name: found.name,
  }
}

const localRegister = (username: string, email: string, password: string, name?: string): User => {
  const users = getLocalUsers()
  if (users.find(u => u.username === username)) {
    throw new Error('用户名已存在')
  }
  if (users.find(u => u.email === email)) {
    throw new Error('邮箱已存在')
  }
  const newUser: LocalUser = {
    _id: `local-${Date.now()}`,
    username,
    email,
    name: name || username,
    password,
  }
  saveLocalUser(newUser)
  return {
    _id: newUser._id,
    username: newUser.username,
    email: newUser.email,
    name: newUser.name,
  }
}

const tryBackendLogin = async (username: string, password: string): Promise<{ user: User; token: string } | null> => {
  try {
    const response = await fetch('/api/users/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    if (!response.ok) return null
    const data = await response.json()
    if (!data.token) return null
    return {
      user: { _id: data._id, username: data.username, email: data.email, name: data.name },
      token: data.token,
    }
  } catch {
    return null
  }
}

const tryBackendRegister = async (username: string, email: string, password: string, name?: string): Promise<{ user: User; token: string } | null> => {
  try {
    const response = await fetch('/api/users/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password, name }),
    })
    if (!response.ok) return null
    const data = await response.json()
    if (!data.token) return null
    return {
      user: { _id: data._id, username: data.username, email: data.email, name: data.name },
      token: data.token,
    }
  } catch {
    return null
  }
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(localStorage.getItem(LOCAL_TOKEN_KEY))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem(LOCAL_TOKEN_KEY)
      const storedUser = localStorage.getItem('sw_current_user')
      if (storedToken && storedUser) {
        try {
          const parsed = JSON.parse(storedUser)
          setUser(parsed)
          setToken(storedToken)
          // 模块初始化时 bootUserId 已读取过，这里主动再调一次确保命名空间完全切换
          useWorkbenchStore.getState().setActiveUser(parsed._id)
        } catch {
          localStorage.removeItem(LOCAL_TOKEN_KEY)
          localStorage.removeItem('sw_current_user')
          setToken(null)
          useWorkbenchStore.getState().setActiveUser(null)
        }
      } else {
        useWorkbenchStore.getState().setActiveUser(null)
      }
      setLoading(false)
    }
    initAuth()
  }, [])

  const login = async (username: string, password: string) => {
    setLoading(true)
    try {
      const backendResult = await tryBackendLogin(username, password)
      let loggedInUser: User
      let newToken: string

      if (backendResult) {
        loggedInUser = backendResult.user
        newToken = backendResult.token
      } else {
        loggedInUser = localLogin(username, password)
        newToken = generateLocalToken(loggedInUser._id)
      }

      localStorage.setItem(LOCAL_TOKEN_KEY, newToken)
      localStorage.setItem('sw_current_user', JSON.stringify(loggedInUser))
      setUser(loggedInUser)
      setToken(newToken)
      useWorkbenchStore.getState().setActiveUser(loggedInUser._id)
    } finally {
      setLoading(false)
    }
  }

  const register = async (username: string, email: string, password: string, name?: string) => {
    setLoading(true)
    try {
      const backendResult = await tryBackendRegister(username, email, password, name)
      let registeredUser: User
      let newToken: string

      if (backendResult) {
        registeredUser = backendResult.user
        newToken = backendResult.token
      } else {
        registeredUser = localRegister(username, email, password, name)
        newToken = generateLocalToken(registeredUser._id)
      }

      localStorage.setItem(LOCAL_TOKEN_KEY, newToken)
      localStorage.setItem('sw_current_user', JSON.stringify(registeredUser))
      setUser(registeredUser)
      setToken(newToken)
      useWorkbenchStore.getState().setActiveUser(registeredUser._id)
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    localStorage.removeItem(LOCAL_TOKEN_KEY)
    localStorage.removeItem('sw_current_user')
    setUser(null)
    setToken(null)
    useWorkbenchStore.getState().setActiveUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
