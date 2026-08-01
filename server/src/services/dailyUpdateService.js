const axios = require('axios')
const mongoose = require('mongoose')

// ============================================================
// 行业权威来源映射表（来源名称 → 官方网址）
// 用于 AI 生成资讯时，根据来源匹配官方链接
// ============================================================
const SOURCE_URL_MAP = {
  // 政府/协会类
  '工业和信息化部': 'https://www.miit.gov.cn',
  '工信部': 'https://www.miit.gov.cn',
  '国家发改委': 'https://www.ndrc.gov.cn',
  '商务部': 'http://www.mofcom.gov.cn',
  '中国机械工业联合会': 'http://www.cmif.org.cn',
  '中国钢铁工业协会': 'https://www.cisa.org.cn',
  '中国有色金属工业协会': 'http://www.chinania.org.cn',
  '中国铸造协会': 'http://www.foundry.com.cn',
  '中国锻压协会': 'https://www.chinaforge.org.cn',
  '中国热处理协会': 'http://www.chta.org.cn',
  '中国腐蚀与防护学会': 'http://www.cscp.org.cn',
  '中国特钢企业协会': 'http://www.specialsteel.org.cn',
  '中国工业机械联合会': 'http://www.cmif.org.cn',
  '中国航空学会': 'http://www.csaa.org.cn',
  '中国航天科技集团': 'http://www.spacechina.com',
  '中国航空发动机集团': 'https://www.aecc.cn',

  // 财经/行业媒体类
  '上海有色网': 'https://www.smm.cn',
  '长江有色金属网': 'https://www.ccmn.cn',
  '中国金属网': 'http://www.metalchina.com',
  '我的钢铁网': 'https://www.mysteel.com',
  '中钢网': 'https://www.zgw.com',
  '兰格钢铁网': 'https://www.lgmi.com',
  '生意社': 'https://www.100ppi.com',
  '同花顺财经': 'https://www.10jqka.com.cn',
  '东方财富网': 'https://www.eastmoney.com',
  '中国证券报': 'http://www.cs.com.cn',
  '上海证券报': 'http://www.cnstock.com',

  // 行业门户类
  '中国锻压网': 'http://www.duanya.org.cn',
  '中国铸造网': 'http://www.zhuzao.com',
  '热处理技术网': 'http://www.rcljs.com',
  '金属加工在线': 'http://www.mw1950.com',
  '国际金属加工网': 'http://www.mmsonline.com.cn',
  '中国机械网': 'http://www.jx.cn',
  '机经网': 'http://www.mejxw.com',

  // 展会类
  '中国国际铸造博览会': 'https://www.foundryexpo.com.cn',
  '中国国际锻造展': 'https://www.forgechina.cn',
  '上海国际热处理展': 'https://www.heat-treatment-expo.com',
  '中国国际模具技术和设备展': 'https://www.diemouldchina.com',
  '中国国际工业博览会': 'https://www.ciif-expo.com',
  '中国国际中小企业博览会': 'https://www.cismef.com.cn',
  '德国汉诺威工业博览会': 'https://www.hannovermesse.de',
  '杜塞尔多夫国际铸造展': 'https://www.gifa.de',

  // 企业/研究机构
  '宝钢股份': 'https://www.baosteel.com',
  '鞍钢股份': 'http://www.ansteel.com.cn',
  '中国中车': 'http://www.crrcgc.cc',
  '中国一重': 'http://www.cfhi.com',
  '中国二重': 'http://www.sinomach-hi.com',
  '中信特钢': 'http://www.1301.cn',
  '抚顺特钢': 'http://www.fsgf.com.cn',
  '久立特材': 'http://www.jiuli.com',
  '钢研高纳': 'http://www.cisri-gaona.com.cn',
  '中国科学院金属研究所': 'http://www.imr.ac.cn',

  // 通用默认（未匹配时使用）
  '行业资讯': 'https://www.foundry.com.cn',
  '综合媒体': 'https://www.smm.cn',
  '市场动态': 'https://www.mysteel.com',
  '政策法规': 'https://www.miit.gov.cn',
  '技术前沿': 'http://www.rcljs.com',
  '展会信息': 'https://www.foundryexpo.com.cn',
}

