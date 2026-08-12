Page({
  data: {
    metrics: [
      { label: '本月销售额', value: 1280000, unit: '元', change: '+15%' },
      { label: '本月回款', value: 960000, unit: '元', change: '+8%' },
      { label: '新客户数', value: 5, unit: '家', change: '+25%' },
      { label: '项目完成率', value: 82, unit: '%', change: '+12%' }
    ],

    projects: [
      { name: '上海航天环件', status: '已发货', amount: 350000, profit: 28 },
      { name: '北京航空叶片', status: '已发货', amount: 280000, profit: 32 },
      { name: '江苏锻造毛坯', status: '生产中', amount: 450000, profit: 25 },
      { name: '西安航空涡轮盘', status: '质检中', amount: 200000, profit: 35 }
    ],

    customers: [
      { name: '上海航天', level: 'A', count: 3, total: 980000 },
      { name: '北京航空', level: 'A', count: 2, total: 560000 },
      { name: '江苏锻造', level: 'B', count: 4, total: 820000 },
      { name: '西安航空', level: 'A', count: 1, total: 200000 }
    ],

    showReportModal: false,
    generatedReport: '',
    isGenerating: false
  },

  onLoad() {},

  generateReport() {
    this.setData({ isGenerating: true })
    setTimeout(() => {
      const today = new Date()
      const month = today.getMonth() + 1
      const year = today.getFullYear()

      const report = `# 业绩复盘报告\n\n**月份**：${year}年${month}月\n\n## 一、核心指标\n\n| 指标 | 数值 | 同比变化 |\n|------|------|----------|\n| 销售额 | ${this.data.metrics[0].value.toLocaleString()} 元 | ${this.data.metrics[0].change} |\n| 回款额 | ${this.data.metrics[1].value.toLocaleString()} 元 | ${this.data.metrics[1].change} |\n| 新客户 | ${this.data.metrics[2].value} 家 | ${this.data.metrics[2].change} |\n| 完成率 | ${this.data.metrics[3].value}% | ${this.data.metrics[3].change} |\n\n## 二、项目分析\n\n### 已完成项目\n\n1. **上海航天环件** - ¥${this.data.projects[0].amount.toLocaleString()}\n   - 利润率：${this.data.projects[0].profit}%\n   - 状态：${this.data.projects[0].status}\n\n2. **北京航空叶片** - ¥${this.data.projects[1].amount.toLocaleString()}\n   - 利润率：${this.data.projects[1].profit}%\n   - 状态：${this.data.projects[1].status}\n\n### 进行中项目\n\n1. **江苏锻造毛坯** - ¥${this.data.projects[2].amount.toLocaleString()}\n   - 预计利润率：${this.data.projects[2].profit}%\n   - 当前状态：${this.data.projects[2].status}\n\n## 三、客户分析\n\n**A类客户**：${this.data.customers.filter(c => c.level === 'A').length} 家，贡献销售额 ¥${this.data.customers.filter(c => c.level === 'A').reduce((s, c) => s + c.total, 0).toLocaleString()}\n\n**B类客户**：${this.data.customers.filter(c => c.level === 'B').length} 家，贡献销售额 ¥${this.data.customers.filter(c => c.level === 'B').reduce((s, c) => s + c.total, 0).toLocaleString()}\n\n## 四、总结与建议\n\n### 亮点\n\n1. 销售额同比增长 ${this.data.metrics[0].change}，超额完成月度目标\n2. 新客户开发取得突破，本月新增 ${this.data.metrics[2].value} 家\n3. 项目完成率提升至 ${this.data.metrics[3].value}%\n\n### 不足\n\n1. 回款进度略慢，需加强催款力度\n2. 部分项目利润率偏低，需优化成本控制\n\n### 下月计划\n\n1. 重点跟进江苏锻造项目，确保按时交付\n2. 深化与西安航空的合作关系\n3. 开发2-3家新客户`

      this.setData({
        isGenerating: false,
        showReportModal: true,
        generatedReport: report
      })
    }, 2000)
  },

  closeModal() {
    this.setData({ showReportModal: false })
  },

  copyReport() {
    wx.setClipboardData({
      data: this.data.generatedReport,
      success: () => {
        wx.showToast({ title: '已复制', icon: 'success' })
      }
    })
  },

  stopPropagation() {}
})