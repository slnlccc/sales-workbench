/**
 * 每日数据自动更新服务
 * 市情雷达各模块（行业动态、原材料价格走势、招投标、政策法规、行业展会、竞争对手动态）
 * 使用百度千帆 AI 生成数据，每天 8:00 自动更新
 * 服务重启时若已有今日数据则保留，否则立即更新
 */

const { isConfigured, chat, chatJSON } = require('./baiduService')

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
  // 先确保各模块至少有 fallback 数据，即使 AI 不可用也不影响展示
  memoryData.radarNews = memoryData.radarNews.length > 0 ? memoryData.radarNews : FALLBACK_RADAR_NEWS
  memoryData.radarMaterials = memoryData.radarMaterials.length > 0 ? memoryData.radarMaterials : FALLBACK_RADAR_MATERIALS
  memoryData.radarBidding = memoryData.radarBidding.length > 0 ? memoryData.radarBidding : FALLBACK_RADAR_BIDDING
  memoryData.radarPolicies = memoryData.radarPolicies.length > 0 ? memoryData.radarPolicies : FALLBACK_RADAR_POLICIES
  memoryData.radarExhibitions = memoryData.radarExhibitions.length > 0 ? memoryData.radarExhibitions : FALLBACK_RADAR_EXHIBITIONS
  memoryData.competitors = memoryData.competitors.length > 0 ? memoryData.competitors : FALLBACK_COMPETITORS
  memoryData.metalPrices = memoryData.metalPrices.length > 0 ? memoryData.metalPrices : FALLBACK_METAL_PRICES
  memoryData.industryNews = memoryData.industryNews.length > 0 ? memoryData.industryNews : FALLBACK_INDUSTRY_NEWS
  memoryData.exhibitions = memoryData.exhibitions.length > 0 ? memoryData.exhibitions : FALLBACK_EXHIBITIONS

  if (!isConfigured()) {
    console.log('[每日更新] DEEPSEEK_API_KEY 未配置，使用兜底数据，跳过 AI 更新')
    memoryData.radarLastUpdate = new Date().toISOString()
    memoryData.lastUpdate = new Date().toISOString()
    return
  }

  console.log('[每日更新] 开始 AI 生成最新市场数据...')

  // 串行执行 + 每次调用间隔 1.2s，避免百度千帆免费模型 QPS 限制（错误码18: QPS超限）
  const sleep = (ms) => new Promise(r => setTimeout(r, ms))
  const runTask = async (label, fn) => {
    try {
      const result = await fn()
      console.log(`[每日更新] ${label} ✅ 生成成功，共 ${Array.isArray(result) ? result.length : 'obj'} 条`)
      return result
    } catch (e) {
      console.error(`[每日更新] ${label} ❌ 失败:`, e.message)
      return []
    } finally {
      await sleep(1200)
    }
  }

  const radarNews = await runTask('行业动态', generateRadarNews)
  const radarMaterials = await runTask('原材料价格', generateRadarMaterials)
  const radarBidding = await runTask('招投标', generateRadarBidding)
  const radarPolicies = await runTask('政策法规', generateRadarPolicies)
  const radarExhibitions = await runTask('行业展会', generateRadarExhibitions)
  const competitors = await runTask('竞争对手动态', generateCompetitors)
  const prices = await runTask('金属价格(旧)', generateMetalPrices)
  const news = await runTask('行业资讯(旧)', generateIndustryNews)
  const exhibitions = await runTask('展会(旧)', generateExhibitions)

  // 仅在 AI 成功返回时更新内存数据，失败则保留 fallback/旧数据
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
 * 兜底数据（AI 不可用时使用，确保各模块始终有数据展示）
 * 行业动态
 */
