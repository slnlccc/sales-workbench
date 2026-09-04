const jwt = require('jsonwebtoken')
const User = require('../models/User')

/**
 * 标准身份验证中间件（严格模式）
 */
const protect = async (req, res, next) => {
  let token

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1]
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'sales-workbench-dev-secret-change-in-prod')
      req.user = await User.findById(decoded.id).select('-password')
      if (req.user) return next()
      return res.status(401).json({ message: '未授权，用户不存在' })
    } catch (err) {
      if (!res.headersSent) {
        return res.status(401).json({ message: '未授权，令牌无效' })
      }
      return
    }
  }

  if (!token) {
    if (!res.headersSent) {
      return res.status(401).json({ message: '未授权，没有提供令牌' })
    }
  }
}

/**
 * 宽松模式身份验证中间件（用于AI报告生成类接口）
 * 有有效token就绑定用户，无token也放行（作为匿名访问），避免冷启动内存DB清空导致401
 */
const protectOrGuest = async (req, res, next) => {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      const token = req.headers.authorization.split(' ')[1]
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'sales-workbench-dev-secret-change-in-prod')
      const user = await User.findById(decoded.id).select('-password')
      if (user) req.user = user
    } catch (err) {
      // token无效就忽略，继续以匿名访问
    }
  }
  // 给匿名用户一个默认占位对象，避免后续代码崩溃
  if (!req.user) {
    req.user = { _id: 'guest', username: '访客', isGuest: true }
  }
  next()
}

module.exports = { protect, protectOrGuest }