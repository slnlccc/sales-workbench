const { ai, schedules, auth } = require('../../utils/api.js')

const MAX_RECORD_SECONDS = 30 // 单次录音最长 30 秒，避免 ASR 超限
const RECORDER_OPTS = {
  duration: MAX_RECORD_SECONDS * 1000,
  sampleRate: 16000,
  numberOfChannels: 1,
  encodeBitRate: 48000,
  format: 'mp3', // 与后端 speechToText 默认 format 对齐
  frameSize: 3,
}

Page({
  data: {
    isRecording: false,
    recordedText: '',
    analysisResult: null,
    showAddScheduleModal: false,
    selectedItems: [],
    recordingSeconds: 0,
    messages: [
      { type: 'ai', text: '请点击下方按钮开始语音录入，我会帮你分析并提取事项。', time: '' }
    ]
  },

  // 全局 recorder 实例 + 计时句柄，避免重复 init
  _recorder: null,
  _recordingTimer: null,
  _maxTimer: null,

  onLoad() {
    if (!auth.isLoggedIn()) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      setTimeout(() => wx.reLaunch({ url: '/pages/index/index' }), 800)
      return
    }
    this._initRecorder()
  },

  onUnload() {
    this._clearTimers()
    if (this.data.isRecording) {
      try { this._recorder && this._recorder.stop() } catch (e) {}
    }
  },

  _initRecorder() {
    if (this._recorder) return
    const rm = wx.getRecorderManager()

    rm.onStart(() => {
      console.log('[voiceWorkbench] recorder onStart')
      this.setData({ isRecording: true, recordingSeconds: 0 })
      this._clearTimers()
      // 计时 + 到点强制停止
      this._recordingTimer = setInterval(() => {
        const next = this.data.recordingSeconds + 1
        this.setData({ recordingSeconds: next })
        if (next >= MAX_RECORD_SECONDS) {
          this.stopRecording({ from: 'max' })
        }
      }, 1000)
    })

    rm.onStop((res) => {
      console.log('[voiceWorkbench] recorder onStop', res && res.tempFilePath)
      this.setData({ isRecording: false })
      this._clearTimers()
      const path = res && res.tempFilePath
      if (!path) {
        this._fallbackManual('录音未生成文件，请重试或手动输入')
        return
      }
      this._uploadAndRecognize(path, res.fileSize)
    })

    rm.onError((err) => {
      console.error('[voiceWorkbench] recorder onError', err)
      this.setData({ isRecording: false })
      this._clearTimers()
      const msg = (err && (err.errMsg || err.message)) || '录音失败'
      wx.showToast({ title: msg, icon: 'none', duration: 2500 })
      // 权限被拒绝等情况需要兜底手动输入
      this._fallbackManual(msg)
    })

    rm.onFrameRecorded(() => { /* 不做流式处理 */ })

    this._recorder = rm
  },

  _clearTimers() {
    if (this._recordingTimer) { clearInterval(this._recordingTimer); this._recordingTimer = null }
    if (this._maxTimer) { clearTimeout(this._maxTimer); this._maxTimer = null }
  },

  /**
   * 用户点击"语音录入"：申请麦克风权限 → start()
   */
  async startRecording() {
    if (this.data.isRecording) return
    this._initRecorder()

    // 1. 显式申请录音权限（兼容首次/已拒绝两种情况）
    try {
      await wx.authorize({ scope: 'scope.record' })
    } catch (e) {
      console.warn('[voiceWorkbench] 授权被拒，引导打开设置', e)
      wx.showModal({
        title: '需要麦克风权限',
        content: '请到设置中允许微信使用麦克风，才能录音。',
        confirmText: '去设置',
        success: (r) => {
          if (r.confirm) wx.openSetting()
        }
      })
      return
    }

    try {
      wx.showToast({ title: '录音中，请说话...', icon: 'none', duration: MAX_RECORD_SECONDS * 1000 + 500 })
      this._recorder.start(RECORDER_OPTS)
    } catch (e) {
      console.error('[voiceWorkbench] recorder.start error', e)
      wx.hideToast()
      wx.showToast({ title: '启动录音失败', icon: 'none' })
      this._fallbackManual('启动录音失败')
    }
  },

  /**
   * 用户点击"停止录音"或达 30 秒上限
   */
  stopRecording(opts) {
    if (!this.data.isRecording) return
    console.log('[voiceWorkbench] stopRecording from=', (opts && opts.from) || 'user')
    wx.hideToast()
    try {
      this._recorder && this._recorder.stop()
    } catch (e) {
      console.error('[voiceWorkbench] recorder.stop error', e)
      // stop 抛异常时至少回滚状态，不让用户卡死
      this.setData({ isRecording: false })
      this._clearTimers()
      this._fallbackManual('停止录音异常，请重试或手动输入')
    }
  },

  async _uploadAndRecognize(tempFilePath, fileSize) {
    wx.showLoading({ title: '语音识别中...', mask: true })
    let base64
    try {
      const fs = wx.getFileSystemManager()
      const arr = fs.readFileSync(tempFilePath, 'base64')
      base64 = arr // wx.getFileSystemManager 返回的已经是 base64 字符串
    } catch (e) {
      wx.hideLoading()
      console.error('[voiceWorkbench] 读取录音文件失败', e)
      this._fallbackManual('读取录音文件失败')
      return
    }

    console.log('[voiceWorkbench] ASR upload size(base64 len)=', base64 && base64.length)

    let recognized = ''
    try {
      const res = await ai.voiceAsr({
        audioBase64: base64,
        format: RECORDER_OPTS.format,
        sampleRate: RECORDER_OPTS.sampleRate,
        channels: RECORDER_OPTS.numberOfChannels,
      })
      recognized = (res && res.text) || ''
    } catch (e) {
      wx.hideLoading()
      console.warn('[voiceWorkbench] ASR 失败（可能未配置密钥）', e.message)
      // ASR 未配置 / 失败 → 不填假文本，让用户直接看到"已录好，请手动输入/核对内容"
      wx.showToast({
        title: (e && e.message && e.message.length < 40 ? e.message : '识别失败，请手动输入'),
        icon: 'none',
        duration: 3000,
      })
      this.setData({
        recordedText: '',
        messages: [...this.data.messages, {
          type: 'ai',
          text: '语音识别未启用：请直接在文本框输入或修正内容，然后点击「分析提取」。',
          time: this.formatTime()
        }]
      })
      return
    }

    // ---- ASR 成功：如果后端提供了锻造行业矫正接口，做二次校正 ----
    wx.hideLoading()
    let finalText = recognized
    try {
      const corrected = await ai.voiceCorrect({ text: recognized })
      if (corrected && corrected.correctedText) finalText = corrected.correctedText
    } catch (e) {
      console.info('[voiceWorkbench] voice-correct 未启用，跳过专业术语矫正')
    }

    this.setData({
      recordedText: finalText,
      messages: [
        ...this.data.messages,
        { type: 'user', text: finalText || '（未识别到有效内容，请手动输入）', time: this.formatTime() }
      ]
    })

    if (finalText && finalText.trim()) {
      this.analyzeText(finalText)
    } else {
      wx.showToast({ title: '未识别到内容，请手动输入', icon: 'none' })
    }
  },

  _fallbackManual(message) {
    this.setData({
      messages: [...this.data.messages, {
        type: 'ai',
        text: `${message || '录音失败'}，请直接在文本框输入，然后点击「分析提取」。`,
        time: this.formatTime()
      }]
    })
  },

  async analyzeText(text) {
    wx.showLoading({ title: 'AI分析中...' })
    try {
      const res = await ai.voiceAssistant({ text })
      const aiTasks = (res && Array.isArray(res.tasks)) ? res.tasks : []
      const items = aiTasks.length > 0
        ? aiTasks.map((t, idx) => ({
            id: idx + 1,
            checked: true,
            date: t.date || '',
            time: t.time || '',
            title: t.content || text,
            type: Array.isArray(t.typeLabels) && t.typeLabels[0] ? t.typeLabels[0] : '待办',
          }))
        : []
      const summary = (res && res.summary) || (items.length > 0 ? `已识别到 ${items.length} 个事项` : `已为您准备好待办`)
      wx.hideLoading()
      const finalItems = items.length > 0 ? items : [{
        id: 1, checked: true,
        date: this.getDateStr(1),
        time: '09:00',
        title: text,
        type: '待办'
      }]
      this.setData({
        analysisResult: { summary, items: finalItems },
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
      summary: `已识别到 ${items.length} 个事项（本地解析），请核对后添加：`,
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
      } catch (e) {
        console.error('[voiceWorkbench] add schedule error:', e)
      }
    }
    wx.hideLoading()
    wx.showToast({ title: ok > 0 ? `已添加 ${ok} 个日程` : '添加失败', icon: ok > 0 ? 'success' : 'none' })
    this.setData({ showAddScheduleModal: false, analysisResult: null })
  },

  closeModal() {
    this.setData({ showAddScheduleModal: false })
  },

  stopPropagation() {},

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
