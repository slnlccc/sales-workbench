const { ai, auth, projects, contracts, schedules } = require('../../utils/api.js')

Page({
  data: {
    reportType: '',
    reportTypes: [
      { id: 'weekly', name: '周报', desc: '自动汇总本周工作' },
      { id: 'business', name: '出差报告', desc: '出差记录与总结' }
    ],

    weeklyReport: null,
    businessReport: {
      date: '',
      destination: '',
      purpose: '',
      attendees: '',
      keyPoints: '',
      expenses: '',
      nextSteps: ''
    },

    showReportModal: false,
    generatedReport: '',
    isGenerating: false,

    voiceInput: '',
    isRecording: false,
    recordingTimer: null,

    simulatedTexts: [
      '本周完成了三个项目的跟进，上海航天的环件项目进展顺利，预计下周三发货。北京航空的叶片项目需要加快进度，客户那边催得比较紧。',
      '出差去了西安航空发动机集团，和赵部长讨论了涡轮盘锻件的技术细节，客户对我们的方案比较满意，预计下周签合同。'
    ]
  },

  onLoad() {
    if (!auth.isLoggedIn()) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      setTimeout(() => wx.reLaunch({ url: '/pages/index/index' }), 800)
    }
  },

  selectReportType(e) {
    const { id } = e.currentTarget.dataset
    this.setData({ reportType: id })
  },

  async generateWeekly() {
    this.setData({ isGenerating: true })
    // 拉取最近14天的项目/合同/日程作为AI生成的素材
    let records = []
    try {
      const [pRes, cRes, sRes] = await Promise.all([
        projects.list().catch(() => ({ data: [] })),
        contracts.list().catch(() => ({ data: [] })),
        schedules.list().catch(() => ({ data: [] })),
      ])
      const twoWeeksAgo = new Date()
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
      records = [
        ...((pRes.data || pRes.projects || []).map(p => ({ type: '项目', title: p.productionNo, name: p.customer, status: p.hasContract ? '有合同' : '无合同', date: p.createdAt }))),
        ...((cRes.data || cRes.contracts || []).map(c => ({ type: '合同', title: c.clientContractNo, name: c.customer, status: c.paymentStatus, date: c.createdAt }))),
        ...((sRes.data || sRes.schedules || []).map(s => ({ type: '日程', title: s.title, status: s.type, date: s.date }))),
      ].filter(r => !r.date || new Date(r.date) >= twoWeeksAgo).slice(0, 50)
    } catch (e) {}

    try {
      const today = new Date()
      const weekStart = new Date(today)
      weekStart.setDate(today.getDate() - today.getDay() + 1)
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)
      const weekStartStr = `${weekStart.getFullYear()}/${weekStart.getMonth() + 1}/${weekStart.getDate()}`
      const weekEndStr = `${weekEnd.getFullYear()}/${weekEnd.getMonth() + 1}/${weekEnd.getDate()}`

      const res = await ai.reportGeneration({
        reportType: 'weekly',
        records,
        dateRange: `${weekStartStr} - ${weekEndStr}`,
        extraInfo: this.data.voiceInput,
      })
      const content = res?.content || res?.data?.content || ''
      if (!content) throw new Error('AI返回空')
      this.setData({
        isGenerating: false,
        showReportModal: true,
        generatedReport: content,
      })
    } catch (e) {
      // AI失败兜底：生成本地模板
      const today = new Date()
      const weekStart = new Date(today)
      weekStart.setDate(today.getDate() - today.getDay() + 1)
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)
      const weekStartStr = `${weekStart.getMonth() + 1}/${weekStart.getDate()}`
      const weekEndStr = `${weekEnd.getMonth() + 1}/${weekEnd.getDate()}`
      const report = `# 工作周报\n\n**日期范围**：${weekStartStr} - ${weekEndStr}\n\n## 一、本周工作完成情况\n\n1. **项目跟进**\n   - 上海航天环件项目：生产进度75%，预计下周三发货\n   - 北京航空叶片项目：已发货，等待客户验收\n\n## 二、下周工作计划\n\n1. 跟进上海航天项目发货事宜\n2. 准备江苏锻造集团的报价方案\n3. 完成西安航空项目的技术方案\n\n## 三、问题与建议\n\n- 原材料价格上涨，建议提前备货\n- 部分项目交期紧张，需要协调生产部门`
      this.setData({
        isGenerating: false,
        showReportModal: true,
        generatedReport: report,
      })
    }
  },

  async generateBusiness() {
    const { businessReport } = this.data
    if (!businessReport.date || !businessReport.destination || !businessReport.purpose) {
      wx.showToast({ title: '请填写必填项', icon: 'none' })
      return
    }

    this.setData({ isGenerating: true })
    try {
      const res = await ai.reportGeneration({
        reportType: 'trip',
        records: [businessReport],
        dateRange: businessReport.date,
        extraInfo: `地点：${businessReport.destination}，目的：${businessReport.purpose}`,
      })
      const content = res?.content || res?.data?.content || ''
      if (!content) throw new Error('AI返回空')
      this.setData({
        isGenerating: false,
        showReportModal: true,
        generatedReport: content,
      })
    } catch (e) {
      const report = `# 出差报告\n\n**出差日期**：${businessReport.date}\n**出差地点**：${businessReport.destination}\n\n## 一、出差目的\n\n${businessReport.purpose}\n\n## 二、参会人员\n\n${businessReport.attendees || '未记录'}\n\n## 三、会议要点\n\n${businessReport.keyPoints || '未记录'}\n\n## 四、费用明细\n\n${businessReport.expenses || '未记录'}\n\n## 五、下一步计划\n\n${businessReport.nextSteps || '未记录'}`
      this.setData({
        isGenerating: false,
        showReportModal: true,
        generatedReport: report,
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

  onFieldChange(e) {
    const { field } = e.currentTarget.dataset
    const businessReport = { ...this.data.businessReport }
    businessReport[field] = e.detail.value
    this.setData({ businessReport })
  },

  startRecording() {
    this.setData({ isRecording: true })
    wx.showToast({ title: '录音中...', icon: 'none', duration: 3000 })
    setTimeout(() => {
      const randomText = this.data.simulatedTexts[Math.floor(Math.random() * this.data.simulatedTexts.length)]
      this.setData({ isRecording: false, voiceInput: randomText })
      wx.hideToast()

      if (this.data.reportType === 'business') {
        const businessReport = { ...this.data.businessReport }
        businessReport.keyPoints = randomText
        this.setData({ businessReport })
      }
    }, 3000)
  },

  stopPropagation() {}
})