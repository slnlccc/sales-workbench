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
    categories: ['全部', '航天', '行业', '材料']
  },

  onLoad() {},

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
  }
})