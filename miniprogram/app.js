// 小程序全局初始化
// 从 v2.0 开始，不再依赖微信云开发（wx.cloud），
// 改为直接调用 Railway 后端 REST API，与电脑端（Web）共享同一个 MongoDB 数据库 + COS 云同步。
// 用户在小程序端与电脑端使用相同的账号密码登录，所有数据互通。

const { auth } = require('./utils/api.js')

App({
  onLaunch() {
    // 无操作（后续可增加自动刷新token、拉取云端数据等）
    const user = auth.getUser()
    const token = auth.getToken()
    console.log('[App] 启动：已登录', !!(user && token), user?.username || '')
  },

  globalData: {
    // 已用 auth.getUser/auth.getToken 替代，保留兼容读取
    get token() { return auth.getToken() },
    get userInfo() { return auth.getUser() },
  },
})
