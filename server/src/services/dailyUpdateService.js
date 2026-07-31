const axios = require('axios')
const mongoose = require('mongoose')

// 金属价格数据 Schema
const metalPriceSchema = new mongoose.Schema({
  date: { type: String, required: true, index: true },
  metals: [{
    name: String,
    price: Number,
    unit: String,
    change: Number,
    changePercent: Number,
  }],
  createdAt: { type: Date, default: Date.now },
})

// 行业资讯 Schema
const industryNewsSchema = new mongoose.Schema({
  title: { type: String, required: true },
  source: String,
  category: { type: String, enum: ['policy', 'market', 'technology', 'exhibition', 'price'], default: 'market' },
  summary: String,
  content: String,
  publishDate: String,
  url: String,
  createdAt: { type: Date, default: Date.now },
})

// 展会信息 Schema
const exhibitionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  date: String,
  location: String,
  organizer: String,
  category: String,
  description: String,
  url: String,
  status: { type: String, enum: ['upcoming', 'ongoing', 'ended'], default: 'upcoming' },
  createdAt: { type: Date, default: Date.now },
})

let MetalPrice, IndustryNews, Exhibition

function getModels() {
  MetalPrice = MetalPrice || mongoose.models.MetalPrice || mongoose.model('MetalPrice', metalPriceSchema)
  IndustryNews = IndustryNews || mongoose.models.IndustryNews || mongoose.model('IndustryNews', industryNewsSchema)
  Exhibition = Exhibition || mongoose.models.Exhibition || mongoose.model('Exhibition', exhibitionSchema)
  return { MetalPrice, IndustryNews, Exhibition }
}

/**
 * 获取金属原材料价格
 * 使用公开 API 或 AI 生成最新数据
 */
async function fetchMetalPrices() {
  try {
    // 尝试从公开 API 获取金属价格
    const response = await axios.get('https://api.metalpriceapi.com/v1/latest', {
      params: {
        api_key: process.env.METAL_PRICE_API_KEY || '',
        base: 'CNY',
        currencies: 'XAU,XAG,XCU,XLI,NI,AL',
      },
      timeout: 10000,
    })

    if (response.data?.success) {
      return response.data.rates
    }
  } catch (err) {
    console.warn('金属价格API获取失败，使用AI生成:', err.message)
  }

  // API 不可用时，使用 AI 生成参考数据
  const { callDeepSeek } = require('./deepseekService')
  const today = new Date().toISOString().split('T')[0]

  try {
    const result = await callDeepSeek(
      '你是金属市场数据分析师。请提供当前中国市场的金属原材料参考价格。',
      `请提供 ${today} 中国市场以下金属的参考价格（含税出厂价）：碳钢、合金钢、不锈钢、模具钢、铝、铜。以JSON数组格式返回，每个金属包含 name、price(元/吨)、unit、change(涨跌额)、changePercent(涨跌幅%)。注意：价格应基于近期市场行情合理估算，标注为参考价。`,
      { temperature: 0.3, max_tokens: 1500 }
    )

    const jsonMatch = result.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
  } catch (aiErr) {
    console.error('AI 生成金属价格失败:', aiErr.message)
  }

  // 兜底：返回默认参考数据
  return [
    { name: '碳钢（Q235）', price: 4200, unit: '元/吨', change: 50, changePercent: 1.2 },
    { name: '合金钢（40Cr）', price: 5800, unit: '元/吨', change: -30, changePercent: -0.5 },
    { name: '不锈钢（304）', price: 15800, unit: '元/吨', change: 200, changePercent: 1.3 },
    { name: '模具钢（H13）', price: 22000, unit: '元/吨', change: 100, changePercent: 0.5 },
    { name: '铝（ADC12）', price: 19500, unit: '元/吨', change: -150, changePercent: -0.8 },
    { name: '铜（T2）', price: 72000, unit: '元/吨', change: 500, changePercent: 0.7 },
  ]
}

/**
 * 获取行业资讯
 */