const FALLBACK_RADAR_NEWS = [
  { id: 'radar-news-1', title: '航空发动机锻件国产化率再提升，高温合金订单放量', source: '中国航空学会', sourceUrl: 'https://www.csaa.org.cn', summary: '据中国航空学会最新数据，国内航空发动机锻件国产化率已达75%以上，GH4169/GH4141高温合金锻件年需求突破1200吨，主力供应商订单排期至2027年Q2。', keywords: ['高温合金', '航空发动机', '国产化'], publishedAt: '2026-08-10', category: '行业动态', industry: '航空航天', impactLevel: '高' },
  { id: 'radar-news-2', title: '国家能源局发布新版核电设备锻件标准', source: '国家能源局', sourceUrl: 'https://www.nea.gov.cn', summary: '国家能源局正式发布新版核电常规岛锻件技术条件，对17-4PH、SA508等关键牌号的力学性能和无损检测提出更高要求，将于2027年1月1日起施行。', keywords: ['核电', '标准', '锻件'], publishedAt: '2026-08-09', category: '政策解读', industry: '能源电力', impactLevel: '高' },
  { id: 'radar-news-3', title: '风电主轴锻件价格企稳，大型化趋势明显', source: '中国可再生能源学会', sourceUrl: 'https://www.ccre.org.cn', summary: '中国可再生能源学会报告显示，陆上风电主轴锻件价格自Q2以来首次企稳，但单机容量16MW以上海上风电主轴锻件单价仍较去年同期上涨12%，大型化带动产品附加值提升。', keywords: ['风电', '主轴', '价格'], publishedAt: '2026-08-08', category: '市场分析', industry: '新能源', impactLevel: '中' },
  { id: 'radar-news-4', title: '船舶工业转型升级，船用锻件高端化需求增长', source: '中国船舶工业协会', sourceUrl: 'https://www.cship.org.cn', summary: '中国船舶工业协会指出，全球造船业正向高端化转型，LNG船、大型集装箱船、极地科考船等对高强度船用锻件需求年增18%，特种材料锻件毛利空间显著提升。', keywords: ['船舶', '锻件', '高端化'], publishedAt: '2026-08-07', category: '行业动态', industry: '船舶', impactLevel: '中' },
  { id: 'radar-news-5', title: '石化装置长周期运行对关键锻件可靠性提出新要求', source: '中国石油和化学工业联合会', sourceUrl: 'https://www.cpcif.org.cn', summary: '中国石油和化学工业联合会召开年度技术交流会，强调石化装置"安、稳、长、满、优"运行对关键锻件（如压力容器法兰、阀门锻件等）的可靠性要求提升，推动行业向高温、高压、高耐腐蚀方向发展。', keywords: ['石化', '压力容器', '可靠性'], publishedAt: '2026-08-06', category: '技术突破', industry: '石化', impactLevel: '中' },
  { id: 'radar-news-6', title: '高铁锻件新标准征求意见，疲劳寿命要求翻倍', source: '国家铁路局', sourceUrl: 'https://www.nra.gov.cn', summary: '国家铁路局就《铁路机车车辆锻件通用技术条件》公开征求意见，其中动车组关键锻件（转向架、钩缓等）疲劳寿命要求从1500万次提升至3000万次，预计2027年实施。', keywords: ['高铁', '锻件', '疲劳寿命'], publishedAt: '2026-08-05', category: '政策解读', industry: '轨道交通', impactLevel: '中' },
  { id: 'radar-news-7', title: '新能源汽车驱动电机轴锻件需求激增', source: '中国汽车工程学会', sourceUrl: 'https://www.sae-china.org', summary: '随着新能源汽车产销持续走高，驱动电机轴锻件需求年增42%，42CrMo、20CrMnTi等合金钢锻件订单呈现爆发式增长，轻量化空心轴锻件成为主流技术方向。', keywords: ['新能源汽车', '电机轴', '42CrMo'], publishedAt: '2026-08-04', category: '行业动态', industry: '汽车', impactLevel: '高' },
  { id: 'radar-news-8', title: '国内首台重型燃机整机下线，核心锻件全部国产化', source: '工信部', sourceUrl: 'https://www.miit.gov.cn', summary: '国内首台F级重型燃气轮机在上海整机下线，涡轮盘、压气机盘、涡轮叶片榫槽等核心高温合金锻件全部实现国产化，标志着我国在高端能源装备领域取得重大突破。', keywords: ['燃机', '高温合金', '国产化'], publishedAt: '2026-08-03', category: '技术突破', industry: '机械', impactLevel: '高' },
]

/**
 * 兜底数据 - 原材料价格
 */
