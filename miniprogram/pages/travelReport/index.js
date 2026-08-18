const { ai, auth } = require('../../utils/api.js')

const PURPOSE_OPTIONS = ['获取商机', '洽谈订单', '维护关系', '技术交流', '收款', '处理问题', '其他']

const todayStr = () => {
  const t = new Date()
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
}

function buildLocalReport(rawText, basic) {
  const date = basic.travelDate || todayStr()
  const p = (v) => (v && String(v).trim() ? v : '/')
  const lines = []
  lines.push('# 出差报告')
  lines.push(`**日报时间**：${date}`)
  lines.push('')
  lines.push('## 一、基本信息')
  lines.push(`- **出差人**：${p(basic.travelers)}`)
  lines.push(`- **出差时间**：${date}`)
  lines.push(`- **出差地点**：${p(basic.location)}`)
  lines.push('')
  lines.push('## 二、出差计划和目标')
  lines.push(`主要目的：${p(Array.isArray(basic.purpose) ? basic.purpose.join('、') : basic.purpose)}`)
  lines.push('')
  lines.push('## 三、出差对象（多人可复制该格式）')
  lines.push(`- **客户单位名称**：${p(basic.clients)}`)
  lines.push('')
  lines.push('## 四、出差日报总结（当天）')
  lines.push('')
  lines.push('### （一）计划事项达成情况')
  lines.push(rawText && rawText.trim() ? rawText.trim() : '/')
  lines.push('')
  lines.push('#### 一、行业核心变量：/')
  lines.push('**关键影响：**')
  lines.push('- **标准切换**：/')
  lines.push('- **时间节点**：/')
  lines.push('- **采购模式**：/')
  lines.push('- **远期增量**：/')
  lines.push('')
  lines.push('#### 二、锻件市场')
  lines.push(`- **标杆落地**：/`)
  lines.push(`- **准入门槛**：/`)
  lines.push(`- **细分品类**：/`)
  lines.push('')
  lines.push('#### 三、板材市场')
  lines.push(`- **行业标杆**：/`)
  lines.push(`- **准入门槛**：/`)
  lines.push(`- **竞品梯队**：/`)
  lines.push(`- **我方切入路径**：/`)
  lines.push('')
  lines.push('#### 四、其他客户单位情况：/')
  lines.push('##### 大小业主交流记录：/')
  lines.push('##### 其他人员交流记录：/')
  lines.push('')
  lines.push('### （二）其他收获：/')
  lines.push('1、**行业盈利格局判断**：/')
  lines.push('')
  lines.push('### （三）风险：/')
  lines.push('### （四）求助：/')
  lines.push('### （五）下一步行动计划：/')
  lines.push('')
  lines.push('---')
  lines.push('*AI 服务暂不可用 · 本地生成报告骨架*')
  return lines.join('\n')
}

function markdownToHtml(md) {
  const escapeHtml = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] || c))
  const lines = md.replace(/\r\n/g, '\n').split('\n')
  const html = []
  let inList = false, inTable = false
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

Page({
  data: {
    purposeOptions: PURPOSE_OPTIONS,
    form: {
      travelers: '',
      travelDate: todayStr(),
      location: '',
      purpose: [],
      clients: '',
      customerBackground: '',
      customerRelations: '',
      rawText: '',
    },
    loading: false,
    generatedContent: '',
    showResult: false,
    rawCharCount: 0,
    errorMsg: '',
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field
    const value = e.detail.value
    this.setData({ [`form.${field}`]: value })
    if (field === 'rawText') {
      this.setData({ rawCharCount: value.length })
    }
  },

  onDateChange(e) {
    this.setData({ 'form.travelDate': e.detail.value })
  },

  togglePurpose(e) {
    const opt = e.currentTarget.dataset.opt
    const list = this.data.form.purpose.slice()
    const idx = list.indexOf(opt)
    if (idx >= 0) list.splice(idx, 1); else list.push(opt)
    this.setData({ 'form.purpose': list })
  },

  loadSample() {
    const sample = `示例：2026年8月13日，单璟僖/马奕泓/赵涛/张振昭到上海出差。
拜访上海第一机床厂，对接于耀华总、楼杭飞书记、郭宝超总、吕建波部长；
另去了上海辅机厂，见杭建斌(采购部长)、代培研(采购执行)。
行业：华龙一号2.0融合，RCCM切换到NB标准，2026年重启集采。
关键影响：标准切换，时间节点2030交付/2028中开工/2027Q1锻件启动，双供方托底。
标杆：武核华龙1.5大锻件7月评定通过，8月发运。
竞品梯队：宝武→舞洋/久立→酒钢。
辅机厂：已签框架，因质量和交付暂停下单，恢复后谈明年框架。
下一步：1. 赵涛交试制资料；2. 赵涛转证申请；3. 单总/马总邀访无锡厂。`
    this.setData({ 'form.rawText': sample, rawCharCount: sample.length })
  },

  clearRaw() {
    this.setData({ 'form.rawText': '', rawCharCount: 0 })
  },

  async handleSubmit() {
    const raw = this.data.form.rawText || ''
    const basicFilled = (this.data.form.travelers || '').trim() || (this.data.form.location || '').trim()
    if (raw.trim().length < 20 && !basicFilled) {
      wx.showToast({ title: '请先填原始记录或出差人/地点', icon: 'none' })
      return
    }
    this.setData({ loading: true, errorMsg: '', generatedContent: '' })
    try {
      if (!auth.isLoggedIn()) await auth.ensureLogin()
      const f = this.data.form
      const res = await ai.travelReport({
        travelers: f.travelers,
        travelDate: f.travelDate,
        location: f.location,
        purpose: Array.isArray(f.purpose) ? f.purpose.join('、') : '',
        clients: f.clients,
        customerBackground: f.customerBackground,
        customerRelations: f.customerRelations,
        rawText: f.rawText,
      })
      this.setData({ generatedContent: res.content || '生成失败', showResult: true })
    } catch (err) {
      const msg = (err && err.message) ? err.message : String(err)
      this.setData({
        errorMsg: `AI 暂不可用(${msg})，已生成本地骨架`,
        generatedContent: buildLocalReport(this.data.form.rawText, this.data.form),
        showResult: true,
      })
    } finally {
      this.setData({ loading: false })
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
      filePath, data: this.data.generatedContent, encoding: 'utf8',
      success: () => wx.showModal({
        title: 'MD已保存',
        content: `是否打开预览？`,
        confirmText: '预览',
        success: (res) => res.confirm && wx.openDocument({
          filePath, fileType: 'txt', showMenu: true,
          fail: () => wx.showToast({ title: '预览失败，已保存', icon: 'none' }),
        }),
      }),
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
      filePath, data: '\ufeff' + wordHtml, encoding: 'utf8',
      success: () => wx.showModal({
        title: 'Word已保存',
        content: `是否打开预览？可直接微信发送/分享`,
        confirmText: '预览',
        success: (res) => res.confirm && wx.openDocument({
          filePath, fileType: 'doc', showMenu: true,
          fail: () => wx.showToast({ title: '预览失败，已保存', icon: 'none' }),
        }),
      }),
      fail: () => wx.showToast({ title: '保存失败', icon: 'none' }),
    })
  },

  closeResult() { this.setData({ showResult: false }) },
  stopPropagation() {},
})
