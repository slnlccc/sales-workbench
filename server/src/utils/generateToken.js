const jwt = require('jsonwebtoken')

const JWT_SECRET = process.env.JWT_SECRET || 'sales-workbench-default-jwt-secret-2025'

// 默认 30 天，比之前 7 天长，减少过期带来的打扰
const DEFAULT_EXPIRES_IN = '30d'

const generateToken = (id) => {
  return jwt.sign({ id }, JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || DEFAULT_EXPIRES_IN
  })
}

// 解码 token（不验证签名），用于检查剩余有效期
const decodeToken = (token) => {
  try {
    return jwt.decode(token)
  } catch {
    return null
  }
}

// 验证 token 是否还有效
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch {
    return null
  }
}

module.exports = { generateToken, decodeToken, verifyToken, JWT_SECRET }