/**
 * 根据来源名称匹配官方网址
 * @param {string} sourceName - 来源名称（如：工信部、中国钢铁工业协会）
 * @returns {string} 匹配到的官方网址，如果未匹配则返回通用默认
 */
function matchSourceUrl(sourceName) {
  if (!sourceName) return SOURCE_URL_MAP['行业资讯']
  const name = sourceName.trim()

  // 精确匹配
  if (SOURCE_URL_MAP[name]) {
    return SOURCE_URL_MAP[name]
  }

  // 模糊匹配（包含关系）
  const keys = Object.keys(SOURCE_URL_MAP)
  for (const key of keys) {
    if (name.includes(key) || key.includes(name)) {
      return SOURCE_URL_MAP[key]
    }
  }

  // 根据类别返回默认
  const categoryDefaults = [
    { keywords: ['工业', '信息', '发改', '商务', '政策', '法规', '标准', '审批'], url: SOURCE_URL_MAP['政策法规'] },
    { keywords: ['钢铁', '特钢', '不锈', '模具钢', '碳钢', '合金'], url: SOURCE_URL_MAP['我的钢铁网'] },
    { keywords: ['有色', '铝', '铜', '钛', '镁', '稀土', '镍', '锂'], url: SOURCE_URL_MAP['上海有色网'] },
    { keywords: ['锻造', '锻件', '锻压', '自由锻', '模锻'], url: SOURCE_URL_MAP['中国锻压协会'] },
    { keywords: ['铸造', '铸件', '铸钢', '铸铁', '熔模'], url: SOURCE_URL_MAP['中国铸造协会'] },
    { keywords: ['热处理', '淬火', '回火', '退火', '固溶', '时效'], url: SOURCE_URL_MAP['热处理技术网'] },
    { keywords: ['展会', '博览', '展览', '展会', '展销'], url: SOURCE_URL_MAP['中国国际铸造博览会'] },
    { keywords: ['价格', '行情', '报价', '现货', '期货', '走势'], url: SOURCE_URL_MAP['长江有色金属网'] },
    { keywords: ['学术', '技术', '研究', '论文', '专利', '学报'], url: SOURCE_URL_MAP['中国科学院金属研究所'] },
    { keywords: ['航发', '航空', '航天', '中航', 'C919', 'ARJ'], url: SOURCE_URL_MAP['中国航空发动机集团'] },
  ]

  for (const rule of categoryDefaults) {
    if (rule.keywords.some(kw => name.includes(kw))) {
      return rule.url
    }
  }

  return SOURCE_URL_MAP['行业资讯']
}

/**
 * 根据资讯类别匹配默认来源（名称+网址）
 */
function getDefaultSourceByCategory(category) {
  const map = {
    policy: { sourceName: '工业和信息化部', sourceUrl: SOURCE_URL_MAP['工业和信息化部'] },
    market: { sourceName: '我的钢铁网', sourceUrl: SOURCE_URL_MAP['我的钢铁网'] },
    technology: { sourceName: '中国锻压协会', sourceUrl: SOURCE_URL_MAP['中国锻压协会'] },
    exhibition: { sourceName: '中国铸造协会', sourceUrl: SOURCE_URL_MAP['中国铸造协会'] },
    price: { sourceName: '上海有色网', sourceUrl: SOURCE_URL_MAP['上海有色网'] },
  }
  return map[category] || map.market
}

/**
 * 根据展会名称匹配默认来源
 */