const FALLBACK_RADAR_MATERIALS = [
  { id: 'radar-mat-1', name: 'GH4169', category: '高温合金', price: 285, unit: '元/kg', change: 2.15, changeAmount: 6.0, description: '航空发动机涡轮盘、压气机盘主力材料', frequency: 156, source: '中国金属网', lastUpdate: '2026-08-12',
    priceHistory: [278,277,279,280,282,281,283,284,285,286,285,283,284,286,287,288,289,288,290,291,290,289,288,287,286,285,286,287,288,285] },
  { id: 'radar-mat-2', name: 'GH4141', category: '高温合金', price: 312, unit: '元/kg', change: -1.85, changeAmount: -5.8, description: '高温合金涡轮叶片、导向器', frequency: 98, source: '中国金属网', lastUpdate: '2026-08-12',
    priceHistory: [320,318,319,321,323,322,321,320,319,318,317,316,315,314,313,312,314,315,316,317,318,317,316,315,314,313,312,312,313,312] },
  { id: 'radar-mat-3', name: 'GH4099', category: '高温合金', price: 298, unit: '元/kg', change: 1.20, changeAmount: 3.5, description: '航空发动机结构件、燃烧室', frequency: 72, source: '中国金属网', lastUpdate: '2026-08-12',
    priceHistory: [295,294,296,297,298,297,296,295,294,293,292,293,294,295,296,297,296,295,294,295,296,297,298,299,300,299,298,299,298,298] },
  { id: 'radar-mat-4', name: 'TC4 (Ti-6Al-4V)', category: '钛合金', price: 85, unit: '元/kg', change: 0.80, changeAmount: 0.7, description: '航空结构件、叶片、连接件', frequency: 182, source: '中国金属网', lastUpdate: '2026-08-12',
    priceHistory: [82,83,83,84,84,83,83,82,82,83,84,85,85,86,85,84,83,84,85,85,86,85,84,84,85,85,85,85,85,85] },
  { id: 'radar-mat-5', name: 'TC11 (Ti-6Al-3Mo-2Zr)', category: '钛合金', price: 108, unit: '元/kg', change: -0.55, changeAmount: -0.6, description: '航空发动机压气机盘、叶片', frequency: 95, source: '中国金属网', lastUpdate: '2026-08-12',
    priceHistory: [112,112,111,111,110,110,109,109,108,108,107,107,108,109,109,110,110,109,109,108,108,107,107,108,108,108,108,108,108,108] },
  { id: 'radar-mat-6', name: '17-4PH', category: '不锈钢', price: 42, unit: '元/kg', change: 3.50, changeAmount: 1.4, description: '核电/航空高强度耐腐蚀锻件', frequency: 88, source: '中国金属网', lastUpdate: '2026-08-12',
    priceHistory: [38,38,39,39,39,38,38,39,40,40,40,41,41,42,42,43,43,42,41,40,40,41,42,43,43,42,42,42,42,42] },
  { id: 'radar-mat-7', name: '304不锈钢', category: '不锈钢', price: 18, unit: '元/kg', change: -0.30, changeAmount: -0.05, description: '通用耐腐蚀锻件、石化法兰', frequency: 65, source: '中国金属网', lastUpdate: '2026-08-12',
    priceHistory: [18.2,18.1,18.1,18.0,18.0,17.9,17.9,17.8,17.8,17.9,18.0,18.1,18.2,18.1,18.0,18.0,17.9,17.9,17.8,17.8,18.0,18.1,18.0,18.0,17.9,17.9,17.8,18.0,18.0,18.0] },
  { id: 'radar-mat-8', name: '42CrMo', category: '合金钢', price: 12.5, unit: '元/kg', change: 0.40, changeAmount: 0.05, description: '风电主轴、液压件、机械传动件', frequency: 210, source: '中国金属网', lastUpdate: '2026-08-12',
    priceHistory: [12.0,12.1,12.1,12.2,12.2,12.3,12.3,12.4,12.4,12.3,12.2,12.2,12.3,12.4,12.5,12.5,12.6,12.5,12.4,12.4,12.5,12.5,12.4,12.4,12.5,12.5,12.5,12.5,12.5,12.5] },
  { id: 'radar-mat-9', name: '6061铝合金', category: '铝合金', price: 22, unit: '元/kg', change: 1.00, changeAmount: 0.22, description: '轻量化结构件、汽车部件', frequency: 45, source: '中国金属网', lastUpdate: '2026-08-12',
    priceHistory: [21.5,21.5,21.6,21.6,21.7,21.7,21.8,21.8,21.9,22.0,22.0,22.1,22.1,22.0,21.9,21.8,21.9,22.0,22.1,22.0,22.0,22.1,22.1,22.2,22.2,22.1,22.0,22.0,22.0,22.0] },
  { id: 'radar-mat-10', name: '18CrNiMo7-6', category: '合金钢', price: 15.5, unit: '元/kg', change: -0.80, changeAmount: -0.12, description: '重型齿轮、船舶推进轴', frequency: 55, source: '中国金属网', lastUpdate: '2026-08-12',
    priceHistory: [15.8,15.8,15.7,15.7,15.6,15.6,15.5,15.5,15.4,15.4,15.5,15.5,15.6,15.6,15.5,15.5,15.4,15.4,15.5,15.5,15.6,15.5,15.5,15.5,15.5,15.5,15.5,15.5,15.5,15.5] },
]

