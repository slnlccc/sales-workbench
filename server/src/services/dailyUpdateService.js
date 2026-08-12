/**
 * 每日数据自动更新服务
 * 市情雷达各模块（行业动态、原材料价格走势、招投标、政策法规、行业展会、竞争对手动态）
 * 使用 DeepSeek AI 生成数据，每天 8:00 自动更新
 * 服务重启时若已有今日数据则保留，否则立即更新
 */

const { isConfigured, chat, chatJSON } = require('./deepseekService')

// 内存存储（当 MongoDB 不可用时使用）
let memoryData = {
  // AI市场数据（旧版，保留兼容 MarketDataPanel）
  metalPrices: [],
  industryNews: [],
  exhibitions: [],
  lastUpdate: null,
  // 市情雷达各模块（每日更新）
  radarNews: [],
  radarMaterials: [],
  radarBidding: [],
  radarPolicies: [],
  radarExhibitions: [],
  competitors: [],
  radarLastUpdate: null,
}

// 派克新材主要竞争对手名单（用于 AI 生成扒取动态）
const COMPETITOR_LIST = [
  '中航重机', '三角防务', '宝武特钢', '通裕重工', '二重（国机重装）',
  '中国一重', '派克新材', '陕西宏远航空', '无锡透平叶片', '安泰科技',
]

/**
 * 生成金属价格数据（旧版 MarketDataPanel 用）
 */
const generateMetalPrices = async () => {
  const systemPrompt = `你是一个金属材料市场数据助手。请生成当前主要锻造材料的参考价格。

返回 JSON 格式：
{
  "prices": [
    {
      "name": "材料名称",
      "category": "高温合金|钛合金|不锈钢|铝合金|合金钢",
      "price": 0,
      "unit": "元/吨",
      "change": 0,
      "changePercent": 0,
      "trend": "up|down|stable"
    }
  ]
}

包含以下材料：GH4169、GH3536、TC4、TC11、304不锈钢、316L不锈钢、6061铝合金、42CrMo合金钢、18CrNiMo7-6。
价格要合理，变化幅度在 -5% ~ +5% 之间。`

  const result = await chatJSON(
    [{ role: 'system', content: systemPrompt }],
    { temperature: 0.8, maxTokens: 1024 }
  )

  return result.prices || []
}

/**
 * 生成行业资讯（旧版 MarketDataPanel 用，含 sourceUrl）
 */
const generateIndustryNews = async () => {
  const systemPrompt = `你是一个锻造行业资讯助手。请生成 5 条最新的行业资讯摘要。

涵盖领域：航空锻造、核电锻件、风电锻件、石化锻件、船舶锻件。

返回 JSON 格式：
{
  "news": [
    {
      "title": "资讯标题",
      "summary": "摘要（50-100字）",
      "category": "航空|核电|风电|石化|船舶|市场|政策",
      "source": "来源名称（如：中国锻造协会、中国特钢企业协会等）",
      "sourceUrl": "真实的行业信息来源网址（如 https://www.chinaforge.org.cn 或 https://www.specialsteel.com.cn 等可访问的行业网站对应栏目）",
      "date": "YYYY-MM-DD"
    }
  ]
}

重要：sourceUrl 必须是真实可访问的行业网站网址，便于用户点击核实信息来源。`

  const result = await chatJSON(
    [{ role: 'system', content: systemPrompt }],
    { temperature: 0.8, maxTokens: 1024 }
  )

  return result.news || []
}

/**
 * 生成展会信息（旧版 MarketDataPanel 用，含 sourceUrl）
 */
const generateExhibitions = async () => {
  const systemPrompt = `你是一个锻造行业展会信息助手。请生成近期相关的行业展会信息。

返回 JSON 格式：
{
  "exhibitions": [
    {
      "name": "展会名称",
      "date": "展会日期范围",
      "location": "举办地点",
      "description": "展会简介（50-100字）",
      "category": "航空|锻造|工业|材料|综合",
      "sourceUrl": "展会官网或信息来源网址（真实可访问的URL）"
    }
  ]
}

包含 3-5 个近期或即将举办的展会。sourceUrl 必须是真实可访问的网址。`

  const result = await chatJSON(
    [{ role: 'system', content: systemPrompt }],
    { temperature: 0.8, maxTokens: 1024 }
  )

  return result.exhibitions || []
}