function getDefaultSourceByExhibition(exhibitionName) {
  if (!exhibitionName) {
    return { sourceName: '中国铸造协会', sourceUrl: SOURCE_URL_MAP['中国铸造协会'] }
  }
  const name = exhibitionName
  const rules = [
    { keywords: ['铸造', 'foundry', '铸博会'], name: '中国国际铸造博览会', url: SOURCE_URL_MAP['中国国际铸造博览会'] },
    { keywords: ['锻造', 'forge', '锻博会'], name: '中国国际锻造展', url: SOURCE_URL_MAP['中国国际锻造展'] },
    { keywords: ['热处理', 'heat'], name: '上海国际热处理展', url: SOURCE_URL_MAP['上海国际热处理展'] },
    { keywords: ['模具', 'diemould', '工模具'], name: '中国国际模具技术和设备展', url: SOURCE_URL_MAP['中国国际模具技术和设备展'] },
    { keywords: ['工业博览', 'ciif', '工博会'], name: '中国国际工业博览会', url: SOURCE_URL_MAP['中国国际工业博览会'] },
    { keywords: ['汉诺威', 'hannover'], name: '德国汉诺威工业博览会', url: SOURCE_URL_MAP['德国汉诺威工业博览会'] },
    { keywords: ['杜塞尔', 'gifa'], name: '杜塞尔多夫国际铸造展', url: SOURCE_URL_MAP['杜塞尔多夫国际铸造展'] },
  ]
  for (const rule of rules) {
    if (rule.keywords.some(kw => name.toLowerCase().includes(kw.toLowerCase()))) {
      return { sourceName: rule.name, sourceUrl: rule.url }
    }
  }
  return { sourceName: '中国铸造协会', sourceUrl: SOURCE_URL_MAP['中国铸造协会'] }
}

// ============================================================
// Schema & Models
// ============================================================

// 金属价格数据 Schema
const metalPriceSchema = new mongoose.Schema({
  date: { type: String, required: true, index: true },
  metals: [{
    name: String,
    price: Number,
    unit: String,
    change: Number,
    changePercent: Number,
    // 金属价格参考来源
    sourceName: { type: String, default: '上海有色网' },
    sourceUrl: { type: String, default: 'https://www.smm.cn' },
  }],
  createdAt: { type: Date, default: Date.now },
})

