/**
 * AI 功能路由
 * 4 类接口：语音助手、客户分析、报告生成、行业洞察
 */

const express = require('express')
const router = express.Router()
const { protect } = require('../middleware/auth')
const { isConfigured, chat, chatStream, chatJSON } = require('../services/baiduService')

// AI 未配置时的中间件
const checkAIConfig = (req, res, next) => {
  if (!isConfigured()) {
    return res.status(503).json({
      message: 'AI 功能未启用，请在 Railway 环境变量中配置 BAIDU_API_KEY',
    })
  }
  next()
}

router.use(checkAIConfig)

// ============================================================
// 1. 语音助手 — 解析销售指令，自动提取任务信息
// ============================================================
router.post('/voice-assistant', protect, async (req, res) => {
  try {
    const { text } = req.body
    if (!text || !text.trim()) {
      return res.status(400).json({ message: '请提供语音文本' })
    }

    const systemPrompt = `你是一个销售工作台的语音助手。用户会用自然语言描述要做的事或记录的事。
请分析用户输入，提取出结构化的任务列表。

规则：
1. 周报/日报/月报/工作总结类内容 → type 为 "task"（待办事项），不生成日程
2. 只有同时包含明确的时间（如"明天""下周三""15号"等）和动作词（如"提醒""提交""开会""拜访"等）时，才标为 "schedule"（日程提醒）
3. 根据内容识别业务类型：quote(报价)、order(订单)、visit(拜访)、call(电话跟进)、meeting(会议)、contract(合同)、report(报告汇报)、memo(备忘录)、task(待办事项)
4. 如果一句话中包含多个事项，请拆分

==============================
【非常重要】日期时间解析规则（严格遵循，不得随意发挥）：

【日期解析】
- 今天=当前日期，明天=+1天，后天=+2天，大后天=+3天
- 周X/星期X：本周对应日期（周一=1，周日=7）。"下X"=下周对应日期
- X号/X日：本月对应日期，若已过则下个月
- 本月/下个月第X周：对应周的周一日期

【时间解析（重中之重）】
- "早上X点"、"上午X点"、"X点前"且 X≤8 → 使用 24小时制 X:00
- "中午X点" → 12:00
- "下午X点"、"晚上X点"、"傍晚X点" → X + 12
- **如果只有"X点"没有说明上午下午：**
  - X=12 → 12:00
  - 1≤X≤5 → 默认下午 → (X+12):00（如"3点"=15:00，"4点"=16:00）
  - 6≤X≤8 → 默认上午 → X:00（如"8点"=08:00）
  - 9≤X≤11 → 上午 → X:00
- "X点半" → 分钟=30
- "X点Y分" → HH:Y
- "半点"=:30，"一刻钟"=:15，"三刻"=:45
- 如果完全没有时间点 → 10:00（默认上午工作时间）
==============================

返回 JSON 格式：
{
  "tasks": [
    {
      "content": "事项内容（去掉时间前缀的纯内容）",
      "date": "YYYY-MM-DD",
      "time": "HH:mm",
      "customer": "关联客户名（无则空字符串）",
      "types": ["task"],
      "typeLabels": ["待办事项"]
    }
  ]
}`

    // ---- 确定性时间后处理（优先信任规则，纠正AI错误）----
    const today = new Date()
    const CN_NUM = {零:0,一:1,二:2,两:2,三:3,四:4,五:5,六:6,七:7,八:8,九:9}
    // 中文数字片段转阿拉伯数字（支持"十""十二""二十""二十五"等）
    const cnToNum = (cn) => {
      if (!cn) return NaN
      const s = String(cn).trim()
      if (/^\d+$/.test(s)) return parseInt(s, 10)
      if (s === '十') return 10
      // 11-19: 十X → 10+X
      const teen = s.match(/^十([一二三四五六七八九])$/)
      if (teen) return 10 + (CN_NUM[teen[1]] ?? 0)
      // 20,30,...90: X十 → X*10
      const tens = s.match(/^([一二三四五六七八九])十$/)
      if (tens) return (CN_NUM[tens[1]] ?? 0) * 10
      // 21-29,31-39...: X十Y → X*10+Y
      const full = s.match(/^([一二三四五六七八九])十([一二三四五六七八九])$/)
      if (full) return (CN_NUM[full[1]] ?? 0) * 10 + (CN_NUM[full[2]] ?? 0)
      // 单个中文字 一~九
      if (s.length === 1 && CN_NUM[s] != null) return CN_NUM[s]
      // 最后兜底：逐字符替换（仅限不含"十"的短串，避免"五四"拼接问题）
      if (!s.includes('十') && s.length <= 2) {
        let n = ''
        for (const ch of s) { if (CN_NUM[ch] != null) n += CN_NUM[ch] }
        if (n) return parseInt(n, 10)
      }
      return NaN
    }

    const parseHour = (raw) => {
      if (!raw) return null
      const s = String(raw).trim()
      // 遍历所有 "X点/Y时/HH:"，排除紧邻"周/星期"后的那个（那是周几的数字，不是时间）
      // 注意：{1,4}? 非贪婪，以便优先匹配单个数字（避免把"五四"当一个整体吞掉后面的"四"）
      const timeRegex = /([\d零一二两三四五六七八九十]{1,4}?)\s*([点时:：])/g
      let h = NaN
      let m
      while ((m = timeRegex.exec(s)) !== null) {
        const idx = m.index
        const before = s.slice(Math.max(0, idx - 3), idx)
        const isWeekdayNum = /[周星期]$/.test(before)
        if (isWeekdayNum) {
          // 这个匹配是"周X"的X被当成了时间数字，跳过。
          // 但注意：贪婪可能把"五四"吞成整体（即使非贪婪也可能{1,4}尝试了2位长度匹配）。
          // 回退 lastIndex，下一轮从 idx+1 开始，避免漏过后面紧跟的"四点/六点"等时间
          timeRegex.lastIndex = idx + 1
          continue
        }
        h = cnToNum(m[1])
        if (!isNaN(h)) break
      }
      if (isNaN(h)) return null
      let min = 0
      // 分钟匹配：基于第一个合法时间点之后的部分
      const afterHour = s.slice((m.index + m[0].length))
      const mPattern = afterHour.match(/^\s*([\d零一二两三四五六七八九十]{1,3})\s*分?/)
      if (mPattern) {
        const mv = cnToNum(mPattern[1])
        if (!isNaN(mv)) min = mv
      }
      if (s.includes('半')) min = 30
      if (s.includes('一刻') && min < 15) min = 15
      if (s.includes('三刻') && min < 45) min = 45
      // 上下午判断（使用原始s判断关键词，不受数字转换影响）
      const isPM = /下午|晚上|傍晚|夜里/.test(s)
      const isAM = /早上|早晨|上午|中午/.test(s)
      let hour = h
      if (isPM && hour < 12) hour += 12
      if (!isAM && !isPM) {
        if (hour >= 1 && hour <= 5) hour += 12 // 1-5点默认下午(例:4点=16:00)
      }
      if (hour < 0) hour = 0
      if (hour > 23) hour = 23
      if (min < 0) min = 0
      if (min > 59) min = 59
      return `${String(hour).padStart(2,'0')}:${String(min).padStart(2,'0')}`
    }

    const addDays = (base, n) => {
      const d = new Date(base)
      d.setDate(d.getDate() + n)
      return d
    }
    const fmtDate = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    const parseDate = (raw, ref) => {
      if (!raw) return null
      const s = String(raw)
      // 相对日
      if (/今天|今日/.test(s)) return fmtDate(ref)
      if (/明天|明日/.test(s)) return fmtDate(addDays(ref, 1))
      if (/大后天/.test(s)) return fmtDate(addDays(ref, 3))
      if (/后天/.test(s)) return fmtDate(addDays(ref, 2))
      // 周几 —— 提取"周X/星期X"中单独那个中文数字字(一二三四五六日天)，避免和前后字拼接
      const wm = s.match(/(下*[个]*)[周星期]([一二三四五六日天])/)
      if (wm) {
        const cn = wm[2]
        const targetW = cn==='日'||cn==='天' ? 0 : (CN_NUM[cn] ?? 0)
        let cur = ref.getDay()
        let diff = targetW - cur
        if (wm[1].includes('下')) { diff += 7 } else if (diff < 0) { diff += 7 }
        return fmtDate(addDays(ref, diff))
      }
      // XX号/XX日 —— 单独捕获数字片段，避免和前后中文字一起被转换
      const dm = s.match(/([\d零一二两三四五六七八九十]{1,4})\s*[号日]/)
      if (dm) {
        const dv = cnToNum(dm[1])
        if (!isNaN(dv)) {
          const d = new Date(ref.getFullYear(), ref.getMonth(), dv)
          if (d < new Date(ref.getFullYear(), ref.getMonth(), ref.getDate())) {
            d.setMonth(d.getMonth() + 1)
          }
          return fmtDate(d)
        }
      }
      // YYYY-MM-DD 格式直接过
      if (/^\d{4}-\d{2}-\d{2}$/.test(s.trim())) return s.trim()
      return null
    }

    let result = await chatJSON(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `当前日期：${fmtDate(today)}\n用户输入：${text}` },
      ],
      { temperature: 0.3, maxTokens: 2048 }
    )

    // 应用确定性后处理覆盖 AI 的时间日期（优先从用户原始文本解析）
    if (result && Array.isArray(result.tasks)) {
      result.tasks = result.tasks.map(t => {
        const fromTextTime = parseHour(text)
        const fromAITime = parseHour(t.time)
        const finalTime = fromTextTime ?? fromAITime ?? t.time ?? '10:00'
        const fromTextDate = parseDate(text, today)
        const fromAIDate = parseDate(t.date, today)
        const finalDate = fromTextDate ?? fromAIDate ?? t.date ?? fmtDate(today)
        return { ...t, date: finalDate, time: finalTime }
      })
    }

    res.json(result)
  } catch (err) {
    console.error('语音助手 AI 错误:', err.message)
    res.status(500).json({ message: 'AI 分析失败: ' + err.message })
  }
})