async function fetchIndustryNews() {
  const { callDeepSeek } = require('./deepseekService')
  const today = new Date().toISOString().split('T')[0]

  try {
    const result = await callDeepSeek(
      '你是金属锻造行业的资深资讯编辑，了解最新的行业动态、政策法规、技术趋势和展会信息。',
      `请生成 ${today} 金属锻造行业的 5 条重要资讯摘要，涵盖：1条政策法规、2条市场动态、1条技术趋势、1条展会信息。以JSON数组格式返回，每条包含 title、source(来源)、category(policy/market/technology/exhibition)、summary(50字以内摘要)、publishDate。内容应基于近期真实行业趋势合理编写。`,
      { temperature: 0.5, max_tokens: 2000 }
    )

    const jsonMatch = result.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
  } catch (err) {
    console.error('AI 生成行业资讯失败:', err.message)
  }

  return []
}

/**
 * 获取展会信息
 */
async function fetchExhibitions() {
  const { callDeepSeek } = require('./deepseekService')

  try {
    const result = await callDeepSeek(
      '你是金属锻造行业的展会信息分析师。',
      '请列出近期（未来3个月）中国金属锻造、铸造、热处理相关的 3 个重要展会信息。以JSON数组格式返回，每条包含 name(展会名称)、date(举办日期)、location(举办地点)、organizer(主办方)、description(简介50字)、status(upcoming/ongoing/ended)。内容应基于真实展会趋势合理编写。',
      { temperature: 0.3, max_tokens: 1500 }
    )

    const jsonMatch = result.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
  } catch (err) {
    console.error('AI 生成展会信息失败:', err.message)
  }

  return []
}

/**
 * 执行每日数据更新
 */
async function runDailyUpdate() {
  console.log('[定时任务] 开始每日数据更新...')

  const { MetalPrice, IndustryNews, Exhibition } = getModels()
  const today = new Date().toISOString().split('T')[0]

  try {
    // 1. 更新金属价格
    console.log('[定时任务] 更新金属价格...')
    const metals = await fetchMetalPrices()
    if (metals && metals.length > 0) {
      await MetalPrice.findOneAndUpdate(
        { date: today },
        { date: today, metals, createdAt: new Date() },
        { upsert: true, new: true }
      )
      console.log(`[定时任务] 金属价格已更新，共 ${metals.length} 种金属`)
    }
  } catch (err) {
    console.error('[定时任务] 金属价格更新失败:', err.message)
  }

  try {
    // 2. 更新行业资讯
    console.log('[定时任务] 更新行业资讯...')
    const news = await fetchIndustryNews()
    if (news && news.length > 0) {
      // 删除今天的旧资讯，避免重复
      await IndustryNews.deleteMany({ publishDate: today })
      await IndustryNews.insertMany(news.map(item => ({ ...item, publishDate: today })))
      console.log(`[定时任务] 行业资讯已更新，共 ${news.length} 条`)
    }
  } catch (err) {
    console.error('[定时任务] 行业资讯更新失败:', err.message)
  }

  try {
    // 3. 更新展会信息
    console.log('[定时任务] 更新展会信息...')
    const exhibitions = await fetchExhibitions()
    if (exhibitions && exhibitions.length > 0) {
      for (const exh of exhibitions) {
        await Exhibition.findOneAndUpdate(
          { name: exh.name },
          exh,
          { upsert: true, new: true }
        )
      }
      console.log(`[定时任务] 展会信息已更新，共 ${exhibitions.length} 条`)
    }
  } catch (err) {
    console.error('[定时任务] 展会信息更新失败:', err.message)
  }

  console.log('[定时任务] 每日数据更新完成')
}

/**
 * 启动定时任务调度器
 * 每天早上 8:00 执行数据更新
 */
function startScheduler() {
  const CHECK_INTERVAL = 60 * 60 * 1000 // 每小时检查一次

  const check = () => {
    const now = new Date()
    const hour = now.getHours()

    // 每天 8 点执行
    if (hour === 8) {
      // 避免同一小时内重复执行
      const lastRun = global._lastDailyUpdate || 0
      if (now.getTime() - lastRun > CHECK_INTERVAL) {
        global._lastDailyUpdate = now.getTime()
        runDailyUpdate()
      }
    }
  }

  // 启动后立即执行一次
  runDailyUpdate().catch(err => console.error('初始数据更新失败:', err.message))

  // 设置定时检查
  setInterval(check, CHECK_INTERVAL)
  console.log('[定时任务] 调度器已启动，每日 8:00 更新数据')
}

module.exports = {
  startScheduler,
  runDailyUpdate,
  getModels,
}