// ============================================================
// 市情雷达各模块生成器（每日更新）
// ============================================================

/**
 * 生成行业动态（多行业覆盖 + 原文链接）
 * 行业分类：航空航天、能源电力（核电/火电）、新能源（风电/光伏）、船舶、石化、机械、轨道交通、汽车、军工
 */
const generateRadarNews = async () => {
  const today = new Date().toISOString().split('T')[0]
  const systemPrompt = `你是锻造行业市场情报助手。请生成 8 条最新的行业动态，必须覆盖多个行业领域。

行业分类必须涵盖以下全部：航空航天、能源电力、新能源、船舶、石化、机械、轨道交通、汽车、军工。
每条动态需正确归类到上述行业分类之一。

返回 JSON 格式：
{
  "news": [
    {
      "id": "radar-news-N",
      "title": "动态标题",
      "source": "来源名称（如：中国锻造协会、中国特钢企业协会、中国有色金属工业协会、国家发改委、工信部等）",
      "sourceUrl": "真实可访问的原文链接网址（必须是真实存在的行业网站/政府网站/权威媒体对应栏目URL，便于用户点击核实）",
      "summary": "摘要（80-150字）",
      "keywords": ["关键词1", "关键词2", "关键词3"],
      "publishedAt": "YYYY-MM-DD",
      "category": "行业动态|技术突破|市场分析|招标动态|政策解读",
      "industry": "航空航天|能源电力|新能源|船舶|石化|机械|轨道交通|汽车|军工",
      "impactLevel": "高|中|低"
    }
  ]
}

要求：
1. 必须覆盖至少 6 个不同行业分类，不要只集中在航空航天；
2. sourceUrl 必须真实可访问，优先使用政府网站(.gov.cn)、行业协会官网、权威财经媒体；
3. publishedAt 使用今天日期 ${today} 或近一周内日期；
4. id 从 radar-news-1 递增。`

  const result = await chatJSON(
    [{ role: 'system', content: systemPrompt }],
    { temperature: 0.8, maxTokens: 2048 }
  )

  return (result.news || []).map((n, i) => ({
    id: n.id || `radar-news-${i + 1}`,
    title: n.title,
    source: n.source,
    sourceUrl: n.sourceUrl,
    summary: n.summary,
    keywords: n.keywords || [],
    publishedAt: n.publishedAt || today,
    category: n.category || '行业动态',
    industry: n.industry || '机械',
    impactLevel: n.impactLevel || '中',
  }))
}

/**
 * 生成原材料价格（含 30 天价格历史序列，每条材料走势各不相同）
 */
const generateRadarMaterials = async () => {
  const today = new Date().toISOString().split('T')[0]
  const systemPrompt = `你是金属材料市场数据助手。请生成当前主要锻造材料的参考价格，必须为每种材料生成独立的 30 天价格历史序列（每条材料的走势必须不同，反映各自市场供需）。

返回 JSON 格式：
{
  "materials": [
    {
      "id": "radar-mat-N",
      "name": "材料牌号",
      "category": "高温合金|钛合金|不锈钢|铝合金|合金钢",
      "price": 当前价格,
      "unit": "元/kg",
      "change": 涨跌幅百分比(保留2位小数),
      "changeAmount": 相对昨日涨跌金额,
      "description": "材料用途说明",
      "frequency": 使用次数整数,
      "source": "中国金属网",
      "lastUpdate": "${today}",
      "priceHistory": [30个数值, 表示最近30天每日价格, 走势须符合该材料实际市场波动, 各材料走势必须不同]
    }
  ]
}

包含以下材料：GH4169、GH4141、GH4099、Inconel718、TC4、TC11、17-4PH、304不锈钢、42CrMo、6061铝合金。
重要：priceHistory 数组长度必须为 30，最后一个值等于 price；不同材料的 priceHistory 走势必须明显不同（涨/跌/震荡），不能雷同。`

  const result = await chatJSON(
    [{ role: 'system', content: systemPrompt }],
    { temperature: 0.8, maxTokens: 3072 }
  )

  return (result.materials || []).map((m, i) => {
    const history = Array.isArray(m.priceHistory) && m.priceHistory.length > 0
      ? m.priceHistory
      : [m.price]
    // 确保最后一个值等于当前价格
    if (history[history.length - 1] !== m.price) {
      history[history.length - 1] = m.price
    }
    return {
      id: m.id || `radar-mat-${i + 1}`,
      name: m.name,
      category: m.category,
      price: m.price,
      unit: m.unit || '元/kg',
      change: m.change || 0,
      changeAmount: m.changeAmount || 0,
      description: m.description || '',
      frequency: m.frequency || 0,
      source: m.source || '中国金属网',
      lastUpdate: m.lastUpdate || today,
      priceHistory: history,
    }
  })
}

