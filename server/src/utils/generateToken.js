const jwt = require('jsonwebtoken')

const JWT_SECRET = process.env.JWT_SECRET || 'sales-workbench-default-jwt-secret-2025'

const generateToken = (id) => {
  return jwt.sign({ id }, JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  })
}

module.exports = generateToken