// ============================================================
// 2. 客户分析 — 画像分析、跟进建议、商机预测
// ============================================================
router.post('/customer-analysis', protect, async (req, res) => {
  try {
    const { customerName, customerInfo, records, projects } = req.body

    const systemPrompt = `你是一个专业的销售顾问 AI 助手。请根据客户信息和交互记录，提供深入的客户分析。

分析维度：
1. 客户画像：行业地位、采购特点、决策链特征
2. 跟进建议：下一步行动建议、最佳接触时机、关注重点
3. 商机预测：潜在需求、成交可能性评估、预估金额范围
4. 风险提示：可能的风险因素和应对策略

请用中文回答，结构清晰，语言专业。`

    const userContent = `客户名称：${customerName || '未知'}
客户信息：${JSON.stringify(customerInfo || {})}
交互记录：${JSON.stringify(records || [])}
关联项目：${JSON.stringify(projects || [])}`

    const result = await chat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      { temperature: 0.7, maxTokens: 2048 }
    )

    res.json({ analysis: result })
  } catch (err) {
    console.error('客户分析 AI 错误:', err.message)
    res.status(500).json({ message: 'AI 分析失败: ' + err.message })
  }
})

// ============================================================
// 3. 报告生成 — 周报、出差报告、拜访纪要、方案摘要
// ============================================================
router.post('/report-generation', protect, async (req, res) => {
  try {
    const { reportType, records, dateRange, extraInfo } = req.body

    const typeMap = {
      weekly: '周报',
      trip: '出差报告',
      visit: '拜访纪要',
      proposal: '方案摘要',
    }

    const reportTypeName = typeMap[reportType] || '报告'

    const systemPrompt = `你是一个专业的销售报告撰写助手。请根据提供的工作记录，生成一份结构清晰的${reportTypeName}。

要求：
1. 语言专业、简洁、有数据支撑
2. 结构包含：概述、主要工作、客户进展、问题与风险、下周计划
3. 如果是周报，按客户/项目维度组织
4. 如果是拜访纪要，包含：拜访目的、交流内容、客户反馈、后续行动
5. 如果是出差报告，包含：出差目的、行程安排、主要成果、费用概算
6. 如果是方案摘要，包含：方案概述、技术亮点、竞争优势、报价建议

请用 Markdown 格式输出。`

    const userContent = `报告类型：${reportTypeName}
时间范围：${dateRange || '本周'}
额外说明：${extraInfo || '无'}
工作记录：
${JSON.stringify(records || [], null, 2)}`

    const result = await chat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      { temperature: 0.7, maxTokens: 4096 }
    )

    res.json({ content: result, reportType: reportTypeName })
  } catch (err) {
    console.error('报告生成 AI 错误:', err.message)
    res.status(500).json({ message: 'AI 生成失败: ' + err.message })
  }
})

