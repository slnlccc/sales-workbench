const { ai, schedules, auth } = require('../../utils/api.js')

Page({
  data: {
    isRecording: false,
    recordedText: '',
    analysisResult: null,
    showAddScheduleModal: false,
    selectedItems: [],
    recordingTimer: null,
    recordingSeconds: 0,

    simulatedTexts: [
      '明天下午三点和张三开会讨论项目进度',
      '下周二去上海出差拜访客户',
      '后天上午十点提交季度报告',
      '本周六参加技术培训',
      '明天早上九点生产会议',
      '下周五下午去工厂考察',
      '今天下午四点跟进合同审批',
      '下周一上午十点客户回访'
    ],

    messages: [
      { type: 'ai', text: '请点击下方按钮开始语音录入，我会帮你分析并提取事项。', time: '' }
    ]
  },

  onLoad() {
    if (!auth.isLoggedIn()) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      setTimeout(() => wx.reLaunch({ url: '/pages/index/index' }), 800)
      return
    }
  },

  startRecording() {
    this.setData({ isRecording: true, recordingSeconds: 0 })
    wx.showToast({ title: '正在录音...', icon: 'none', duration: 10000 })

    this.data.recordingTimer = setInterval(() => {
      this.setData({ recordingSeconds: this.data.recordingSeconds + 1 })
    }, 1000)

    setTimeout(() => {
      this.stopRecording()
    }, 3000)
  },

  stopRecording() {
    if (!this.data.isRecording) return
    clearInterval(this.data.recordingTimer)
    this.setData({ isRecording: false })
    wx.hideToast()

    const randomText = this.data.simulatedTexts[Math.floor(Math.random() * this.data.simulatedTexts.length)]
    this.setData({
      recordedText: randomText,
      messages: [...this.data.messages, { type: 'user', text: randomText, time: this.formatTime() }]
    })

    this.analyzeText(randomText)
  },

  async analyzeText(text) {
    wx.showLoading({ title: 'AI分析中...' })
    try {
      const res = await ai.voiceAssistant({ text })
      // res: { summary, items: [{ date, time, title, type, category, customer }]}
      const items = (res.items || res.data?.items || []).map((it, idx) => ({
        id: idx + 1,
        checked: true,
        date: it.date || '',
        time: it.time || '',
        title: it.title || text,
        type: it.type || '待办',
      }))
      const summary = res.summary || res.data?.summary || `已识别到 ${items.length} 个事项`
      wx.hideLoading()
      this.setData({
        analysisResult: {
          summary,
          items: items.length > 0 ? items : [{
            id: 1, checked: true,
            date: this.getDateStr(1),
            time: '09:00',
            title: text,
            type: '待办'
          }],
        },
        messages: [...this.data.messages, { type: 'ai', text: summary, time: this.formatTime() }]
      })
    } catch (e) {
      wx.hideLoading()
      // AI 失败时本地兜底解析
      const result = this.parseText(text)
      this.setData({
        analysisResult: result,
        messages: [...this.data.messages, { type: 'ai', text: result.summary, time: this.formatTime() }]
      })
    }
  },

  parseText(text) {
    let date = ''
    let time = ''
    let title = ''
    const items = []

    if (text.includes('明天')) date = this.getDateStr(1)
    else if (text.includes('后天')) date = this.getDateStr(2)
    else if (text.includes('今天')) date = this.getDateStr(0)
    else if (text.includes('本周')) date = this.getDateStr(this.getDaysToWeekend())
    else if (text.includes('下周')) date = this.getDateStr(this.getDaysToNextWeek())
    else if (text.includes('下周一')) date = this.getDateStr(this.getDaysToNextMonday())
    else if (text.includes('下周二')) date = this.getDateStr(this.getDaysToNextTuesday())
    else if (text.includes('下周三')) date = this.getDateStr(this.getDaysToNextWednesday())
    else if (text.includes('下周四')) date = this.getDateStr(this.getDaysToNextThursday())
    else if (text.includes('下周五')) date = this.getDateStr(this.getDaysToNextFriday())
    else if (text.includes('周六')) date = this.getDateStr(this.getDaysToSaturday())
    else if (text.includes('周日')) date = this.getDateStr(this.getDaysToSunday())

    const timeMatch = text.match(/(\d{1,2})[:点](\d{0,2})/)
    if (timeMatch) {
      time = timeMatch[1] + ':' + (timeMatch[2] || '00')
    }

    const keywords = ['开会', '会议', '讨论', '出差', '拜访', '提交', '培训', '考察', '跟进', '回访']
    for (const kw of keywords) {
      if (text.includes(kw)) {
        title = text.replace(/明天|后天|今天|本周|下周|下周一|下周二|下周三|下周四|下周五|周六|周日|上午|下午|晚上|\d{1,2}[:点]\d{0,2}/g, '').trim()
        break
      }
    }
    if (!title) title = text

    if (date || time) {
      items.push({ date, time, title, type: date && time ? '会议' : date ? '待办' : '提醒' })
    } else {
      items.push({ date: this.getDateStr(1), time: '09:00', title, type: '待办' })
    }

    return {
      summary: `已识别到 ${items.length} 个事项，已帮你提取关键信息：`,
      items: items.map((item, idx) => ({
        id: idx + 1,
        checked: true,
        date: item.date,
        time: item.time,
        title: item.title,
        type: item.type
      }))
    }
  },

  getDateStr(days) {
    const d = new Date()
    d.setDate(d.getDate() + days)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  },

  getDaysToWeekend() {
    const d = new Date()
    return 6 - d.getDay()
  },

  getDaysToNextWeek() {
    const d = new Date()
    return 7 - d.getDay() + 1
  },

  getDaysToNextMonday() {
    const d = new Date()
    const day = d.getDay()
    return day === 0 ? 1 : 8 - day
  },

  getDaysToNextTuesday() {
    const d = new Date()
    const day = d.getDay()
    return day === 0 ? 2 : day === 1 ? 1 : 9 - day
  },

  getDaysToNextWednesday() {
    const d = new Date()
    const day = d.getDay()
    return day === 0 ? 3 : day <= 2 ? 4 - day : 10 - day
  },

  getDaysToNextThursday() {
    const d = new Date()
    const day = d.getDay()
    return day === 0 ? 4 : day <= 3 ? 5 - day : 11 - day
  },

  getDaysToNextFriday() {
    const d = new Date()
    const day = d.getDay()
    return day === 0 ? 5 : day <= 4 ? 6 - day : 12 - day
  },

  getDaysToSaturday() {
    const d = new Date()
    return 6 - d.getDay()
  },

  getDaysToSunday() {
    const d = new Date()
    return d.getDay() === 0 ? 0 : 7 - d.getDay()
  },

  formatTime() {
    const d = new Date()
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  },

  toggleItem(e) {
    const { idx } = e.currentTarget.dataset
    const items = [...this.data.analysisResult.items]
    items[idx].checked = !items[idx].checked
    this.setData({ analysisResult: { ...this.data.analysisResult, items } })
  },

  addToSchedule() {
    const checkedItems = this.data.analysisResult.items.filter(i => i.checked)
    if (checkedItems.length === 0) {
      wx.showToast({ title: '请选择要添加的事项', icon: 'none' })
      return
    }
    this.setData({ selectedItems: checkedItems, showAddScheduleModal: true })
  },

  async confirmAdd() {
    const items = this.data.selectedItems
    if (items.length === 0) return
    wx.showLoading({ title: '添加中...' })
    let ok = 0
    for (const item of items) {
      try {
        await schedules.create({
          date: item.date,
          time: item.time,
          title: item.title,
          type: item.type,
          closed: false,
        })
        ok++
      } catch (e) {}
    }
    wx.hideLoading()
    wx.showToast({ title: ok > 0 ? `已添加 ${ok} 个日程` : '添加失败', icon: ok > 0 ? 'success' : 'none' })
    this.setData({ showAddScheduleModal: false, analysisResult: null })
  },

  closeModal() {
    this.setData({ showAddScheduleModal: false })
  },

  onInputText(e) {
    this.setData({ recordedText: e.detail.value })
  },

  manualAnalyze() {
    if (!this.data.recordedText.trim()) {
      wx.showToast({ title: '请输入内容', icon: 'none' })
      return
    }
    this.setData({ messages: [...this.data.messages, { type: 'user', text: this.data.recordedText, time: this.formatTime() }] })
    this.analyzeText(this.data.recordedText)
  },

  goCalendar() {
    wx.navigateTo({ url: '/pages/calendar/index' })
  }
})
