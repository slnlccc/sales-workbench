const { ai, auth } = require('../../utils/api.js')

const PURPOSE_OPTIONS = ['获取商机', '洽谈订单', '维护关系', '技术交流', '收款', '处理问题', '其他']

function buildLocalReport(form) {
  const date = form.travelDate || ''
  const p = (v) => (v && String(v).trim() ? v : '/')
  const lines = []

  lines.push('# 出差报告')
  lines.push(`**日报时间**：${date}`)
  lines.push('')
  lines.push('## 一、基本信息')
  lines.push(`- **出差人**：${p(form.travelers)}`)
  lines.push(`- **出差时间**：${date}`)
  lines.push(`- **出差地点**：${p(form.location)}`)
  lines.push('')
  lines.push('## 二、出差计划和目标')
  lines.push(`主要目的：${p(form.purpose)}`)
  lines.push('')
  lines.push('## 三、出差对象')
  lines.push(`- **客户单位名称**：${p(form.clients)}`)
  lines.push(`- **客户背景**：${p(form.customerBackground)}`)
  lines.push(`- **其它客户关系情况说明**：${p(form.customerRelations)}`)
  lines.push('')
  lines.push('## 四、出差日报总结')
  lines.push('')
  lines.push('### （一）计划事项达成情况')
  lines.push(p(form.planAchievement))
  lines.push('')
  lines.push('#### 一、行业核心变量')
  lines.push(p(form.industryCore || form.industryVariable))
  lines.push('**关键影响：**')
  lines.push(`- **标准切换**：${p(form.standardChange)}`)
  lines.push(`- **时间节点**：${p(form.timeline)}`)
  lines.push(`- **采购模式**：${p(form.procurementMode)}`)
  lines.push(`- **远期增量**：${p(form.longTermOpportunity)}`)
  lines.push('')
  lines.push('#### 二、锻件市场')
  lines.push(`- **标杆落地**：${p(form.benchmark)}`)
  lines.push(`- **准入门槛**：${p(form.entryBarrier)}`)
  lines.push(`- **细分品类**：${p(form.segmentCategory)}`)
  lines.push('')
  lines.push('#### 三、板材市场')
  lines.push(`- **行业标杆**：${p(form.industryBenchmark)}`)
  lines.push(`- **竞品梯队**：${p(form.competitorTiers)}`)
  lines.push(`- **我方切入路径**：${p(form.entryPath)}`)
  lines.push('')
  lines.push('#### 四、其他客户单位情况')
  lines.push(p(form.otherClients))
  lines.push('')
  lines.push(`##### 大小业主交流记录：${p(form.ownerComm)}`)
  lines.push(`##### 其他人员交流记录：${p(form.otherComm)}`)
  lines.push('')
  lines.push('### （二）其他收获')
  lines.push(p(form.otherHarvest))
  lines.push(`1、**行业盈利格局判断**：${p(form.profitPattern)}`)
  lines.push('')
  lines.push('### （三）风险')
  lines.push(p(form.risks))
  lines.push('')
  lines.push('### （四）求助')
  lines.push(p(form.helpNeeded))
  lines.push('')
  lines.push('### （五）下一步行动计划')
  lines.push(p(form.nextSteps))
  lines.push('')
  lines.push('---')
  lines.push('*本报告由系统根据您填写的信息自动整理生成*')
  return lines.join('\n')
}

const today = () => {
  const t = new Date()
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
}

Page({
  data: {
    purposeOptions: PURPOSE_OPTIONS,
    purposeIndex: -1,
    form: {
      travelers: '',
      travelDate: today(),
      location: '',
      purpose: '',
      clients: '',
      customerBackground: '',
      customerRelations: '',
      planAchievement: '',
      industryCore: '',
      standardChange: '',
      timeline: '',
      procurementMode: '',
      longTermOpportunity: '',
      benchmark: '',
      entryBarrier: '',
      segmentCategory: '',
      industryBenchmark: '',
      competitorTiers: '',
      entryPath: '',
      otherClients: '',
      ownerComm: '',
      otherComm: '',
      industryInfo: '',
      marketInfo: '',
      otherHarvest: '',
      profitPattern: '',
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
    }
  },

  onInput(e) {
    const { field } = e.currentTarget.dataset
    this.setData({ [`form.${field}`]: e.detail.value })
  },

  onDateChange(e) {
    this.setData({ 'form.travelDate': e.detail.value })
  },

  onPurposeChange(e) {
    const idx = Number(e.detail.value)
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
