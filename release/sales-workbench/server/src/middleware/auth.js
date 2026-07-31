const jwt = require('jsonwebtoken')
const User = require('../models/User')

const protect = async (req, res, next) => {
  let token

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1]
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      req.user = await User.findById(decoded.id).select('-password')
      next()
    } catch (err) {
      res.status(401).json({ message: '未授权，令牌无效' })
    }
  }

  if (!token) {
    res.status(401).json({ message: '未授权，没有提供令牌' })
  }
}

module.exports = { protect }