App({
  onLaunch() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
      wx.showModal({
        title: '提示',
        content: '当前微信版本过低，无法使用云能力。请升级到最新微信版本后重试。',
        showCancel: false
      })
    } else {
      wx.cloud.init({
        env: '',
        traceUser: true,
      })
    }

    // 获取用户 openid
    this.getOpenid()
  },

  globalData: {
    openid: '',
    userInfo: null,
    systemInfo: null
  },

  getOpenid() {
    wx.cloud.callFunction({
      name: 'login',
      success: res => {
        this.globalData.openid = res.result.openid
        console.log('openid:', res.result.openid)
      },
      fail: err => {
        console.error('获取 openid 失败:', err)
      }
    })
  }
})
