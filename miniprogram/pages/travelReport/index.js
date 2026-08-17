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

function markdownToHtml(md) {
  const escapeHtml = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] || c))
  const lines = md.replace(/\r\n/g, '\n').split('\n')
  const html = []
  let inList = false
  let inTable = false
  const closeList = () => { if (inList) { html.push('</ul>'); inList = false } }
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i]
    if (inTable) {
      if (/^\s*\|.*\|\s*$/.test(line) && /---/.test(line)) continue
      if (/^\s*\|.*\|\s*$/.test(line)) {
        const cells = line.split('|').slice(1, -1).map((c) => c.trim())
        html.push('<tr>' + cells.map((c) => `<td style="border:1px solid #ccc;padding:6px 10px;">${escapeHtml(c)}</td>`).join('') + '</tr>')
        continue
      } else {
        html.push('</tbody></table>')
        inTable = false
      }
    }
    if (/^\s*\|.*\|\s*$/.test(line) && i + 1 < lines.length && /---/.test(lines[i + 1])) {
      const header = line.split('|').slice(1, -1).map((c) => c.trim())
      html.push('<table style="border-collapse:collapse;width:100%;margin:12px 0;"><thead><tr style="background:#f5f1ea;">' + header.map((c) => `<th style="border:1px solid #ccc;padding:6px 10px;text-align:left;">${escapeHtml(c)}</th>`).join('') + '</tr></thead><tbody>')
      inTable = true
      continue
    }
    let m
    if ((m = line.match(/^######\s+(.*)$/))) { closeList(); html.push(`<h6 style="margin:14px 0 8px;color:#5c4a3a;">${escapeHtml(m[1])}</h6>`); continue }
    if ((m = line.match(/^#####\s+(.*)$/)))  { closeList(); html.push(`<h5 style="margin:14px 0 8px;color:#5c4a3a;">${escapeHtml(m[1])}</h5>`); continue }
    if ((m = line.match(/^####\s+(.*)$/)))   { closeList(); html.push(`<h4 style="margin:16px 0 8px;color:#6b5845;font-size:1.05em;">${escapeHtml(m[1])}</h4>`); continue }
    if ((m = line.match(/^###\s+(.*)$/)))    { closeList(); html.push(`<h3 style="margin:18px 0 10px;color:#5c4a3a;font-size:1.15em;">${escapeHtml(m[1])}</h3>`); continue }
    if ((m = line.match(/^##\s+(.*)$/)))     { closeList(); html.push(`<h2 style="margin:22px 0 12px;color:#5c4a3a;border-bottom:2px solid #e6dccb;padding-bottom:6px;font-size:1.3em;">${escapeHtml(m[1])}</h2>`); continue }
    if ((m = line.match(/^#\s+(.*)$/)))      { closeList(); html.push(`<h1 style="margin:24px 0 14px;color:#4a3a2a;border-bottom:3px solid #8c7153;padding-bottom:8px;font-size:1.6em;">${escapeHtml(m[1])}</h1>`); continue }
    if ((m = line.match(/^(\s*)[-*]\s+(.*)$/))) {
      if (!inList) { html.push('<ul style="margin:8px 0;padding-left:24px;line-height:1.8;">'); inList = true }
      let item = m[2].replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      const esc = escapeHtml(item).replace(/&lt;strong&gt;([^&]+)&lt;\/strong&gt;/g, '<strong>$1</strong>')
      html.push(`<li style="margin:4px 0;">${esc}</li>`)
      continue
    }
    if (/^---+$/.test(line.trim())) { closeList(); html.push('<hr style="border:none;border-top:1px dashed #c9bfa3;margin:18px 0;">'); continue }
    if (/^\s*$/.test(line)) { closeList(); if (html[html.length - 1] !== '<p></p>') html.push('<p style="margin:0;line-height:0.6;">&nbsp;</p>'); continue }
    closeList()
    let p = escapeHtml(line).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    html.push(`<p style="margin:6px 0;line-height:1.8;text-indent:0;">${p}</p>`)
  }
  if (inList) html.push('</ul>')
  if (inTable) html.push('</tbody></table>')
  return html.join('\n')
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
          title: 'MD已保存',
          content: `文件路径：${filePath}\n是否打开预览？`,
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

  downloadWord() {
    if (!this.data.generatedContent) return
    const date = this.data.form.travelDate || ''
    const html = markdownToHtml(this.data.generatedContent)
    const wordHtml = `<html xmlns:o="urn:schemas-microsoft-com:office:office"
       xmlns:w="urn:schemas-microsoft-com:office:word"
       xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8" />
<title>出差报告_${date}</title>
<![if gte mso 9]>
<xml>
  <w:WordDocument>
    <w:View>Print</w:View>
    <w:Zoom>100</w:Zoom>
  </w:WordDocument>
</xml>
<![endif]>
<style>
@page { size: A4; margin: 2cm 2.2cm; }
body { font-family: "SimSun","宋体","Microsoft YaHei",sans-serif; font-size: 12pt; color:#2b2b2b; line-height:1.7; }
h1,h2,h3,h4,h5,h6 { font-family: "Microsoft YaHei","黑体",sans-serif; color:#4a3a2a; }
strong { font-weight:bold; }
</style>
</head>
<body>
${html}
</body></html>`
    const fs = wx.getFileSystemManager()
    const filePath = `${wx.env.USER_DATA_PATH}/出差报告_${date}.doc`
    fs.writeFile({
      filePath,
      data: '\ufeff' + wordHtml,
      encoding: 'utf8',
      success: () => {
        wx.showModal({
          title: 'Word已保存',
          content: `文件已生成，是否打开文档预览？\n可直接用微信发送/分享`,
          confirmText: '预览',
          success: (res) => {
            if (res.confirm) {
              wx.openDocument({
                filePath,
                fileType: 'doc',
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