/**
 * 生成招投标信息（含来源链接）
 */
const generateRadarBidding = async () => {
  const today = new Date().toISOString().split('T')[0]
  const systemPrompt = `你是招投标信息情报助手。请生成 6 条与锻造/锻件/高温合金相关的最新招投标信息。

返回 JSON 格式：
{
  "bidding": [
    {
      "id": "radar-bid-N",
      "title": "招标标题",
      "org": "招标单位",
      "amount": 金额数字(万元),
      "deadline": "YYYY-MM-DD",
      "type": "tender",
      "industry": "航空航天|能源电力|新能源|船舶|石化|机械|轨道交通|汽车|军工",
      "status": "招标中|即将截止|已中标",
      "description": "项目描述（80-150字）",
      "requirements": ["要求1", "要求2"],
      "sourceName": "来源名称（如：中国航发电子招投标平台、央企招投标网、政府采购网等）",
      "sourceUrl": "真实可访问的招投标平台原文链接URL"
    }
  ]
}

要求：sourceUrl 必须真实可访问；deadline 在今天 ${today} 之后；id 从 radar-bid-1 递增。`

  const result = await chatJSON(
    [{ role: 'system', content: systemPrompt }],
    { temperature: 0.8, maxTokens: 2048 }
  )

  return (result.bidding || []).map((b, i) => ({
    id: b.id || `radar-bid-${i + 1}`,
    title: b.title,
    org: b.org,
    amount: b.amount || 0,
    deadline: b.deadline,
    type: 'tender',
    industry: b.industry || '机械',
    status: b.status || '招标中',
    description: b.description,
    requirements: b.requirements || [],
    competitors: [],
    sourceName: b.sourceName,
    sourceUrl: b.sourceUrl,
  }))
}

/**
 * 生成政策法规（含原文链接）
 */
const generateRadarPolicies = async () => {
  const today = new Date().toISOString().split('T')[0]
  const systemPrompt = `你是产业政策法规情报助手。请生成 5 条与锻造、新材料、高端装备、航空航天、能源装备相关的最新政策法规。

返回 JSON 格式：
{
  "policies": [
    {
      "id": "radar-pol-N",
      "title": "政策标题",
      "policyType": "产业规划|税收优惠|技术标准|节能环保|安全生产|行业准入",
      "department": "发文部门（如：工信部、国家发改委、财政部、国防科工局等）",
      "publishedAt": "YYYY-MM-DD",
      "keywords": ["关键词1", "关键词2"],
      "content": "政策要点内容（150-250字）",
      "summary": "一句话摘要",
      "sourceUrl": "真实可访问的政府网站原文链接URL（优先 .gov.cn 域名）",
      "salesImpact": "对派克新材销售的具体影响（50-100字）"
    }
  ]
}

要求：sourceUrl 必须真实可访问的政府官网；publishedAt 近一个月内；id 从 radar-pol-1 递增。`

  const result = await chatJSON(
    [{ role: 'system', content: systemPrompt }],
    { temperature: 0.8, maxTokens: 3072 }
  )

  return (result.policies || []).map((p, i) => ({
    id: p.id || `radar-pol-${i + 1}`,
    title: p.title,
    policyType: p.policyType || '产业规划',
    department: p.department,
    publishedAt: p.publishedAt || today,
    keywords: p.keywords || [],
    content: p.content,
    summary: p.summary || '',
    sourceUrl: p.sourceUrl,
    salesImpact: p.salesImpact,
  }))
}

/**
 * 生成行业展会（含官网链接）
 */