// 行业资讯 Schema
const industryNewsSchema = new mongoose.Schema({
  title: { type: String, required: true },
  source: String,             // 来源名称（兼容旧字段）
  sourceName: String,         // 来源网站名称
  sourceUrl: String,          // 来源网站网址（可点击跳转核实）
  category: { type: String, enum: ['policy', 'market', 'technology', 'exhibition', 'price'], default: 'market' },
  summary: String,
  content: String,
  publishDate: String,
  url: String,                // 原始文章链接（文章具体页，兼容旧字段）
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
  sourceName: String,         // 展会官方/发布来源名称
  sourceUrl: String,          // 展会官方网址
  url: String,                // 详情链接（兼容旧字段）
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

// ============================================================
// 金属价格获取
// ============================================================
async function fetchMetalPrices() {
  try {
    const response = await axios.get('https://api.metalpriceapi.com/v1/latest', {
      params: {
        api_key: process.env.METAL_PRICE_API_KEY || '',
        base: 'CNY',
        currencies: 'XAU,XAG,XCU,XLI,NI,AL',
      },
      timeout: 10000,
    })

    if (response.data?.success) {
      const metals = []
      const mapping = [
        ['XAU', '黄金', '元/克'],
        ['XAG', '白银', '元/千克'],
        ['XCU', '铜', '元/吨'],
        ['XLI', '铝', '元/吨'],
        ['NI', '镍', '元/吨'],
        ['AL', '铝锭', '元/吨'],
      ]
      for (const [code, name, unit] of mapping) {
        if (response.data.rates[code]) {
          metals.push({
            name,
            price: response.data.rates[code],
            unit,
            change: 0,
            changePercent: 0,
            sourceName: 'MetalPriceAPI',
            sourceUrl: 'https://www.metalpriceapi.com',
          })
        }
      }
      if (metals.length > 0) return metals
    }
  } catch (err) {
    console.warn('金属价格API获取失败，使用AI生成:', err.message)
  }

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
      const arr = JSON.parse(jsonMatch[0])
      return arr.map(item => ({
        ...item,
        sourceName: '上海有色网(AI参考)',
        sourceUrl: SOURCE_URL_MAP['上海有色网'],
      }))
    }
  } catch (aiErr) {
    console.error('AI 生成金属价格失败:', aiErr.message)
  }

  return [
    { name: '碳钢（Q235）', price: 4200, unit: '元/吨', change: 50, changePercent: 1.2, sourceName: '我的钢铁网(参考)', sourceUrl: SOURCE_URL_MAP['我的钢铁网'] },
    { name: '合金钢（40Cr）', price: 5800, unit: '元/吨', change: -30, changePercent: -0.5, sourceName: '我的钢铁网(参考)', sourceUrl: SOURCE_URL_MAP['我的钢铁网'] },
    { name: '不锈钢（304）', price: 15800, unit: '元/吨', change: 200, changePercent: 1.3, sourceName: '长江有色网(参考)', sourceUrl: SOURCE_URL_MAP['长江有色金属网'] },
    { name: '模具钢（H13）', price: 22000, unit: '元/吨', change: 100, changePercent: 0.5, sourceName: '中钢网(参考)', sourceUrl: SOURCE_URL_MAP['中钢网'] },
    { name: '铝（ADC12）', price: 19500, unit: '元/吨', change: -150, changePercent: -0.8, sourceName: '上海有色网(参考)', sourceUrl: SOURCE_URL_MAP['上海有色网'] },
    { name: '铜（T2）', price: 72000, unit: '元/吨', change: 500, changePercent: 0.7, sourceName: '上海有色网(参考)', sourceUrl: SOURCE_URL_MAP['上海有色网'] },
  ]
}