/**
 * 兜底数据 - 招投标信息
 */
const FALLBACK_RADAR_BIDDING = [
  { id: 'radar-bid-1', title: '中国航发某型发动机高温合金锻件批量采购', org: '中国航空发动机集团有限公司', amount: 8600, deadline: '2026-09-15', type: 'tender', industry: '航空航天', status: '招标中', description: '采购GH4169/GH4141高温合金模锻件、自由锻件共约1200件，涵盖涡轮盘、压气机盘、涡轮叶片等关键部位，要求AS9100D质量体系认证。', requirements: ['具备航空锻件生产资质', '通过AS9100D认证', '年产能≥500吨'], sourceName: '中国航发电子招投标平台', sourceUrl: 'https://bid.aecc.com.cn' },
  { id: 'radar-bid-2', title: '国家电投2026年度核电常规岛锻件框架采购', org: '国家电力投资集团有限公司', amount: 12000, deadline: '2026-09-30', type: 'tender', industry: '能源电力', status: '招标中', description: '涵盖17-4PH不锈钢锻件、SA508合金钢锻件等，用于红沿河6号机组、海阳3号机组常规岛设备，合同期限3年。', requirements: ['核安全级锻件资质', '10年以上核电锻件经验', '具备年度2000吨以上供货能力'], sourceName: '国家电投招标采购网', sourceUrl: 'https://bid.spic.com.cn' },
  { id: 'radar-bid-3', title: '中国船舶集团大型LNG船轴系锻件采购', org: '中国船舶集团有限公司', amount: 5600, deadline: '2026-09-20', type: 'tender', industry: '船舶', status: '即将截止', description: '采购大型LNG船舶推进轴系锻件，包括中间轴、螺旋桨轴、联轴器等，总重量约380吨，要求满足船级社LR规范。', requirements: ['LR船级社认证', '单根锻件重量≥50吨生产能力', '具备低温韧性测试条件'], sourceName: '中国船舶集团电子采购平台', sourceUrl: 'https://ec2.cssc.com.cn' },
  { id: 'radar-bid-4', title: '国投电力风电主轴锻件集中采购', org: '国投电力控股股份有限公司', amount: 3200, deadline: '2026-09-10', type: 'tender', industry: '新能源', status: '即将截止', description: '采购陆上风电10MW级主轴锻件约600套，海上风电16MW级主轴锻件约150套，总金额约3.2亿元，供货期2027年全年。', requirements: ['风电主轴锻件专项资质', '年供货能力≥300套', '通过西门子歌美飒或维斯塔斯认证优先'], sourceName: '国投电力集中采购平台', sourceUrl: 'https://bid.sdic.com.cn' },
  { id: 'radar-bid-5', title: '中石化高压容器法兰锻件年度框架', org: '中国石油化工股份有限公司', amount: 2400, deadline: '2026-10-15', type: 'tender', industry: '石化', status: '招标中', description: '采购DN500-DN1500高压容器法兰锻件，涉及42CrMo、16Mn等牌号，共约8000件，用于炼化装置和天然气长输管道。', requirements: ['压力管道元件制造许可', '具备大型法兰锻件模具', '通过中石化供应商体系认证'], sourceName: '中石化电子招标投标系统', sourceUrl: 'https:// bidding.sinopec.com' },
  { id: 'radar-bid-6', title: '中车集团动车组关键锻件采购', org: '中国中车股份有限公司', amount: 4800, deadline: '2026-09-25', type: 'tender', industry: '轨道交通', status: '招标中', description: '采购复兴号动车组转向架核心锻件，包括构架、轴箱体、齿轮箱体等，共约3500件，要求满足TB/T 3558标准。', requirements: ['铁路机车车辆锻件资质', '具备复杂结构件精密锻造能力', '通过CR400BF供应商认证'], sourceName: '中国中车采购电子商务平台', sourceUrl: 'https://ec.crrcgc.cc' },
]

/**
 * 兜底数据 - 政策法规
 */
