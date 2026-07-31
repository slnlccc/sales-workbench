const User = require('../models/User')
const generateToken = require('../utils/generateToken')

exports.register = async (req, res) => {
  try {
    const { username, email, password, name } = req.body

    const userExists = await User.findOne({ $or: [{ username }, { email }] })
    if (userExists) {
      return res.status(400).json({ message: '用户名或邮箱已存在' })
    }

    const user = await User.create({ username, email, password, name })

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