// ============================================================
// 4. 行业洞察 — 行业资讯智能摘要
// ============================================================
router.post('/industry-insight', protect, async (req, res) => {
  try {
    const { topic, articles } = req.body

    const systemPrompt = `你是一个行业研究 AI 助手，擅长从多篇资讯中提取关键洞察。

请根据提供的行业资讯，生成一份结构化的行业洞察报告：
1. 行业趋势：总结主要趋势和发展方向
2. 市场动态：价格变化、供需关系、竞争格局
3. 技术进展：新技术、新工艺、新材料动态
4. 对销售的建议：如何将这些信息转化为销售机会
5. 风险提示：需要关注的潜在风险

请用中文回答，语言简洁有力。`

    const userContent = `主题：${topic || '锻造/高温合金行业'}
资讯内容：
${articles || '请基于你的知识提供最新的行业洞察。'}`

    const result = await chat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      { temperature: 0.7, maxTokens: 2048 }
    )

    res.json({ insight: result })
  } catch (err) {
    console.error('行业洞察 AI 错误:', err.message)
    res.status(500).json({ message: 'AI 分析失败: ' + err.message })
  }
})

// ============================================================
// 5. AI 对话（通用流式）
// ============================================================
router.post('/chat', protect, async (req, res) => {
  try {
    const { messages } = req.body
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ message: '请提供消息数组' })
    }

    // 添加系统提示
    const systemMessage = {
      role: 'system',
      content: '你是一个销售工作台的 AI 助手，帮助销售人员处理日常工作、分析客户、生成报告、提供行业洞察。请用中文回答。',
    }

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    await chatStream(
      [systemMessage, ...messages],
      { temperature: 0.7, maxTokens: 2048 },
      (chunk) => {
        res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`)
      }
    )

    res.write('data: [DONE]\n\n')
    res.end()
  } catch (err) {
    console.error('AI 对话错误:', err.message)
    if (!res.headersSent) {
      res.status(500).json({ message: 'AI 对话失败: ' + err.message })
    } else {
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`)
      res.end()
    }
  }
})