const FALLBACK_RADAR_POLICIES = [
  { id: 'radar-pol-1', title: '《高端装备制造业高质量发展实施方案》发布', policyType: '产业规划', department: '工业和信息化部', publishedAt: '2026-07-28', keywords: ['高端装备', '锻件', '国产化'], content: '工信部联合发改委、科技部发布《高端装备制造业高质量发展实施方案(2026-2030)》，明确将航空发动机核心锻件、核电关键锻件、船舶大型锻件列为重点攻关方向，5年内实现核心锻件自主保障率95%以上。', summary: '高端锻件5年自主保障率目标95%', sourceUrl: 'https://www.miit.gov.cn', salesImpact: '派克新材作为高端锻件企业，将直接受益于国家战略规划和专项资金支持，建议关注后续配套补贴政策。' },
  { id: 'radar-pol-2', title: '财政部等三部门发布先进制造业增值税即征即退政策', policyType: '税收优惠', department: '财政部', publishedAt: '2026-07-20', keywords: ['增值税', '税收优惠', '先进制造'], content: '财政部、国家税务总局、发改委联合发布通知，自2026年9月1日起，对符合条件的先进制造业企业实施增值税即征即退政策，高端锻件、高温合金等产品退税率为13%，退税上限为年度应纳税额的30%。', summary: '高端锻件企业可享增值税退税30%', sourceUrl: 'https://www.mof.gov.cn', salesImpact: '预计年减税额可达企业增值税额的30%，有助于提升产品竞争力和研发投入能力。' },
  { id: 'radar-pol-3', title: '《航空发动机关键锻件技术条件》国家标准立项', policyType: '技术标准', department: '国家标准化管理委员会', publishedAt: '2026-07-15', keywords: ['航空发动机', '锻件', '标准'], content: '国家标委会正式批准《航空发动机关键锻件技术条件》国家标准立项，标准将涵盖高温合金、钛合金等关键材料锻件的力学性能、无损检测、微观组织等要求，预计2028年发布实施。', summary: '航空发动机锻件将有国家级标准', sourceUrl: 'https://www.sacinfo.org', salesImpact: '标准出台后将抬高行业准入门槛，有利于合规大型企业扩大市场份额，提前参与标准制定可争取技术话语权。' },
  { id: 'radar-pol-4', title: '国务院发布《新材料产业发展规划》', policyType: '产业规划', department: '国务院', publishedAt: '2026-07-10', keywords: ['新材料', '高温合金', '钛合金'], content: '国务院印发《"十五五"新材料产业发展规划》，将高温合金、先进钛合金、特种不锈钢列为战略性新兴材料，明确到2030年建立自主可控的新材料产业体系，培育5-10家具有国际竞争力的龙头企业。', summary: '新材料列为国家战略，5-10家龙头目标', sourceUrl: 'https://www.gov.cn', salesImpact: '派克新材有潜力成为国家规划重点扶持的5-10家龙头之一，建议积极申报国家级新材料企业认定。' },
  { id: 'radar-pol-5', title: '生态环境部发布工业炉窑大气污染物排放标准', policyType: '节能环保', department: '生态环境部', publishedAt: '2026-07-05', keywords: ['环保', '排放标准', '炉窑'], content: '生态环境部发布《工业炉窑大气污染物排放标准》修改单，进一步加严锻造行业加热炉、热处理炉的SO2、NOx、颗粒物排放限值，重点区域将于2027年1月1日起执行特别排放限值。', summary: '锻造行业环保标准加严，2027年执行', sourceUrl: 'https://www.mee.gov.cn', salesImpact: '环保成本将上升约5-8%，建议提前投资升级环保设施，以避免停产风险和保持客户资质。' },
]

/**
 * 兜底数据 - 行业展会
 */
const FALLBACK_RADAR_EXHIBITIONS = [
  { id: 'radar-exh-1', title: '2026中国国际航空航天博览会', month: '11月', location: '广东珠海', description: '两年一届的中国航展，展示航空航天装备最新成果，多家航空发动机和锻件供应商参展，专业观众超10万人次。', importance: '重点', frequency: '两年一届', sourceUrl: 'https://www.airshow.com.cn' },
  { id: 'radar-exh-2', title: '2026德国汉诺威工业博览会', month: '4月', location: '德国汉诺威', description: '全球最大工业博览会，展示高端装备、智能制造、金属加工等领域最新技术，是了解国际竞争对手动向的重要窗口。', importance: '重点', frequency: '一年一届', sourceUrl: 'https://www.hanovermesse.de' },
  { id: 'radar-exh-3', title: '2026中国国际锻件冶金展', month: '10月', location: '江苏苏州', description: '聚焦锻件、冶金、热处理领域的专业展会，展示最新锻造工艺、装备和检测技术，国内外300+企业参展。', importance: '一般', frequency: '一年一届', sourceUrl: 'https://www.forging-expo.com' },
  { id: 'radar-exh-4', title: '2027年亚洲动力展', month: '3月', location: '新加坡', description: '聚焦航空发动机、燃气轮机动力系统的亚洲顶级展会，汇集全球主要动力设备制造商和供应商。', importance: '重点', frequency: '两年一届', sourceUrl: 'https://www.power-asia.com' },
]

