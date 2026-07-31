Page({
  data: {
    modules: [
      { title: '项目管家', desc: '生产项目+合同管理', icon: '📋', page: '/pages/projectManager/index', color: '#6F4E37' },
      { title: '合同管理', desc: '回款状态跟踪', icon: '📄', page: '/pages/contractManager/index', color: '#8B6F47' },
      { title: '语音工作台', desc: '语音录入+AI分析', icon: '🎙️', page: '/pages/voiceWorkbench/index', color: '#A08B6F' },
      { title: '日程日历', desc: '工作事项闭环', icon: '📅', page: '/pages/calendar/index', color: '#6F4E37' },
      { title: '市情雷达', desc: '行业情报+原材料', icon: '📡', page: '/pages/marketRadar/index', color: '#8B6F47' },
      { title: '客户管家', desc: '客户画像+进度', icon: '👥', page: '/pages/customerManager/index', color: '#A08B6F' },
      { title: '报告生成', desc: '周报+出差报告', icon: '📝', page: '/pages/report/index', color: '#6F4E37' },
      { title: '业绩复盘', desc: '销售数据复盘', icon: '📊', page: '/pages/performanceReview/index', color: '#8B6F47' },
    ]
  },

  onLoad() {
    // 页面加载时检查云开发环境
    if (!wx.cloud) {
      wx.showModal({
        title: '提示',
        content: '请使用最新版微信并开启云开发',
        showCancel: false
      })
    }
  },

  goPage(e) {
    const { page } = e.currentTarget.dataset
    if (!page) {
      wx.showToast({ title: '功能开发中', icon: 'none' })
      return
    }
    wx.navigateTo({ url: page })
  }
})
