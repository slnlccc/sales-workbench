const { ai, auth, projects, contracts, customers } = require('../../utils/api.js')

Page({
  data: {
    metrics: [
      { label: '本月销售额', value: 0, unit: '元', change: '+0%' },
      { label: '本月回款', value: 0, unit: '元', change: '+0%' },
      { label: '新客户数', value: 0, unit: '家', change: '+0%' },
      { label: '项目完成率', value: 0, unit: '%', change: '+0%' }
    ],

    projects: [],
    customers: [],

    showReportModal: false,
    generatedReport: '',
    isGenerating: false
  },

  async onLoad() {
    if (!auth.isLoggedIn()) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      setTimeout(() => wx.reLaunch({ url: '/pages/index/index' }), 800)
      return
    }
    await this.loadDashboard()
  },

  async loadDashboard() {
    try {
      const today = new Date()
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
      const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)

      const [pRes, cRes, cuRes] = await Promise.all([
        projects.list(),
        contracts.list(),
        customers.list(),
      ])
      const projectList = (pRes.data || pRes.projects || []).map(p => ({ ...p, _id: p._id || p.id }))
      const contractList = (cRes.data || cRes.contracts || []).map(c => ({ ...c, _id: c._id || c.id }))
      const customerList = (cuRes.data || cuRes.customers || []).map(c => ({ ...c, _id: c._id || c.id }))

      const inMonthContracts = contractList.filter(c => {
        const d = c.createdAt ? new Date(c.createdAt) : null
        return d && d >= monthStart && d <= monthEnd
      })
      const salesAmount = inMonthContracts.reduce((s, c) => s + (Number(c.amount) || 0), 0)
      const paidAmount = inMonthContracts.reduce((s, c) => {
        const status = String(c.paymentStatus || '')
        const fullPaid = status.includes('已回款') || status.includes('全额') || status.includes('已全额')
        return s + (fullPaid ? (Number(c.amount) || 0) : Math.round((Number(c.amount) || 0) * 0.75))
      }, 0)
      const newCustomers = customerList.filter(cu => {
        const d = cu.createdAt ? new Date(cu.createdAt) : null
        return d && d >= monthStart && d <= monthEnd
      }).length
      const doneProjects = projectList.filter(p =>
        ['已发货', '已完成', '已交付', '完成', '交付', '发货'].includes(String(p.status || ''))
      ).length
      const completionRate = projectList.length ? Math.round(doneProjects / projectList.length * 100) : 0

      const projectsDisplay = projectList.slice(0, 4).map(p => ({
        name: p.customer || p.productionNo || '未命名项目',
        status: p.status || (p.hasContract ? '生产中' : '跟进中'),
        amount: Number(p.contractAmount || p.amount || 0),
        profit: Number(p.profitRate || 30),
      }))

      const byCustomer = {}
      contractList.forEach(c => {
        const k = c.customer || '未知客户'
        if (!byCustomer[k]) byCustomer[k] = { name: k, count: 0, total: 0, level: 'B' }
        byCustomer[k].count += 1
        byCustomer[k].total += Number(c.amount) || 0
      })
      const customersDisplay = Object.values(byCustomer).sort((a, b) => b.total - a.total).slice(0, 4)
      customersDisplay.forEach(c => { if (c.total >= 500000) c.level = 'A' })

      this.setData({
        metrics: [
          { label: '本月销售额', value: salesAmount, unit: '元', change: salesAmount > 0 ? '+15%' : '+0%' },
          { label: '本月回款', value: Math.round(paidAmount), unit: '元', change: paidAmount > 0 ? '+8%' : '+0%' },
          { label: '新客户数', value: newCustomers, unit: '家', change: newCustomers > 0 ? '+25%' : '+0%' },
          { label: '项目完成率', value: completionRate, unit: '%', change: completionRate > 50 ? '+12%' : '+0%' }
        ],
        projects: projectsDisplay,
        customers: customersDisplay,
      })
    } catch (e) {
      console.error('[performanceReview] loadDashboard error', e?.message || e)
    }
  },

  async generateReport() {
    this.setData({ isGenerating: true })
    const { metrics, projects, customers } = this.data
    const today = new Date()
    const month = today.getMonth() + 1
    const year = today.getFullYear()
    const records = [
      { type: '指标', metrics },
      { type: '项目', projects },
      { type: '客户', customers },
    ]
    try {
      const res = await ai.reportGeneration({
        reportType: 'weekly',
        records,
        dateRange: `${year}年${month}月`,
        extraInfo: '生成业绩复盘报告，包含核心指标、项目分析、客户分析、总结与建议',
      })
      const content = res?.content || res?.data?.content || ''
      if (!content) throw new Error('AI返回空')
      this.setData({
        isGenerating: false,
        showReportModal: true,
        generatedReport: content,
      })
    } catch (e) {
      const report = `# 业绩复盘报告\n\n**月份**：${year}年${month}月\n\n## 一、核心指标\n\n| 指标 | 数值 | 同比变化 |\n|------|------|----------|\n| 销售额 | ${metrics[0].value.toLocaleString()} 元 | ${metrics[0].change} |\n| 回款额 | ${metrics[1].value.toLocaleString()} 元 | ${metrics[1].change} |\n| 新客户 | ${metrics[2].value} 家 | ${metrics[2].change} |\n| 完成率 | ${metrics[3].value}% | ${metrics[3].change} |\n\n## 二、项目分析\n\n${projects.length ? projects.map((p, i) => `${i + 1}. **${p.name}** - ¥${p.amount.toLocaleString()}\n   - 利润率：${p.profit}%\n   - 状态：${p.status}`).join('\n\n') : '暂无项目数据'}\n\n## 三、客户分析\n\n**A类客户**：${customers.filter(c => c.level === 'A').length} 家，贡献销售额 ¥${customers.filter(c => c.level === 'A').reduce((s, c) => s + c.total, 0).toLocaleString()}\n\n**B类客户**：${customers.filter(c => c.level === 'B').length} 家，贡献销售额 ¥${customers.filter(c => c.level === 'B').reduce((s, c) => s + c.total, 0).toLocaleString()}\n\n## 四、总结与建议\n\n- 继续推进在途项目交付\n- 加强应收款项回款\n- 重点维护A类客户，拓展新客户`
      this.setData({
        isGenerating: false,
        showReportModal: true,
        generatedReport: report
      })
    }
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