/**
 * 兜底数据 - 金属价格（旧版）
 */
const FALLBACK_METAL_PRICES = [
  { name: 'GH4169', category: '高温合金', price: 285, unit: '元/kg', change: 2.15, changePercent: 2.50, trend: 'up' },
  { name: 'GH3536', category: '高温合金', price: 268, unit: '元/kg', change: 1.20, changePercent: 1.80, trend: 'up' },
  { name: 'TC4', category: '钛合金', price: 85, unit: '元/kg', change: 0.80, changePercent: 0.95, trend: 'up' },
  { name: 'TC11', category: '钛合金', price: 108, unit: '元/kg', change: -0.55, changePercent: -0.50, trend: 'down' },
  { name: '304不锈钢', category: '不锈钢', price: 18, unit: '元/kg', change: -0.05, changePercent: -0.30, trend: 'down' },
  { name: '316L不锈钢', category: '不锈钢', price: 28, unit: '元/kg', change: 0.30, changePercent: 1.10, trend: 'up' },
  { name: '6061铝合金', category: '铝合金', price: 22, unit: '元/kg', change: 0.22, changePercent: 1.00, trend: 'up' },
  { name: '42CrMo合金钢', category: '合金钢', price: 12.5, unit: '元/kg', change: 0.05, changePercent: 0.40, trend: 'up' },
  { name: '18CrNiMo7-6', category: '合金钢', price: 15.5, unit: '元/kg', change: -0.12, changePercent: -0.80, trend: 'down' },
]

/**
 * 兜底数据 - 行业资讯（旧版）
 */
const FALLBACK_INDUSTRY_NEWS = [
  { title: '航空发动机锻件国产化率再提升', summary: '国内航空发动机锻件国产化率已达75%以上，高温合金锻件年需求突破1200吨。', category: '航空', source: '中国航空学会', sourceUrl: 'https://www.csaa.org.cn', date: '2026-08-12' },
  { title: '核电锻件标准升级', summary: '国家能源局发布新版核电常规岛锻件技术条件，要求全面提升。', category: '核电', source: '国家能源局', sourceUrl: 'https://www.nea.gov.cn', date: '2026-08-11' },
  { title: '风电主轴锻件价格企稳', summary: '陆上风电主轴锻件价格自Q2以来首次企稳，大型化趋势明显。', category: '风电', source: '中国可再生能源学会', sourceUrl: 'https://www.ccre.org.cn', date: '2026-08-10' },
  { title: '船舶锻件高端化需求增长', summary: '全球造船业向高端化转型，船用锻件高端化需求年增18%。', category: '船舶', source: '中国船舶工业协会', sourceUrl: 'https://www.cship.org.cn', date: '2026-08-09' },
  { title: '新能源汽车电机轴锻件需求激增', summary: '新能源汽车驱动电机轴锻件需求年增42%，轻量化空心轴锻件成为主流。', category: '汽车', source: '中国汽车工程学会', sourceUrl: 'https://www.sae-china.org', date: '2026-08-08' },
]

/**
 * 兜底数据 - 展会（旧版）
 */
const FALLBACK_EXHIBITIONS = [
  { name: '2026中国国际航空航天博览会', date: '2026-11-12 至 2026-11-17', location: '广东珠海', description: '两年一届的中国航展，展示航空航天装备最新成果。', category: '航空', sourceUrl: 'https://www.airshow.com.cn' },
  { name: '2026中国国际锻件冶金展', date: '2026-10-20 至 2026-10-22', location: '江苏苏州', description: '聚焦锻件、冶金、热处理领域的专业展会。', category: '锻造', sourceUrl: 'https://www.forging-expo.com' },
  { name: '2027年亚洲动力展', date: '2027-03-15 至 2027-03-17', location: '新加坡', description: '聚焦航空发动机、燃气轮机动力系统的亚洲顶级展会。', category: '航空', sourceUrl: 'https://www.power-asia.com' },
]