const generateRadarExhibitions = async () => {
  const today = new Date().toISOString().split('T')[0]
  const systemPrompt = `你是行业展会情报助手。请生成 4 个近期或即将举办的与锻造、航空航天、新材料、高端装备相关的展会。

返回 JSON 格式：
{
  "exhibitions": [
    {
      "id": "radar-exh-N",
      "title": "展会名称",
      "month": "举办月份",
      "location": "举办地点",
      "description": "展会简介（80-120字）",
      "importance": "重点|一般",
      "frequency": "一年一届|两年一届",
      "sourceUrl": "展会官网真实可访问URL"
    }
  ]
}

要求：sourceUrl 必须真实可访问；id 从 radar-exh-1 递增。`

  const result = await chatJSON(
    [{ role: 'system', content: systemPrompt }],
    { temperature: 0.8, maxTokens: 2048 }
  )

  return (result.exhibitions || []).map((e, i) => ({
    id: e.id || `radar-exh-${i + 1}`,
    title: e.title,
    month: e.month || '',
    location: e.location,
    description: e.description,
    importance: e.importance || '一般',
    frequency: e.frequency || '一年一届',
    sourceUrl: e.sourceUrl,
    keyCustomers: [],
    expectedRevenue: { estimateCount: '-', estimateValue: '-' },
    relatedBids: [],
    competitors: [],
    opportunityAssessment: [],
    strategy: { preShow: [], duringShow: [], afterShow: [] },
  }))
}

/**
 * 生成竞争对手动态（扒取派克新材竞争对手的公众号/官网/招投标）
 */
const generateCompetitors = async () => {
  const today = new Date().toISOString().split('T')[0]
  const competitorStr = COMPETITOR_LIST.filter(c => c !== '派克新材').join('、')
  const systemPrompt = `你是竞争情报分析助手，负责监控派克新材（高端锻件企业）主要竞争对手的最新动态。

派克新材主要竞争对手包括：${competitorStr}。

请基于这些竞争对手的微信公众号、企业官网、招投标平台、行业新闻，生成 10 条最新的竞争对手动态。

返回 JSON 格式：
{
  "competitors": [
    {
      "id": "comp-N",
      "competitorName": "竞争对手名称（必须是上述名单中的企业）",
      "channel": "公众号|官网|招投标|新闻",
      "title": "动态标题",
      "summary": "内容摘要（80-150字）",
      "publishedAt": "YYYY-MM-DD",
      "sourceName": "来源名称（如：XX企业公众号、XX官网、中国航发招投标平台等）",
      "sourceUrl": "真实可访问的信息来源网址URL",
      "category": "产品发布|中标信息|产能扩张|技术突破|合作动态|财务动态",
      "impactOnUs": "对派克新材的影响分析（50-100字）"
    }
  ]
}

要求：
1. 必须覆盖至少 5 家不同的竞争对手；
2. channel 必须包含公众号、官网、招投标、新闻四种渠道；
3. sourceUrl 必须真实可访问（企业官网、招投标平台、权威媒体）；
4. publishedAt 使用今天 ${today} 或近一周内日期；
5. id 从 comp-1 递增。`

  const result = await chatJSON(
    [{ role: 'system', content: systemPrompt }],
    { temperature: 0.8, maxTokens: 3072 }
  )

  return (result.competitors || []).map((c, i) => ({
    id: c.id || `comp-${i + 1}`,
    competitorName: c.competitorName,
    channel: c.channel || '新闻',
    title: c.title,
    summary: c.summary,
    publishedAt: c.publishedAt || today,
    sourceName: c.sourceName || '',
    sourceUrl: c.sourceUrl || '',
    category: c.category || '合作动态',
    impactOnUs: c.impactOnUs,
  }))
}

/**
 * 判断今日是否已更新过雷达数据
 */
const isRadarUpdatedToday = () => {
  if (!memoryData.radarLastUpdate) return false
  const last = new Date(memoryData.radarLastUpdate)
  const now = new Date()
  return last.getFullYear() === now.getFullYear()
    && last.getMonth() === now.getMonth()
    && last.getDate() === now.getDate()
}

/**
 * 执行每日数据更新（市情雷达各模块 + 旧版 AI市场数据）
 */