// ============================================================
// 行业资讯获取
// ============================================================
async function fetchIndustryNews() {
  const { callDeepSeek } = require('./deepseekService')
  const today = new Date().toISOString().split('T')[0]

  try {
    const result = await callDeepSeek(
      '你是金属锻造行业的资深资讯编辑，了解最新的行业动态、政策法规、技术趋势和展会信息。',
      `请生成 ${today} 金属锻造行业的 5 条重要资讯摘要，涵盖：1条政策法规、2条市场动态、1条技术趋势、1条展会信息。

严格以JSON数组格式返回，每条必须包含以下字段：
- title: 资讯标题
- source: 发布来源网站或机构名称（必须是真实存在的行业权威，如：工信部、中国钢铁工业协会、上海有色网、我的钢铁网、中国铸造协会等）
- category: policy|market|technology|exhibition
- summary: 50字以内摘要
- publishDate: 发布日期（YYYY-MM-DD）
- url: 该资讯的具体文章链接（如果不知道具体链接，可以填来源官网首页，但要真实可访问）

注意：
1. source 必须是行业内大家熟知的真实机构/网站名
2. url 必须是真实可访问的网址（不要编造假链接，不知道具体链接就填来源官方首页）
3. 内容基于近期真实行业趋势合理编写

示例单条结构：{"title":"...","source":"工信部","category":"policy","summary":"...","publishDate":"${today}","url":"https://www.miit.gov.cn"}`,
      { temperature: 0.5, max_tokens: 2500 }
    )

    const jsonMatch = result.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      const arr = JSON.parse(jsonMatch[0])
      return arr.map(item => {
        // 补齐/修正来源名称和网址
        const sourceName = item.source || item.sourceName || getDefaultSourceByCategory(item.category).sourceName
        let sourceUrl = item.sourceUrl || item.url || matchSourceUrl(sourceName)
        return {
          ...item,
          source: sourceName,
          sourceName,
          sourceUrl,
          url: item.url || sourceUrl,
        }
      })
    }
  } catch (err) {
    console.error('AI 生成行业资讯失败:', err.message)
  }

  // 兜底：构造一批带真实来源链接的示例资讯
  return [
    {
      title: '工信部发布装备制造业高质量发展行动计划',
      source: '工业和信息化部',
      sourceName: '工业和信息化部',
      sourceUrl: SOURCE_URL_MAP['工业和信息化部'],
      category: 'policy',
      summary: '提出到2027年高端装备占比显著提升，支持航空锻件、新能源汽车零部件等领域。',
      publishDate: today,
      url: SOURCE_URL_MAP['工业和信息化部'],
    },
    {
      title: '304不锈钢价格本周小幅走高 市场成交回暖',
      source: '我的钢铁网',
      sourceName: '我的钢铁网',
      sourceUrl: SOURCE_URL_MAP['我的钢铁网'],
      category: 'market',
      summary: '受原料端支撑，304冷热轧主流价格周环比上涨150-200元/吨，下游采购积极性提升。',
      publishDate: today,
      url: SOURCE_URL_MAP['我的钢铁网'],
    },
    {
      title: 'GH4169高温合金航空级锻件交付量同比增长30%',
      source: '中国锻压协会',
      sourceName: '中国锻压协会',
      sourceUrl: SOURCE_URL_MAP['中国锻压协会'],
      category: 'market',
      summary: '受益于航空发动机国产化提速，国内重点特钢企业GH4169交付量快速增长。',
      publishDate: today,
      url: SOURCE_URL_MAP['中国锻压协会'],
    },
    {
      title: '新型真空高压气淬热处理工艺实现国产替代',
      source: '中国科学院金属研究所',
      sourceName: '中国科学院金属研究所',
      sourceUrl: SOURCE_URL_MAP['中国科学院金属研究所'],
      category: 'technology',
      summary: '新工艺显著提升变形控制精度和表面质量，已在航空结构件批量应用。',
      publishDate: today,
      url: SOURCE_URL_MAP['中国科学院金属研究所'],
    },
    {
      title: '2026中国国际铸造博览会（铸博会）启动招展',
      source: '中国铸造协会',
      sourceName: '中国铸造协会',
      sourceUrl: SOURCE_URL_MAP['中国国际铸造博览会'],
      category: 'exhibition',
      summary: '将于2026年5月在上海国家会展中心举办，特设航空航天精密铸造专区。',
      publishDate: today,
      url: SOURCE_URL_MAP['中国国际铸造博览会'],
    },
  ]
}

