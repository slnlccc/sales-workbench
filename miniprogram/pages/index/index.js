const { auth } = require('../../utils/api.js')

Page({
  data: {
    modules: [
      { title: '项目管家', desc: '生产项目+合同管理', icon: '📋', page: '/pages/projectManager/index', color: '#6F4E37' },
      { title: '合同管理', desc: '回款状态跟踪', icon: '📄', page: '/pages/contractManager/index', color: '#8B6F47' },
      { title: '语音工作台', desc: '语音录入+AI分析', icon: '🎙️', page: '/pages/voiceWorkbench/index', color: '#A08B6F' },
      { title: '日程日历', desc: '工作事项闭环', icon: '📅', page: '/pages/calendar/index', color: '#6F4E37' },
      { title: '市情雷达', desc: '行业情报+原材料', icon: '📡', page: '/pages/marketRadar/index', color: '#8B6F47' },
      { title: '客户管家', desc: '客户画像+进度', icon: '👥', page: '/pages/customerManager/index', color: '#A08B6F' },
      { title: '出差报告', desc: 'AI自动生成', icon: '✈️', page: '/pages/travelReport/index', color: '#6F4E37' },
      { title: '周报生成', desc: '工作周报AI生成', icon: '📝', page: '/pages/report/index', color: '#8B6F47' },
      { title: '业绩复盘', desc: '销售数据复盘', icon: '📊', page: '/pages/performanceReview/index', color: '#A08B6F' },
    ],
    showLogin: false,
    showRegister: false,
    username: '',
    password: '',
    regUsername: '',
    regPassword: '',
    regName: '',
    userInfo: null,
  },

  onLoad() {
    this.checkLogin()
  },

  onShow() {
    this.checkLogin()
  },

  checkLogin() {
    const user = auth.getUser()
    const hasToken = auth.isLoggedIn()
    if (user && hasToken) {
      this.setData({ userInfo: user, showLogin: false, showRegister: false })
    } else {
      this.setData({ showLogin: true, userInfo: null })
    }
  },

  async onLogin() {
    const { username, password } = this.data
    if (!username || !password) {
      wx.showToast({ title: '请输入用户名和密码', icon: 'none' })
      return
    }
    wx.showLoading({ title: '登录中' })
    try {
      const data = await auth.login(username, password)
      wx.hideLoading()
      wx.showToast({ title: '登录成功', icon: 'success' })
      this.setData({ userInfo: data.user, showLogin: false, username: '', password: '' })
    } catch (e) {
      wx.hideLoading()
      // toast在request里已弹出
    }
  },

  onUsernameInput(e) { this.setData({ username: e.detail.value }) },
  onPasswordInput(e) { this.setData({ password: e.detail.value }) },
  onRegUserInput(e) { this.setData({ regUsername: e.detail.value }) },
  onRegPwdInput(e) { this.setData({ regPassword: e.detail.value }) },
  onRegNameInput(e) { this.setData({ regName: e.detail.value }) },

  openRegister() { this.setData({ showLogin: false, showRegister: true, username: '', password: '' }) },
  openLogin() { this.setData({ showRegister: false, showLogin: true, regUsername: '', regPassword: '', regName: '' }) },

  async onRegister() {
    const { regUsername, regPassword, regName } = this.data
    if (!regUsername || !regPassword) {
      wx.showToast({ title: '请输入用户名和密码', icon: 'none' })
      return
    }
    wx.showLoading({ title: '注册中' })
    try {
      await auth.register({ username: regUsername, password: regPassword, name: regName || regUsername })
      wx.hideLoading()
      wx.showToast({ title: '注册成功，请登录', icon: 'success' })
      this.setData({ showRegister: false, showLogin: true, username: regUsername, regUsername: '', regPassword: '', regName: '' })
    } catch (e) {
      wx.hideLoading()
    }
  },

  onLogout() {
    wx.showModal({
      title: '确认退出登录？',
      success: (res) => {
        if (res.confirm) {
          auth.logout()
          this.setData({ userInfo: null, showLogin: true })
          wx.showToast({ title: '已退出', icon: 'none' })
        }
      }
    })
  },

  goPage(e) {
    if (!auth.isLoggedIn()) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      this.setData({ showLogin: true })
      return
    }
    const { page } = e.currentTarget.dataset
    if (!page) {
      wx.showToast({ title: '功能开发中', icon: 'none' })
      return
    }
    wx.navigateTo({ url: page })
  }
})
