/**
 * 每日数据自动更新服务
 * 金属价格、行业资讯、展会信息定时更新
 * 使用 DeepSeek AI 生成数据，每天 8:00 自动更新
 */

const { isConfigured, chat, chatJSON } = require('./deepseekService')

// 内存存储（当 MongoDB 不可用时使用）
let memoryData = {
  metalPrices: [],
  industryNews: [],
  exhibitions: [],
  lastUpdate: null,
}

/**
 * 生成金属价格数据
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
 * 生成行业资讯
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
      "source": "来源（如：行业日报、中国锻造协会等）",
      "date": "YYYY-MM-DD"
    }
  ]
}`

  const result = await chatJSON(
    [{ role: 'system', content: systemPrompt }],
    { temperature: 0.8, maxTokens: 1024 }
  )

  return result.news || []
}

/**
 * 生成展会信息
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
      "category": "航空|锻造|工业|材料|综合"
    }
  ]
}

包含 3-5 个近期或即将举办的展会。`

  const result = await chatJSON(
    [{ role: 'system', content: systemPrompt }],
    { temperature: 0.8, maxTokens: 1024 }
  )

  return result.exhibitions || []
}

/**
 * 执行每日数据更新
 */
const runDailyUpdate = async () => {
  if (!isConfigured()) {
    console.log('[每日更新] DEEPSEEK_API_KEY 未配置，跳过数据更新')
    return
  }

  console.log('[每日更新] 开始更新市场数据...')

  try {
    const [prices, news, exhibitions] = await Promise.all([
      generateMetalPrices().catch((e) => {
        console.error('[每日更新] 金属价格更新失败:', e.message)
        return memoryData.metalPrices // 保留旧数据
      }),
      generateIndustryNews().catch((e) => {
        console.error('[每日更新] 行业资讯更新失败:', e.message)
        return memoryData.industryNews
      }),
      generateExhibitions().catch((e) => {
        console.error('[每日更新] 展会信息更新失败:', e.message)
        return memoryData.exhibitions
      }),
    ])

    if (prices.length > 0) memoryData.metalPrices = prices
    if (news.length > 0) memoryData.industryNews = news
    if (exhibitions.length > 0) memoryData.exhibitions = exhibitions
    memoryData.lastUpdate = new Date().toISOString()

    console.log('[每日更新] 市场数据更新完成')
  } catch (err) {
    console.error('[每日更新] 更新失败:', err.message)
  }
}

/**
 * 获取当前市场数据
 */
const getMarketData = () => {
  return {
    metalPrices: memoryData.metalPrices,
    industryNews: memoryData.industryNews,
    exhibitions: memoryData.exhibitions,
    lastUpdate: memoryData.lastUpdate,
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
 * 启动定时更新
 */
const startDailyUpdate = () => {
  // 首次启动时如果还没有数据，立即更新
  if (!memoryData.lastUpdate) {
    console.log('[每日更新] 首次启动，立即更新数据...')
    runDailyUpdate()
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
}
