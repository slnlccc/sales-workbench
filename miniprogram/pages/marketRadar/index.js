// 统一从 utils/api.js 调用 Railway REST API，与电脑端共享后端
const { market, auth } = require('../../utils/api.js')

Page({
  data: {
    news: [
      {
        id: 1,
        title: '长征十号乙首飞成功并实现箭体回收',
        source: '航天科技集团',
        date: '2026-07-15',
        tag: '新',
        category: '航天',
        summary: '7月15日，长征十号乙运载火箭在文昌航天发射场首飞成功，标志着我国可重复使用火箭技术取得重大突破。'
      },
      {
        id: 2,
        title: '锻件行业智能制造水平提升',
        source: '锻件协会',
        date: '2026-07-14',
        tag: '',
        category: '行业',
        summary: '随着数字化转型加速，锻件制造企业纷纷引入智能生产线，生产效率提升30%以上。'
      },
      {
        id: 3,
        title: '高温合金材料需求持续增长',
        source: '中国金属网',
        date: '2026-07-13',
        tag: '新',
        category: '材料',
        summary: '航空发动机领域对高温合金需求激增，国内产能持续扩张。'
      },
      {
        id: 4,
        title: '新一代运载火箭关键锻件研制突破',
        source: '科技日报',
        date: '2026-07-12',
        tag: '',
        category: '航天',
        summary: '某航天企业成功研制出直径3.5米的铝合金环件，达到国际先进水平。'
      },
      {
        id: 5,
        title: '钛合金锻件市场前景广阔',
        source: '行业研究',
        date: '2026-07-11',
        tag: '',
        category: '材料',
        summary: '钛合金在航空航天领域应用不断扩大，市场规模预计年增15%。'
      }
    ],
    materials: [
      { name: '45#圆钢', price: 4850, unit: '元/吨', change: '+25', trend: 'up' },
      { name: 'Q235B', price: 4680, unit: '元/吨', change: '+15', trend: 'up' },
      { name: '40Cr', price: 5200, unit: '元/吨', change: '-30', trend: 'down' },
      { name: '20#', price: 4720, unit: '元/吨', change: '+10', trend: 'up' },
      { name: '304不锈钢', price: 14200, unit: '元/吨', change: '-80', trend: 'down' },
      { name: '高温合金', price: 38500, unit: '元/吨', change: '+500', trend: 'up' },
      { name: '铝合金', price: 18600, unit: '元/吨', change: '+200', trend: 'up' },
      { name: '钛合金', price: 68000, unit: '元/吨', change: '+800', trend: 'up' }
    ],
    insights: [
      '本周原材料价格整体小幅上涨，建议关注45#圆钢采购时机',
      '航天领域对锻件需求持续增加，尤其是大型环件市场',
      '高温合金材料供应紧张，建议提前备货',
      '智能制造转型是锻件企业提升竞争力的关键'
    ],
    selectedCategory: '全部',
    categories: ['全部', '航天', '行业', '材料'],
    // 竞争对手动态（实时从后端拉取，每日更新）
    competitors: [],
    competitorsLoading: false,
    competitorsLastUpdate: '',
    // 竞争对手分类筛选（按截图顺序固定列表）
    competitorFilterName: '全部对手',
    competitorFilterChannel: '全部来源',
    competitorFilterType: '全部类别',
    competitorNames: ['全部对手', '中航重机', '三角防务', '钢研高纳', '图南股份', '西部超导', '宝钛股份', '万泽股份', '铂力特', '行业研报'],
    competitorChannels: ['全部来源', '公众号', '官网', '招投标', '财报', '行业研报'],
    competitorTypes: ['全部类别', '产能扩张', '技术突破', '订单中标', '资本运作', '客户拓展', '人事变动', '其他'],
    filteredCompetitors: [],
  },

  onLoad() {
    // 登录后也可以拉取完整市场数据（含各模块）
    if (auth.isLoggedIn()) {
      this.fetchOverview()
    } else {
      // 未登录时只拉取公开的竞争对手数据
      this.fetchCompetitors()
    }
  },

  /**
   * 拉取竞争对手动态（公开接口，无需登录）
   */
  async fetchCompetitors() {
    this.setData({ competitorsLoading: true })
    try {
      const res = await market.competitors()
      const competitors = res.competitors || []
      const lastUpdate = res.lastUpdate
        ? '上次更新 ' + this.formatDate(res.lastUpdate)
        : ''
      this.setData({
        competitors,
        competitorsLastUpdate: lastUpdate,
        competitorsLoading: false,
      }, () => {
        this.applyCompetitorFilter()
      })
    } catch (e) {
      this.setData({ competitorsLoading: false })
      wx.showToast({ title: '网络异常，稍后重试', icon: 'none' })
    }
  },

  /**
   * 已登录时拉取完整市情雷达数据（含行业动态、原材料、竞争对手）
   */
  async fetchOverview() {
    wx.showLoading({ title: '加载中' })
    try {
      const data = await market.overview()
      const competitors = data.competitors || []
      const lastUpdate = data.radarLastUpdate
        ? '上次更新 ' + this.formatDate(data.radarLastUpdate)
        : ''
      const radarNews = (data.radarNews || []).slice(0, 5).map((n, i) => ({
        id: i + 1,
        title: n.title,
        source: n.source || '行业资讯',
        date: n.publishedAt || n.date || new Date().toISOString().slice(0, 10),
        tag: i < 2 ? '新' : '',
        category: n.category || '行业',
        summary: n.summary || '',
      }))
      const radarMaterials = (data.radarMaterials || []).slice(0, 8).map(m => ({
        name: m.name,
        price: m.price,
        unit: m.unit || '元/吨',
        change: (m.change > 0 ? '+' : '') + (m.change || 0),
        trend: m.trend === 'down' ? 'down' : (m.trend === 'up' ? 'up' : 'stable'),
      }))
      const extra = {
        news: radarNews.length > 0 ? radarNews : this.data.news,
        materials: radarMaterials.length > 0 ? radarMaterials : this.data.materials,
      }
      this.setData({
        ...extra,
        competitors,
        competitorsLastUpdate: lastUpdate,
        competitorsLoading: false,
      }, () => {
        this.applyCompetitorFilter()
      })
      wx.hideLoading()
    } catch (e) {
      wx.hideLoading()
      // 失败则回退到公开接口
      this.fetchCompetitors()
    }
  },

  formatDate(iso) {
    if (!iso) return ''
    const d = new Date(iso)
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  },

  refreshCompetitors() {
    this.fetchCompetitors()
  },

  /**
   * 应用竞争对手筛选
   */
  applyCompetitorFilter() {
    const { competitors, competitorFilterName, competitorFilterChannel, competitorFilterType } = this.data
    const filtered = competitors.filter(c => {
      if (competitorFilterName !== '全部对手' && c.competitorName !== competitorFilterName) return false
      if (competitorFilterChannel !== '全部来源' && c.channel !== competitorFilterChannel) return false
      if (competitorFilterType !== '全部类别' && c.category !== competitorFilterType) return false
      return true
    })
    this.setData({ filteredCompetitors: filtered })
  },

  /**
   * 筛选事件：竞争对手名称
   */
  filterCompetitorName(e) {
    this.setData({ competitorFilterName: e.currentTarget.dataset.name }, () => {
      this.applyCompetitorFilter()
    })
  },

  /**
   * 筛选事件：信息渠道
   */
  filterCompetitorChannel(e) {
    this.setData({ competitorFilterChannel: e.currentTarget.dataset.channel }, () => {
      this.applyCompetitorFilter()
    })
  },

  /**
   * 筛选事件：动态类型
   */
  filterCompetitorType(e) {
    this.setData({ competitorFilterType: e.currentTarget.dataset.type }, () => {
      this.applyCompetitorFilter()
    })
  },

  /**
   * 清除筛选
   */
  clearCompetitorFilter() {
    this.setData({
      competitorFilterName: '全部对手',
      competitorFilterChannel: '全部来源',
      competitorFilterType: '全部类别',
    }, () => {
      this.applyCompetitorFilter()
    })
  },

  filterNews(e) {
    const { idx } = e.currentTarget.dataset
    this.setData({ selectedCategory: this.data.categories[idx] })
  },

  getFilteredNews() {
    if (this.data.selectedCategory === '全部') return this.data.news
    return this.data.news.filter(n => n.category === this.data.selectedCategory)
  },

  goDetail(e) {
    const { id } = e.currentTarget.dataset
    const news = this.data.news.find(n => n.id === id)
    wx.showModal({
      title: news.title,
      content: news.summary + '\n\n来源：' + news.source + '\n日期：' + news.date,
      showCancel: false
    })
  },

  goCompetitorDetail(e) {
    const { id } = e.currentTarget.dataset
    const comp = this.data.competitors.find(c => c.id === id)
    if (!comp) return
    const content = comp.summary +
      '\n\n竞争对手：' + comp.competitorName +
      '\n渠道：' + comp.channel +
      '\n类型：' + comp.category +
      '\n来源：' + comp.sourceName +
      '\n日期：' + comp.publishedAt +
      (comp.impactOnUs ? '\n\n对派克新材影响：' + comp.impactOnUs : '') +
      (comp.sourceUrl ? '\n\n原文链接：' + comp.sourceUrl : '')
    wx.showModal({
      title: comp.title,
      content,
      showCancel: comp.sourceUrl ? true : false,
      cancelText: '关闭',
      confirmText: comp.sourceUrl ? '查看原文' : '确定',
      success: (res) => {
        if (res.confirm && comp.sourceUrl) {
          wx.setClipboardData({
            data: comp.sourceUrl,
            success: () => wx.showToast({ title: '链接已复制，可在浏览器打开', icon: 'none' }),
          })
        }
      },
    })
  }
})