// ============================================================
// 6. 备忘录知识沉淀
// ============================================================
router.post('/memo-knowledge', protect, async (req, res) => {
  try {
    const { content } = req.body
    if (!content || !content.trim()) {
      return res.status(400).json({ message: '请提供备忘录内容' })
    }

    const systemPrompt = `你是一个知识管理助手。请从备忘录内容中提取结构化的知识条目。

返回 JSON 格式：
{
  "title": "简洁的标题（不超过20字）",
  "summary": "内容摘要（不超过100字）",
  "tags": ["标签1", "标签2"],
  "category": "分类（如：客户洞察、技术工艺、市场趋势、竞品信息、其他）"
}`

    const result = await chatJSON(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content },
      ],
      { temperature: 0.3, maxTokens: 512 }
    )

    res.json(result)
  } catch (err) {
    console.error('备忘录知识沉淀 AI 错误:', err.message)
    res.status(500).json({ message: 'AI 分析失败: ' + err.message })
  }
})

// ============================================================
// 7. 语音文本锻造专业矫正
// ============================================================
router.post('/voice-correct', protect, async (req, res) => {
  try {
    const { text } = req.body
    if (!text || !text.trim()) {
      return res.status(400).json({ message: '请提供语音文本' })
    }

    const systemPrompt = `你是锻造工艺专业文本矫正与语义解析专家。
任务：接收语音识别（ASR）输出的原始文本，语音识别存在大量同音错别字、口语化表述，你需要完成以下规则，严格遵守：

1. 语境强制锁定：默认所有内容均属于【金属锻造、锻件热处理、航空锻件、压力加工】领域，优先按照锻造专业术语修正同音、近音错误；
2. 错别字自动校正对照表（高频语音误识别重点）：
段造 → 锻造；断件 → 锻件；毛坯 → 毛胚（语音混淆双向修正）；
翠火 → 淬火；回洗 → 回火；实效 → 时效；固融 → 固溶；
热处里 → 热处理；锻胚 → 锻坯；筒节 → 筒结；封头 → 封投；
晶粒 → 晶粒；变形量 → 变行量；镦粗 → 墩粗；拔长 → 拔常；
轧制 → 扎制；GH4169、17-4PH、In783等合金牌号识别出错时自动修正；
退火 → 退伙；金相 → 金象；应力 → 映力；
3. 处理优先级：
① 先修正语音同音错误，还原标准锻造术语；
② 保留说话人原本语义，禁止擅自篡改原意、不要凭空增加不存在的内容；
③ 口语短句保留简洁，不要过度扩写；
④ 如果出现歧义句子，优先选用锻造行业释义，不选用日常通用释义；
4. 输出格式：
第一行：【校正后标准锻造专业文本】
第二行可选：【简要说明：修正了哪些语音识别错误（简短）】

约束：不要闲聊，只执行文本校正；如果文本完全和锻造无关，原样输出并标注「未检测到锻造相关内容」。`

    const result = await chat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text },
      ],
      { temperature: 0.1, maxTokens: 1024 }
    )

    res.json({ correctedText: result, originalText: text })
  } catch (err) {
    console.error('语音文本矫正 AI 错误:', err.message)
    res.status(500).json({ message: 'AI 矫正失败: ' + err.message })
  }
})

module.exports = router
