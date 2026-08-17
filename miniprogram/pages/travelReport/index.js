const { ai, auth } = require('../../utils/api.js')

const PURPOSE_OPTIONS = ['获取商机', '洽谈订单', '维护关系', '技术交流', '收款', '处理问题', '其他']

// 本地模板生成报告（与Web端保持一致）
function buildLocalReport(form) {
  const date = form.travelDate || ''
  const lines = []
  lines.push('# 出差报告')
  lines.push(`**日报时间**：${date}`)
  lines.push('')
  lines.push('## 一、基本信息')
  lines.push(`- **出差人**：${form.travelers || '/'}`)
  lines.push(`- **出差时间**：${date}`)
  lines.push(`- **出差地点**：${form.location || '/'}`)
  lines.push('')
  lines.push('## 二、出差计划和目标')
  lines.push(`主要目的：${form.purpose || '/'}`)
  lines.push('')
  lines.push('## 三、出差对象')
  lines.push(`- **客户信息**：${form.clients || '/'}`)
  lines.push('')
  lines.push('## 四、出差日报总结')
  lines.push('')
  lines.push('### （一）计划事项达成情况')
  lines.push(form.planAchievement || '/')
  lines.push('')
  lines.push('### （二）其他收获')
  lines.push(form.otherHarvest || '/')
  lines.push('')
  lines.push('### （三）行业/市场信息')
  lines.push(form.industryInfo || form.marketInfo || '/')
  lines.push('')
  lines.push('### （四）风险')
  lines.push(form.risks || '/')
  lines.push('')
  lines.push('### （五）求助')
  lines.push(form.helpNeeded || '/')
  lines.push('')
  lines.push('### （六）下一步行动计划')
  lines.push(form.nextSteps || '/')
  lines.push('')
  lines.push('---')
  lines.push('*本报告由系统根据您填写的信息自动整理生成*')
  return lines.join('\n')
}

Page({
  data: {
    purposeOptions: PURPOSE_OPTIONS,
    purposeIndex: -1,
    form: {
      travelers: '',
      travelDate: '',
      location: '',
      purpose: '',
      clients: '',
      planAchievement: '',
      industryInfo: '',
      otherHarvest: '',
      risks: '',
      helpNeeded: '',
      nextSteps: '',
    },
    loading: false,
    generatedContent: '',
    showResult: false,
    isLocalFallback: false,
    warningMsg: '',
  },

  onLoad() {
    if (!auth.isLoggedIn()) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      setTimeout(() => wx.reLaunch({ url: '/pages/index/index' }), 800)
      return
    }
    const today = new Date()
    const y = today.getFullYear()
    const m = String(today.getMonth() + 1).padStart(2, '0')
    const d = String(today.getDate()).padStart(2, '0')
    this.setData({ 'form.travelDate': `${y}-${m}-${d}` })
  },

  onInput(e) {
    const { field } = e.currentTarget.dataset
    this.setData({ [`form.${field}`]: e.detail.value })
  },

  onDateChange(e) {
    this.setData({ 'form.travelDate': e.detail.value })
  },

  onPurposeChange(e) {
    const idx = e.detail.value
    this.setData({
      purposeIndex: idx,
      'form.purpose': PURPOSE_OPTIONS[idx],
    })
  },

  async handleSubmit() {
    const { form } = this.data
    if (!form.travelers.trim() || !form.location.trim()) {
      wx.showToast({ title: '请填写出差人和出差地点', icon: 'none' })
      return
    }

    this.setData({ loading: true, warningMsg: '' })

    try {
      const res = await ai.travelReport(form)
      const content = res.content || ''
      const isFallback = !!res.fallback
      this.setData({
        loading: false,
        generatedContent: content || '生成失败，请重试',
        showResult: true,
        isLocalFallback: isFallback,
        warningMsg: isFallback ? (res.warning || 'AI 服务暂不可用，已使用本地模板生成') : '',
      })
    } catch (err) {
      console.warn('[travelReport] AI 生成失败，使用本地模板:', err)
      const localReport = buildLocalReport(form)
      this.setData({
        loading: false,
        generatedContent: localReport,
        showResult: true,
        isLocalFallback: true,
        warningMsg: 'AI 服务暂时不可用，已使用本地模板生成报告',
      })
    }
  },

  copyReport() {
    if (!this.data.generatedContent) return
    wx.setClipboardData({
      data: this.data.generatedContent,
      success: () => wx.showToast({ title: '已复制', icon: 'success' }),
    })
  },

  downloadReport() {
    if (!this.data.generatedContent) return
    const fs = wx.getFileSystemManager()
    const filePath = `${wx.env.USER_DATA_PATH}/出差报告_${this.data.form.travelDate}.md`
    fs.writeFile({
      filePath,
      data: this.data.generatedContent,
      encoding: 'utf8',
      success: () => {
        wx.showModal({
          title: '报告已保存',
          content: `文件路径：${filePath}\n是否打开文档预览？`,
          confirmText: '预览',
          success: (res) => {
            if (res.confirm) {
              wx.openDocument({
                filePath,
                fileType: 'txt',
                showMenu: true,
                fail: () => wx.showToast({ title: '预览失败，文件已保存', icon: 'none' }),
              })
            }
          },
        })
      },
      fail: () => wx.showToast({ title: '保存失败', icon: 'none' }),
    })
  },

  closeResult() {
    this.setData({ showResult: false })
  },

  stopPropagation() {},
})