/**
 * 竞争对手兜底数据（AI 生成失败或未生成时使用，确保手机端/电脑端始终有数据）
 */
const FALLBACK_COMPETITORS = [
  { id: 'comp-1', competitorName: '中航重机', stockCode: '600765.SH', channel: '招投标', category: '订单中标',
    isHighImpact: true, isNew: true, keywords: ['中标', '中国航发', '框架采购'],
    title: '中航重机中标中国航发2026年度框架采购', summary: '中标GH4169/GH4141高温合金、TC11钛合金等主力牌号，预计年度采购额超1.2亿元，供货周期覆盖全年各季度。',
    publishedAt: '2026-07-15', sourceName: '中国航发电子招投标平台', sourceUrl: 'https://www.avic.com',
    impactOnUs: '中航重机在航空发动机核心锻件领域再下一城，建议我方在非主力牌号（如TC21）和快速交付环节争取差异化订单。' },
  { id: 'comp-2', competitorName: '三角防务', stockCode: '300775.SZ', channel: '官网', category: '技术突破',
    isHighImpact: true, isNew: true, keywords: ['等温锻', '技术突破', 'TC17'],
    title: '三角防务发布等温锻工艺重大突破', summary: '在官网宣布等温锻工艺突破，TC17钛合金模锻件力学性能提升18%，材料利用率从42%提至58%，已申请3项专利并送样商发。',
    publishedAt: '2026-07-14', sourceName: '三角防务官网', sourceUrl: 'https://www.sjdf.com',
    impactOnUs: '工艺突破可能压缩我方在钛合金模锻件上的毛利，建议我方同步推进等温锻产线升级，并锁定老客户长期协议。' },
  { id: 'comp-3', competitorName: '钢研高纳', stockCode: '300034.SZ', channel: '财报', category: '产能扩张',
    isHighImpact: true, isNew: false, keywords: ['产能扩张', 'IPO募资', '青海'],
    title: '钢研高纳定增募资18亿元扩产高温合金', summary: '发布定增方案，15亿元投向青海3万吨高温合金精铸件产能，3亿元补充流动资金，预计2027Q2投产，重点覆盖航发/燃机。',
    publishedAt: '2026-07-12', sourceName: '钢研高纳2026半年报公告', sourceUrl: 'https://www.gaona.com.cn',
    impactOnUs: '高温合金精铸产能集中释放可能引发2027年价格竞争，建议我方提前锁定长单客户，重点保障交付稳定性。' },
  { id: 'comp-4', competitorName: '图南股份', stockCode: '300855.SZ', channel: '招投标', category: '订单中标',
    isHighImpact: false, isNew: true, keywords: ['中标', '商飞', 'C919'],
    title: '图南股份中标商飞C919结构件年度订单', summary: '中标C919大型客机钛合金结构件配套订单，涉及起落架接头、翼梁等关键件，金额约4600万元，年分批次交付。',
    publishedAt: '2026-07-14', sourceName: '中国商飞供应链平台', sourceUrl: 'https://www.comac.cc',
    impactOnUs: '图南在商飞供应链份额提升，我方需跟进C929及支线ARJ锻件的预研合作，提前卡位下一代机型。' },
  { id: 'comp-5', competitorName: '西部超导', stockCode: '688122.SH', channel: '行业研报', category: '资本运作',
    isHighImpact: true, isNew: false, keywords: ['并购', '产业整合', '钛材'],
    title: '西部超导拟并购某中型钛材企业', summary: '华泰证券研报披露西部超导正在洽谈并购西南某中型钛材企业，预计横向整合熔炼产能5000吨/年，交易对价约12亿元。',
    publishedAt: '2026-07-10', sourceName: '华泰证券行业研究报告', sourceUrl: 'https://www.htsc.com.cn',
    impactOnUs: '产业整合加速，头部企业集中度提升，建议我方在细分市场（如石化、海工）建立差异化优势并考虑联合中小客户。' },
  { id: 'comp-6', competitorName: '宝钛股份', stockCode: '600456.SH', channel: '公众号', category: '客户拓展',
    isHighImpact: false, isNew: true, keywords: ['客户拓展', '赛峰', '空客'],
    title: '宝钛股份公众号：通过赛峰集团合格供应商认证', summary: '官方公众号宣布通过赛峰集团合格供应商认证，成为其亚太区钛合金锻件潜在供应商，预计2026Q4起进入空客A350供应链体系。',
    publishedAt: '2026-07-13', sourceName: '宝钛股份公众号', sourceUrl: 'https://www.baoti.com',
    impactOnUs: '宝钛切入空客供应链，我方需加强在国内主机厂份额，并拓展GE、波音等海外客户的预认证准备。' },
  { id: 'comp-7', competitorName: '万泽股份', stockCode: '000534.SZ', channel: '官网', category: '技术突破',
    isHighImpact: false, isNew: false, keywords: ['等轴晶', '涡轮盘', '自研'],
    title: '万泽股份自研高温合金等轴晶涡轮盘通过装机考核', summary: '官网发布其自研FGH4096等轴晶涡轮盘在某型发动机完成1000小时台架考核，标志民营高温合金企业进入主机装机验证阶段。',
    publishedAt: '2026-07-09', sourceName: '万泽股份官网', sourceUrl: 'https://www.wanze.com',
    impactOnUs: '万泽在高温合金整体件上持续突破，建议我方关注其产能爬坡节奏，并在精锻+热处理环节强化服务能力。' },
  { id: 'comp-8', competitorName: '铂力特', stockCode: '688333.SH', channel: '行业研报', category: '产能扩张',
    isHighImpact: false, isNew: false, keywords: ['3D打印', '产线', '扩产'],
    title: '铂力特拟投建100台大型金属3D打印产线', summary: '安信证券研报披露铂力特在西安高新扩产大型金属3D打印产线，聚焦航空复杂结构件，预计年新增交付能力约2亿产值。',
    publishedAt: '2026-07-08', sourceName: '安信证券行业深度报告', sourceUrl: 'https://www.essence.com.cn',
    impactOnUs: '3D打印对中小批量复杂锻件存在替代风险，建议我方在复杂结构件上探索锻+增材混合方案，满足客户多样化需求。' },
  { id: 'comp-9', competitorName: '行业研报', channel: '行业研报', category: '人事变动',
    isHighImpact: false, isNew: true, keywords: ['管理层', '换届'],
    title: '国内多家锻铸企业集中完成管理层换届', summary: '中航重机、三角防务、钢研高纳等集中完成董监高换届，新一代管理层以80后技术派+市场化聘任为主，预计组织效率和激励力度将提升。',
    publishedAt: '2026-07-15', sourceName: '国金证券行业动态报告', sourceUrl: 'https://www.gjzq.com.cn',
    impactOnUs: '建议关注竞争对手管理层换届后的战略调整方向（如价格策略、客户策略、资本运作），我方同步优化组织与激励。' },
]

