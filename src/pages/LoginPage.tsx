import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useNavigate, useLocation } from 'react-router-dom'

export default function LoginPage() {
  const [isRegister, setIsRegister] = useState(false)
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  
  const { login, register, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  
  const from = (location.state as any)?.from?.pathname || '/voice-workbench'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!username || !password) {
      setError('请填写用户名和密码')
      return
    }
    
    try {
      if (isRegister) {
        if (!email) {
          setError('请填写邮箱')
          return
        }
        await register(username, email, password, name)
      } else {
        await login(username, password)
      }
      navigate(from, { replace: true })
    } catch (err: any) {
      setError(err.message)
    }
  }

  return (
    <div className="min-h-screen bg-cream-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-cream-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">📋</span>
          </div>
          <h1 className="text-3xl font-bold text-cream-800">销售工作台</h1>
          <p className="text-cream-500 mt-2">数字化销售全流程管理</p>
        </div>

        <form onSubmit={handleSubmit}>
          {isRegister && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-cream-700 mb-2">邮箱</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-cream-300 bg-cream-50 focus:border-cream-600 focus:outline-none transition-colors"
                placeholder="请输入邮箱"
              />
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-cream-700 mb-2">用户名</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-cream-300 bg-cream-50 focus:border-cream-600 focus:outline-none transition-colors"
              placeholder="请输入用户名"
            />
          </div>

          {isRegister && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-cream-700 mb-2">姓名</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-cream-300 bg-cream-50 focus:border-cream-600 focus:outline-none transition-colors"
                placeholder="请输入姓名（可选）"
              />
            </div>
          )}

          <div className="mb-6">
            <label className="block text-sm font-medium text-cream-700 mb-2">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-cream-300 bg-cream-50 focus:border-cream-600 focus:outline-none transition-colors"
              placeholder="请输入密码"
            />
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-cream-600 text-white rounded-xl font-semibold text-lg hover:bg-cream-700 transition-colors disabled:opacity-50"
          >
            {loading ? '加载中...' : (isRegister ? '注册' : '登录')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsRegister(!isRegister)}
            className="text-cream-600 font-medium hover:text-cream-800 transition-colors"
          >
            {isRegister ? '已有账号？去登录' : '还没有账号？去注册'}
          </button>
        </div>

        <div className="mt-8 pt-6 border-t border-cream-300 text-center">
          <p className="text-xs text-cream-500">
            默认测试账号：admin / admin123
          </p>
        </div>
      </div>
    </div>
  )
}