const runDailyUpdate = async () => {
  if (!isConfigured()) {
    console.log('[每日更新] DEEPSEEK_API_KEY 未配置，跳过数据更新')
    return
  }

  console.log('[每日更新] 开始更新市场数据...')

  // 市情雷达各模块并行更新
  const [
    radarNews,
    radarMaterials,
    radarBidding,
    radarPolicies,
    radarExhibitions,
    competitors,
    prices,
    news,
    exhibitions,
  ] = await Promise.all([
    generateRadarNews().catch((e) => { console.error('[每日更新] 行业动态失败:', e.message); return memoryData.radarNews }),
    generateRadarMaterials().catch((e) => { console.error('[每日更新] 原材料价格失败:', e.message); return memoryData.radarMaterials }),
    generateRadarBidding().catch((e) => { console.error('[每日更新] 招投标失败:', e.message); return memoryData.radarBidding }),
    generateRadarPolicies().catch((e) => { console.error('[每日更新] 政策法规失败:', e.message); return memoryData.radarPolicies }),
    generateRadarExhibitions().catch((e) => { console.error('[每日更新] 行业展会失败:', e.message); return memoryData.radarExhibitions }),
    generateCompetitors().catch((e) => { console.error('[每日更新] 竞争对手动态失败:', e.message); return memoryData.competitors }),
    generateMetalPrices().catch((e) => { console.error('[每日更新] 金属价格(旧)失败:', e.message); return memoryData.metalPrices }),
    generateIndustryNews().catch((e) => { console.error('[每日更新] 行业资讯(旧)失败:', e.message); return memoryData.industryNews }),
    generateExhibitions().catch((e) => { console.error('[每日更新] 展会(旧)失败:', e.message); return memoryData.exhibitions }),
  ])

  if (radarNews.length > 0) memoryData.radarNews = radarNews
  if (radarMaterials.length > 0) memoryData.radarMaterials = radarMaterials
  if (radarBidding.length > 0) memoryData.radarBidding = radarBidding
  if (radarPolicies.length > 0) memoryData.radarPolicies = radarPolicies
  if (radarExhibitions.length > 0) memoryData.radarExhibitions = radarExhibitions
  if (competitors.length > 0) memoryData.competitors = competitors
  if (prices.length > 0) memoryData.metalPrices = prices
  if (news.length > 0) memoryData.industryNews = news
  if (exhibitions.length > 0) memoryData.exhibitions = exhibitions

  memoryData.lastUpdate = new Date().toISOString()
  memoryData.radarLastUpdate = new Date().toISOString()

  console.log('[每日更新] 市场数据更新完成')
}

/**
 * 获取当前市场数据（含市情雷达各模块）
 */
const getMarketData = () => {
  return {
    // 旧版 AI市场数据
    metalPrices: memoryData.metalPrices,
    industryNews: memoryData.industryNews,
    exhibitions: memoryData.exhibitions,
    lastUpdate: memoryData.lastUpdate,
    // 市情雷达各模块
    radarNews: memoryData.radarNews,
    radarMaterials: memoryData.radarMaterials,
    radarBidding: memoryData.radarBidding,
    radarPolicies: memoryData.radarPolicies,
    radarExhibitions: memoryData.radarExhibitions,
    competitors: memoryData.competitors,
    radarLastUpdate: memoryData.radarLastUpdate,
  }
}

/**
 * 计算到次日 8:00 的毫秒数
 */
const getMsToNext8AM = () => {
  const now = new Date()
  const next8 = new Date(now)
  next8.setHours(8, 0, 0, 0)
  if (next8 <= now) {
    next8.setDate(next8.getDate() + 1)
  }
  return next8 - now
}

let updateTimer = null

/**
 * 启动定时更新（每天 8:00 自动更新；首次启动若今日未更新则立即更新）
 */
const startDailyUpdate = () => {
  if (!isRadarUpdatedToday()) {
    console.log('[每日更新] 首次启动或今日未更新，立即更新数据...')
    runDailyUpdate()
  } else {
    console.log('[每日更新] 今日已更新，等待下次定时更新')
  }

  // 设置定时器：每天 8:00 执行
  const scheduleNext = () => {
    const msToNext = getMsToNext8AM()
    console.log(`[每日更新] 下次更新将在 ${Math.round(msToNext / 1000 / 60)} 分钟后执行`)

    if (updateTimer) clearTimeout(updateTimer)
    updateTimer = setTimeout(() => {
      runDailyUpdate()
      scheduleNext()
    }, msToNext)
  }

  scheduleNext()
}

module.exports = {
  runDailyUpdate,
  getMarketData,
  startDailyUpdate,
  isRadarUpdatedToday,
}