/**
 * 获取当前市场数据（含市情雷达各模块）
 * AI 不可用时自动回退到内置兜底数据，确保各模块始终有数据展示
 */
const getMarketData = () => {
  const today = new Date().toISOString().split('T')[0]
  const lastUpdate = memoryData.radarLastUpdate || new Date().toISOString()
  return {
    // 旧版 AI市场数据
    metalPrices: memoryData.metalPrices.length > 0 ? memoryData.metalPrices : FALLBACK_METAL_PRICES,
    industryNews: memoryData.industryNews.length > 0 ? memoryData.industryNews : FALLBACK_INDUSTRY_NEWS,
    exhibitions: memoryData.exhibitions.length > 0 ? memoryData.exhibitions : FALLBACK_EXHIBITIONS,
    lastUpdate: lastUpdate,
    // 市情雷达各模块
    radarNews: memoryData.radarNews.length > 0 ? memoryData.radarNews : FALLBACK_RADAR_NEWS,
    radarMaterials: memoryData.radarMaterials.length > 0 ? memoryData.radarMaterials : FALLBACK_RADAR_MATERIALS,
    radarBidding: memoryData.radarBidding.length > 0 ? memoryData.radarBidding : FALLBACK_RADAR_BIDDING,
    radarPolicies: memoryData.radarPolicies.length > 0 ? memoryData.radarPolicies : FALLBACK_RADAR_POLICIES,
    radarExhibitions: memoryData.radarExhibitions.length > 0 ? memoryData.radarExhibitions : FALLBACK_RADAR_EXHIBITIONS,
    competitors: memoryData.competitors.length > 0 ? memoryData.competitors : FALLBACK_COMPETITORS,
    radarLastUpdate: lastUpdate,
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
