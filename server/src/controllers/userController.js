const User = require('../models/User')
const { generateToken, verifyToken } = require('../utils/generateToken')
const cloudSync = require('../services/cloudSyncService')

exports.register = async (req, res) => {
  try {
    const { username, email, password, name } = req.body

    const userExists = await User.findOne({ $or: [{ username }, { email }] })
    if (userExists) {
      return res.status(400).json({ message: '用户名或邮箱已存在' })
    }

    const user = await User.create({ username, email, password, name })

    // 新用户没有云端数据，无需自动同步
    res.status(201).json({
      _id: user._id,
      username: user.username,
      email: user.email,
      name: user.name,
      token: generateToken(user._id)
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body

    const user = await User.findOne({ username })
    if (!user) {
      return res.status(401).json({ message: '用户名或密码错误' })
    }

    const isMatch = await user.matchPassword(password)
    if (!isMatch) {
      return res.status(401).json({ message: '用户名或密码错误' })
    }

    user.lastLogin = Date.now()
    await user.save()

    // 登录后自动从云端拉取数据（解决内存DB冷启动丢数据问题）
    // 异步执行，不阻塞登录响应
    cloudSync.autoSync(user._id.toString(), user.username).catch(err => {
      console.warn('[login] 自动同步异常:', err.message)
    })

    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      name: user.name,
      token: generateToken(user._id)
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

exports.getProfile = async (req, res) => {
  res.json({
    _id: req.user._id,
    username: req.user.username,
    email: req.user.email,
    name: req.user.name,
    createdAt: req.user.createdAt,
    lastLogin: req.user.lastLogin
  })
}

exports.updateProfile = async (req, res) => {
  try {
    const { name, email } = req.body
    const user = await User.findById(req.user._id)

    if (user) {
      user.name = name || user.name
      user.email = email || user.email
      const updatedUser = await user.save()

      res.json({
        _id: updatedUser._id,
        username: updatedUser.username,
        email: updatedUser.email,
        name: updatedUser.name
      })
    } else {
      res.status(404).json({ message: '用户不存在' })
    }
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

/**
 * 自动刷新 token：前端在 token 过期前或收到 401 时调用此接口获取新 token。
 * 只要旧 token 还没过期（或刚过期但仍在可容忍窗口内），就可以换到新 token。
 * 设计为支持"静默续期"，让用户几乎感知不到 token 过期。
 */
exports.refreshToken = async (req, res) => {
  try {
    const { token: oldToken } = req.body
    if (!oldToken) {
      return res.status(401).json({ message: '没有提供 token' })
    }

    // 先尝试正常验证
    let decoded = verifyToken(oldToken)

    if (!decoded) {
      // token 已过期，允许最多 24 小时的"宽限期"（grace period）
      // 用 decodeToken 拿到原始 payload，然后手动检查 exp
      const { decodeToken } = require('../utils/generateToken')
      const payload = decodeToken(oldToken)
      if (!payload || !payload.id || !payload.exp) {
        return res.status(401).json({ message: 'token 无效，请重新登录' })
      }
      const now = Math.floor(Date.now() / 1000)
      if (now - payload.exp > 24 * 60 * 60) {
        return res.status(401).json({ message: 'token 过期太久，请重新登录' })
      }
      decoded = payload // 用解码后的 payload 继续
    }

    const user = await User.findById(decoded.id).select('-password')
    if (!user) {
      return res.status(401).json({ message: '用户不存在' })
    }

    const newToken = generateToken(user._id)

    res.json({
      token: newToken,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        name: user.name,
      }
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}