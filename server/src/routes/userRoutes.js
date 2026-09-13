const express = require('express')
const router = express.Router()
const { register, login, getProfile, updateProfile, refreshToken } = require('../controllers/userController')
const { protect } = require('../middleware/auth')

router.post('/register', register)
router.post('/login', login)
// 刷新 token：不需要 protect 中间件，因为就是用来给过期 token 续期的
router.post('/refresh-token', refreshToken)
router.get('/profile', protect, getProfile)
router.put('/profile', protect, updateProfile)

module.exports = router