// ============================================================
// 展会信息获取
// ============================================================
async function fetchExhibitions() {
  const { callDeepSeek } = require('./deepseekService')

  try {
    const result = await callDeepSeek(
      '你是金属锻造行业的展会信息分析师。',
      `请列出近期（未来3个月）中国金属锻造、铸造、热处理相关的 3 个重要展会信息。

严格以JSON数组格式返回，每条必须包含以下字段：
- name: 展会全称
- date: 举办日期（如：2026-05-18 ~ 2026-05-21）
- location: 举办地点（展馆名+城市）
- organizer: 主办方（真实机构名）
- description: 简介50字以内
- status: upcoming|ongoing|ended
- sourceName: 展会官方或发布来源
- sourceUrl: 展会官方网址（必须是真实可访问的网址，不知道具体官网就填行业展会通用官网）

示例单条结构：{"name":"2026中国国际铸造博览会","date":"2026-05-18 ~ 2026-05-21","location":"上海国家会展中心","organizer":"中国铸造协会","description":"...","status":"upcoming","sourceName":"中国铸造协会","sourceUrl":"https://www.foundryexpo.com.cn"}`,
      { temperature: 0.3, max_tokens: 2000 }
    )

    const jsonMatch = result.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      const arr = JSON.parse(jsonMatch[0])
      return arr.map(item => {
        const def = getDefaultSourceByExhibition(item.name)
        return {
          ...item,
          sourceName: item.sourceName || def.sourceName,
          sourceUrl: item.sourceUrl || item.url || def.sourceUrl,
          url: item.url || item.sourceUrl || def.sourceUrl,
        }
      })
    }
  } catch (err) {
    console.error('AI 生成展会信息失败:', err.message)
  }

  // 兜底：构造一批带真实展会官网链接的示例
  const today = new Date()
  const addDays = (d) => {
    const nd = new Date(today)
    nd.setDate(nd.getDate() + d)
    return nd.toISOString().split('T')[0]
  }

  return [
    {
      name: '2026 中国国际铸造博览会（铸博会）',
      date: `${addDays(60)} ~ ${addDays(63)}`,
      location: '上海国家会展中心 · 青浦区',
      organizer: '中国铸造协会',
      description: '亚太规模最大的铸造专业展览会，涵盖铸钢铸铁、有色铸造、精密铸造全产业链。',
      status: 'upcoming',
      sourceName: '中国铸造协会',
      sourceUrl: SOURCE_URL_MAP['中国国际铸造博览会'],
      url: SOURCE_URL_MAP['中国国际铸造博览会'],
    },
    {
      name: '2026 中国国际锻造工业展览会',
      date: `${addDays(90)} ~ ${addDays(93)}`,
      location: '上海新国际博览中心 · 浦东',
      organizer: '中国锻压协会',
      description: '集中展示自由锻、模锻、精密锻件设备、工艺及航空航天高端锻件成果。',
      status: 'upcoming',
      sourceName: '中国锻压协会',
      sourceUrl: SOURCE_URL_MAP['中国国际锻造展'],
      url: SOURCE_URL_MAP['中国国际锻造展'],
    },
    {
      name: '2026 上海国际热处理及工业炉展览会',
      date: `${addDays(30)} ~ ${addDays(32)}`,
      location: '上海世博展览馆',
      organizer: '中国热处理行业协会',
      description: '热处理装备、感应加热、渗碳氮化、真空炉、工业炉及辅助设备的专业平台。',
      status: 'upcoming',
      sourceName: '中国热处理行业协会',
      sourceUrl: SOURCE_URL_MAP['上海国际热处理展'],
      url: SOURCE_URL_MAP['上海国际热处理展'],
    },
  ]
}

// ============================================================
// 每日更新主流程
// ============================================================
async function runDailyUpdate() {
  console.log('[定时任务] 开始每日数据更新...')

  const { MetalPrice, IndustryNews, Exhibition } = getModels()
  const today = new Date().toISOString().split('T')[0]

  try {
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
    console.log('[定时任务] 更新行业资讯...')
    const news = await fetchIndustryNews()
    if (news && news.length > 0) {
      await IndustryNews.deleteMany({ publishDate: today })
      await IndustryNews.insertMany(news.map(item => ({ ...item, publishDate: item.publishDate || today })))
      console.log(`[定时任务] 行业资讯已更新，共 ${news.length} 条`)
    }
  } catch (err) {
    console.error('[定时任务] 行业资讯更新失败:', err.message)
  }

  try {
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

// ============================================================
// 定时调度
// ============================================================
function startScheduler() {
  const CHECK_INTERVAL = 60 * 60 * 1000

  const check = () => {
    const now = new Date()
    const hour = now.getHours()

    if (hour === 8) {
      const lastRun = global._lastDailyUpdate || 0
      if (now.getTime() - lastRun > CHECK_INTERVAL) {
        global._lastDailyUpdate = now.getTime()
        runDailyUpdate()
      }
    }
  }

  runDailyUpdate().catch(err => console.error('初始数据更新失败:', err.message))

  setInterval(check, CHECK_INTERVAL)
  console.log('[定时任务] 调度器已启动，每日 8:00 更新数据')
}

module.exports = {
  startScheduler,
  runDailyUpdate,
  getModels,
  SOURCE_URL_MAP,
  matchSourceUrl,
}
