/**
 * AI 功能路由
 * 4 类接口：语音助手、客户分析、报告生成、行业洞察
 */

const express = require('express')
const router = express.Router()
const { protect } = require('../middleware/auth')
const { isConfigured, isAsrConfigured, chat, chatStream, chatJSON, speechToText } = require('../services/baiduService')

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
// 1. 语音转文字（ASR）— 小程序 wx.getRecorderManager 录音上传 base64
// ============================================================
router.post('/voice-asr', protect, async (req, res) => {
  try {
    if (!isAsrConfigured()) {
      return res.status(503).json({
        message: '语音识别服务未配置：请在环境变量中设置 BAIDU_ASR_API_KEY / BAIDU_ASR_SECRET_KEY（百度智能云 语音技术 REST API 密钥，与千帆大模型不是同一组）。当前可手动输入文字后点击"分析提取"继续使用。',
        configured: false,
      })
    }
    const { audioBase64, format, sampleRate, channels } = req.body
    if (!audioBase64) {
      return res.status(400).json({ message: '请上传音频' })
    }
    const text = await speechToText(audioBase64, { format, sampleRate, channels })
    res.json({ text, formattedBy: 'baidu-asr' })
  } catch (err) {
    console.error('ASR 错误:', err.message)
    res.status(500).json({ message: '语音识别失败: ' + err.message, configured: isAsrConfigured() })
  }
})

// ============================================================
// 2. 语音助手 — 解析销售指令，自动提取任务信息
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

    let systemPrompt = ''
    let userContent = ''

    if (reportType === 'trip') {
      // 出差报告使用固定模板
      systemPrompt = `角色：出差报告生成助手
你的任务：根据用户输入的出差基础信息、拜访客户信息、现场沟通情况，严格按照给定的固定报告模板，生成一份企业内部商务出差日报报告。

输出规则：
1. 严格使用下面固定模板结构，不得新增、删减模块；
2. 所有业务信息全部来自用户提供的输入，禁止虚构客户、项目、时间节点、商机；
3. 语言为工业制造/核电锻件行业商务书面语，务实客观；
4. 如果用户某项输入为空，则对应位置填写"无"；
5. 输出直接输出报告正文，不要额外解释、不要markdown标题符号，输出格式适合复制粘贴到Word；
6. 复选框：☐代表未勾选，☑代表已勾选。

====固定报告模板结构====
出差报告
日报时间：{日报时间}

一、基本信息
出差人：{出差人}
出差时间：{出差时间}
出差地点：{出差地点}

二、出差计划和目标
主要目的（可勾选）：{获取商机} {洽谈订单} {维护关系} {技术交流} {收款} {处理问题} {其它}

三、出差对象（多客户循环生成，一个客户一组）
客户单位名称：{客户单位名称}
拜访客户姓名：{拜访客户姓名}
客户职位：{客户职位}
联系方式：{联系方式}
关系层级：{关系层级}
客户影响力：{客户影响力}
客户背景：{客户背景}
其它客户关系情况说明：{其它客户关系情况说明}

四、出差日报总结（当天）
（一）计划事项达成情况
{计划达成详情}

大小业主交流记录（如项目启动、资金到位情况、项目设计进展等）：{业主交流记录}

其他人员交流记录：{其他人员交流记录}

（二）其他收获（其他有价值信息，选填）
{其他收获，包含行业、竞品、市场机会等信息}

（三）风险（如业务风险、客户风险、技术风险、交付质量风险等，选填）
{风险内容}

（四）求助（需要协调的资源，如高层出面、技术支持、内部资源协调等，选填）
{求助需要协调资源}

（五）下一步行动计划（明确接下来需要推进的具体事项）
{下一步行动计划，区分商机跟进、合同推进、回款、内部协同、客户回访节点}`

      userContent = `请根据以下输入信息生成出差报告。

时间范围：${dateRange || '无'}
额外说明：${extraInfo || '无'}

工作记录/输入内容：
${JSON.stringify(records || [], null, 2)}`
    } else {
      systemPrompt = `你是一个专业的销售报告撰写助手。请根据提供的工作记录，生成一份结构清晰的${reportTypeName}。

要求：
1. 语言专业、简洁、有数据支撑
2. 结构包含：概述、主要工作、客户进展、问题与风险、下周计划
3. 如果是周报，按客户/项目维度组织
4. 如果是拜访纪要，包含：拜访目的、交流内容、客户反馈、后续行动
5. 如果是方案摘要，包含：方案概述、技术亮点、竞争优势、报价建议

请用 Markdown 格式输出。`

      userContent = `报告类型：${reportTypeName}
时间范围：${dateRange || '本周'}
额外说明：${extraInfo || '无'}
工作记录：
${JSON.stringify(records || [], null, 2)}`
    }

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

// ============================================================
// 8. 出差报告生成
// ============================================================
router.post('/travel-report', protect, async (req, res) => {
  try {
    const d = req.body || {}

    const systemPrompt = `# 角色设定
你是资深工业装备销售出差报告分析师，对标高质量销售出差报告范式。用户会提供零散原始出差素材：现场手记、聊天片段、口头纪要、碎片化想法、以及结构化表单字段。你不要简单复制搬运原文做文本分割。基于已有事实做业务推演、信息解读，**严禁编造不存在事实；原文缺失信息统一标注【待确认】**。

# 固定强制输出8大模块，严格按照下面顺序输出Markdown格式，用于导出Word

## 一、基本信息
自动从素材提取：出差人、出差时间、出差地点、出差核心目的
（建议用表格形式呈现，更规范）

## 二、出差计划和目标
梳理本次出差预先计划目标，区分：既定完成目标、未完成目标
（用✅/⏳标记状态，逐条列出）

## 三、出差对象
逐条列出所有拜访客户人员：单位、姓名、职位；
对每个人拆解：该人员权责、对我方态度、核心关注点、潜在顾虑。区分采购/生产/质量/仓库/技术等不同岗位视角。
（每个对象单独成二级小节，结构化呈现）

## 四、现场走访核心事实
只写客观发生事实，不做主观判断：
1.会议沟通情况
2.现场实物观察（产品使用、现场工况）
3.各方口头表述原话要点

## 五、客户诉求&痛点挖掘
区分客户**表面说出来的诉求** 和 **背后隐藏真实痛点**，按客户岗位分类整理。
（建议用表格对比形式）

## 六、项目现状与风险点
风险分类：交付风险、质量风险、商务风险、客户关系风险；每条写明风险现象、影响程度。
（建议用风险矩阵表格：风险分类｜风险现象｜影响程度｜说明）

## 七、下一步行动项
每条行动项严格格式：【具体动作】｜责任人｜截止时间｜输出交付物
禁止模糊词语，禁止只写"跟进一下"；没有确定时间写【待确认时间】。

## 八、总结与机会研判
1.本次出差整体结论
2.短期可落地商机
3.中长期潜在机会
4.需要警惕的问题
5.【信息补采清单】：本次素材不足，下次现场需要采集哪些信息

# 硬性约束规则
1.清晰区分：客观事实（现场发生）、分析研判（业务推导），不要混为一谈
2.素材信息不够时，不要虚构内容，使用【待确认】标记，同时输出信息补采清单（至少3条以上）
3.排版使用markdown列表层级，干净规整，适配Word导出
4.禁止大段啰嗦，要点化呈现，逻辑分层清晰
5.如果我给你的原始材料内容很少，不要强行扩写大量虚假内容，优先把缺失项标记出来。
6.输出直接输出报告正文，从"# 出差报告"标题开始，不要额外解释、不要前置说明。`

    // 优先使用 rawText（碎片化原始记录），其次用结构化表单字段
    const hasRawText = d.rawText && String(d.rawText).trim().length > 5
    let userContent = ''

    if (hasRawText) {
      userContent = `请阅读以下用户提供的"原始出差记录碎片化素材"，从中自动提取、分类、归纳、业务推演，严格按照上方8大模块模板生成一份完整的出差报告。

自动完成的工作：
1. 从文本中识别基础信息（出差人、时间、地点、目的）；缺失则使用下方兜底信息，兜底也没有则标【待确认】
2. 从文本中提取所有拜访人员：姓名、单位、职位；并对每人基于岗位视角做权责/态度/关注点/顾虑分析
3. 分离"客观发生的事实"和"基于事实的业务推演研判"，事实放模块四，推演放模块五、六、八
4. 表面诉求 vs 隐藏痛点：对客户提出的每个要求，分析其背后真实压力与驱动因素
5. 风险矩阵：按交付/质量/商务/客户关系分类，写清现象、影响程度、说明
6. 行动项严格遵守"【具体动作】｜责任人｜截止时间｜输出交付物"格式，禁止模糊
7. 总结研判部分要输出至少5条以上的【信息补采清单】

---
【基本信息兜底（原始文本找不到时用此为准）】
出差人：${d.travelers || '【待确认】'}
出差日期：${d.travelDate || '【待确认】'}
出差地点：${d.location || '【待确认】'}
出差目的勾选：${d.purpose || '（自动识别）'}
客户信息：${d.clients || '（自动识别）'}
---

【原始出差记录碎片化素材】：
${d.rawText}

请严格按照8大模块模板输出报告。`
    } else {
      // 结构化表单输入
      userContent = `请根据以下结构化表单字段信息，严格按照上方8大模块模板生成一份完整专业的出差报告。
表单中未填写的字段，请标注【待确认】。

【基本信息】
出差人：${d.travelers || '【待确认】'}
出差日期：${d.travelDate || '【待确认】'}
出差地点：${d.location || '【待确认】'}
出差目的：${d.purpose || '【待确认】'}

【出差对象（客户信息）】
${d.clients || '【待确认】'}
客户背景：${d.customerBackground || '【待确认】'}
客户关系说明：${d.customerRelations || '【待确认】'}

【现场沟通记录】
计划事项达成情况：${d.planAchievement || '【待确认】'}
大小业主交流记录：${d.ownerComm || '【待确认】'}
其他人员交流记录：${d.otherComm || '【待确认】'}

【其他信息】
行业/市场补充：${d.industryInfo || d.marketInfo || '【待确认】'}
其他收获：${d.otherHarvest || '【待确认】'}
风险：${d.risks || '【待确认】'}
求助：${d.helpNeeded || '【待确认】'}
下一步行动计划：${d.nextSteps || '【待确认】'}

请严格按照8大模块模板输出报告。`
    }

    try {
      const result = await chat(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        { temperature: 0.5, maxTokens: 8192 }
      )
      res.json({ content: result })
    } catch (aiErr) {
      console.warn('出差报告 AI 失败，使用本地模板:', aiErr.message)
      const fallback = buildFallbackReport(d)
      res.json({ content: fallback, fallback: true, warning: 'AI 服务暂不可用，已使用本地模板生成' })
    }
  } catch (err) {
    console.error('出差报告生成错误:', err.message)
    const fallback = buildFallbackReport(req.body || {})
    res.json({ content: fallback, fallback: true })
  }
})

// 本地正则解析出差记录（AI 不可用时的降级方案）
function parseTripTextLocal(text, fallback) {
  if (!text || text.trim().length < 5) return null
  const t = text.trim()

  // 提取日期
  const dateMatch = t.match(/(\d{1,2})月(\d{1,2})日/) || t.match(/(\d{4})-(\d{1,2})-(\d{1,2})/)
  let reportDate = ''
  let travelDate = fallback.travelDate || ''
  if (dateMatch) {
    if (dateMatch[0].includes('月')) {
      const now = new Date()
      reportDate = `${now.getFullYear()}-${String(dateMatch[1]).padStart(2, '0')}-${String(dateMatch[2]).padStart(2, '0')}`
      travelDate = travelDate || dateMatch[0]
    } else {
      reportDate = dateMatch[0]
      travelDate = travelDate || dateMatch[0]
    }
  }

  // 提取地点（去...出差/到...出差/去...拜访）
  const destMatch = t.match(/(?:去|到|前往)([\u4e00-\u9fa5]{2,6})(?:出差|拜访|访问)/)
  const destination = destMatch ? destMatch[1] : (fallback.location || '')

  // 提取客户（拜访...见...）
  const customerMatches = []
  const visitPattern = /(?:拜访|会见|见到|见|走访)([\u4e00-\u9fa5]{2,20}?)(?:的|，|,|。|\.|;|；|张总|李总|王总|刘总|陈总|赵总|总经理|主任|经理|总监|工|博士|先生|女士)/g
  let m
  while ((m = visitPattern.exec(t)) !== null) {
    customerMatches.push(m[1].trim())
  }
  // 如果没匹配到，尝试"XX的XX总"模式
  if (customerMatches.length === 0) {
    const custPattern = /([\u4e00-\u9fa5]{2,15})(?:张总|李总|王总|刘总|陈总|赵总|总经理|主任|经理|总监)/g
    while ((m = custPattern.exec(t)) !== null) {
      customerMatches.push(m[1].trim())
    }
  }

  // 提取联系人（XX总/XX工/XX经理）
  const contactPattern = /([\u4e00-\u9fa5]{1,3}(?:总|工|经理|主任|总监|博士|先生|女士))/g
  const contacts = []
  while ((m = contactPattern.exec(t)) !== null) {
    contacts.push(m[1])
  }

  // 构建客户数组
  const customers = []
  if (customerMatches.length > 0) {
    customerMatches.forEach((cn, i) => {
      customers.push({
        customerName: cn,
        contactName: contacts[i] || '',
        contactTitle: '',
        contactInfo: '',
        relationLevel: '',
        influence: '',
        customerBackground: '',
        otherRelation: '',
      })
    })
  }

  // 提取目的
  const purposes = []
  if (/商机|机会|新项目|潜在/.test(t)) purposes.push('获取商机')
  if (/洽谈|谈判|合同|签单|报价|订单/.test(t)) purposes.push('洽谈订单')
  if (/维护|关系|回访|拜访/.test(t)) purposes.push('维护关系')
  if (/技术|方案|工艺|交流|讨论/.test(t)) purposes.push('技术交流')
  if (/收款|回款|付款|账期/.test(t)) purposes.push('收款')
  if (/问题|故障|售后|质量|处理/.test(t)) purposes.push('处理问题')

  // 提取电话
  const phoneMatch = t.match(/1[3-9]\d{9}/)
  if (phoneMatch && customers.length > 0) {
    customers[0].contactInfo = phoneMatch[0]
  }

  // 提取风险
  const riskMatch = t.match(/(?:风险|问题|隐患|困难|挑战)([：:])?\s*([^\n。；]{5,100})/)
  const risks = riskMatch ? riskMatch[2].trim() : ''

  // 提取下一步
  const nextMatch = t.match(/(?:下一步|接下来|下周|后续|计划)([：:])?\s*([^\n。；]{5,200})/)
  const nextAction = nextMatch ? nextMatch[2].trim() : ''

  // 整体内容作为 planAchievement
  const planAchievement = t

  return {
    reportDate,
    traveler: fallback.travelers || '',
    travelDate,
    destination,
    purposes,
    purposeOtherText: '',
    customers: customers.length > 0 ? customers : [{ customerName: '', contactName: '', contactTitle: '', contactInfo: '', relationLevel: '', influence: '', customerBackground: '', otherRelation: '' }],
    planAchievement,
    ownerCommunication: '',
    otherCommunication: '',
    otherGains: '',
    risks,
    helpNeeded: '',
    nextAction,
  }
}

// 出差报告 — AI 解析原始文本，返回结构化字段 JSON
router.post('/trip-parse', protect, async (req, res) => {
  try {
    const { rawText, travelers, travelDate, location } = req.body || {}

    if (!rawText || String(rawText).trim().length < 5) {
      return res.status(400).json({ error: '请输入需要解析的出差记录内容' })
    }

    const systemPrompt = `你是一位工业制造/核电锻件行业的资深商务报告撰写专家。用户会粘贴一段自由格式的出差记录文本，你需要从中提取结构化信息，并进行专业扩写和用词优化，最终严格按照以下 JSON 格式输出。

只能输出 JSON，不要输出任何其他文字、解释或 markdown 标记。

【核心要求 — AI 扩写与优化】
1. 语言风格：使用工业制造/核电锻件行业商务书面语，务实客观、专业严谨
2. 扩写规则：用户输入往往是口语化短句或关键词，你必须将其扩写为 2-5 句专业、完整、有逻辑的段落
   - 例如用户输入"确认了交付节点" → 扩写为"就GH4169机匣锻件交付节点与客户进行了深入沟通，双方确认8月底为最终交付时间节点，客户对当前生产进度表示认可"
   - 例如用户输入"聊了技术方案" → 扩写为"围绕TC4钛合金锻件技术方案展开了详细技术交流，就材料性能指标、工艺路线、检测标准等关键参数进行了充分讨论"
3. 用词优化：将口语化表达转化为商务书面语
   - "聊了" → "就…进行了深入交流/沟通"
   - "说了" → "明确提出/强调指出"
   - "觉得不错" → "表示认可/给予肯定评价"
   - "有问题" → "存在风险/需重点关注"
   - "下次再聊" → "计划于…进行后续沟通"
4. 结构化整理：将碎片化信息按逻辑归类到对应字段，每个字段内容需完整、连贯
5. 禁止编造：不编造未提及的人名、公司名、具体数据，但基于行业常识进行合理的背景补充和逻辑推理是允许的
6. 空值处理：文本中未提及的字段填空字符串""

JSON 字段说明：
{
  "reportDate": "日报时间，格式 YYYY-MM-DD，如文本中没有则留空",
  "traveler": "出差人姓名，如文本中没有则填用户提供的兜底值",
  "travelDate": "出差时间，如 '2026-07-15 至 2026-07-16'，如文本中没有则填用户提供的兜底值",
  "destination": "出差地点，如文本中没有则填用户提供的兜底值",
  "purposes": ["从以下选项中选：获取商机/洽谈订单/维护关系/技术交流/收款/处理问题/其它"],
  "purposeOtherText": "如果目的包含'其它'，这里填具体说明，否则留空",
  "customers": [
    {
      "customerName": "客户单位名称",
      "contactName": "拜访客户姓名",
      "contactTitle": "客户职位",
      "contactInfo": "联系方式",
      "relationLevel": "关系层级，如关键决策人/技术对接人等",
      "influence": "客户影响力，高/中/低",
      "customerBackground": "客户背景描述，需基于行业常识扩写为完整介绍",
      "otherRelation": "其它客户关系情况说明，扩写为完整的商务描述"
    }
  ],
  "planAchievement": "计划事项达成情况 — 将原文相关内容扩写为专业商务段落，分条目列出，每条2-5句",
  "ownerCommunication": "大小业主交流记录 — 扩写为完整描述，包含项目启动、资金到位、设计进展等维度",
  "otherCommunication": "其他人员交流记录 — 扩写为完整描述",
  "otherGains": "其他收获 — 将碎片信息扩写为行业洞察段落，包含行业趋势、竞品动态、市场机会等",
  "risks": "风险内容 — 扩写为分类风险描述（业务风险/客户风险/技术风险/交付质量风险等），每项需有具体说明",
  "helpNeeded": "求助需要协调的资源 — 扩写为明确的资源需求描述，说明需要什么人、什么时间、提供什么支持",
  "nextAction": "下一步行动计划 — 扩写为分条目的行动计划，区分商机跟进/合同推进/回款/内部协同/客户回访节点，每条需有明确目标和时间"
}

只输出 JSON，确保是合法 JSON 格式。`

    const userContent = `请解析以下出差记录文本，提取结构化信息。

兜底信息（文本中未提到时使用）：
出差人：${travelers || ''}
出差时间：${travelDate || ''}
出差地点：${location || ''}

出差记录文本：
${rawText}`

    try {
      const result = await chat(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        { temperature: 0.5, maxTokens: 6000 }
      )

      // 从 AI 返回中提取 JSON
      let parsed = null
      try {
        // 尝试直接解析
        parsed = JSON.parse(result)
      } catch {
        // 尝试从 markdown 代码块中提取
        const jsonMatch = result.match(/```(?:json)?\s*([\s\S]*?)```/)
        if (jsonMatch) {
          try { parsed = JSON.parse(jsonMatch[1].trim()) } catch { /* noop */ }
        }
        // 尝试从花括号中提取
        if (!parsed) {
          const braceMatch = result.match(/\{[\s\S]*\}/)
          if (braceMatch) {
            try { parsed = JSON.parse(braceMatch[0]) } catch { /* noop */ }
          }
        }
      }

      if (parsed) {
        res.json({ success: true, data: parsed })
      } else {
        // AI 返回了非 JSON，尝试返回原始文本让前端降级
        res.json({ success: false, rawResponse: result, error: 'AI 返回格式异常，请重试或手动填写' })
      }
    } catch (aiErr) {
      console.error('出差报告解析 AI 失败:', aiErr.message)
      // AI 不可用时，使用本地正则解析降级
      const fallback = parseTripTextLocal(rawText, { travelers, travelDate, location })
      if (fallback) {
        res.json({ success: true, data: fallback, fallback: true, warning: 'AI 服务暂不可用，已使用基础解析，请手动检查补充' })
      } else {
        res.status(500).json({ error: 'AI 服务暂不可用且本地解析失败，请手动填写' })
      }
    }
  } catch (err) {
    console.error('出差报告解析错误:', err.message)
    res.status(500).json({ error: '服务器错误' })
  }
})

function buildFallbackReport(data) {
  const d = data || {}
  const date = d.travelDate || new Date().toISOString().split('T')[0]
  const raw = String(d.rawText || '').trim()
  const p = (v) => (v && String(v).trim() ? String(v).trim() : '/')

  // 锚点词（用于边界）
  const ANCHORS = '关键影响|标准切换|时间节点|采购模式|远期增量|锻件市场|标杆落地|准入门槛|细分品类|板材市场|行业标杆|竞品梯队|我方切入|短板|上海辅机|下一步|行动计划|大小业主|其他人员'

  // 辅助函数：优先取捕获组；无捕获组则取整段匹配
  const pick = (m) => {
    if (!m) return null
    for (let i = 1; i < m.length; i++) {
      if (m[i] && m[i].trim() && m[i].trim().length > 3) return m[i].trim()
    }
    return m[0] && m[0].trim().length > 3 ? m[0].trim() : null
  }

  const extract = (patterns, fallback) => {
    for (const pat of patterns) {
      const m = raw.match(pat)
      const val = pick(m)
      if (val && val.length > 3) return val.replace(/[，,。；;、\s]+$/, '')
    }
    return fallback ? p(fallback) : '/'
  }

  // 提取"上海辅机厂"段落（优先匹配最后一次出现，或包含框架协议的段落）
  const otherClients = (() => {
    // 优先匹配含"框架协议/暂停/质量问题/交付问题"这段
    const m1 = raw.match(/(上海辅机厂[^，。；\n]{0,10}(?:已经签订框架协议|暂停下单|质量问题|交付问题|明年框架)[^，。；]{0,250}?)(?=下一步|行动计划|\s*\d+[.、]|$)/s)
    if (m1 && pick(m1)) {
      return '上海辅机厂：' + pick(m1).replace(/^上海辅机厂[\s：:]*/, '').replace(/[，,\s]+$/, '')
    }
    // 否则取最后一次出现"上海辅机厂"的段落
    let lastMatch = null
    const re = /上海辅机厂[\s：:]*(.{5,250}?)(?=下一步|行动计划|\s*\d+[.、]|$)/sg
    let mm
    while ((mm = re.exec(raw)) !== null) lastMatch = mm
    if (lastMatch) {
      const v = (pick(lastMatch) || '').replace(/^上海辅机厂[\s：:]*/, '').replace(/[，,\s]+$/, '')
      if (v && v.length > 2) return '上海辅机厂：' + v
    }
    return p(d.otherClients)
  })()

  // 基本信息
  const travelers = p(d.travelers)
  const location = p(d.location)
  const purpose = p(d.purpose)
  const clients = p(d.clients)

  // 行业核心变量
  const industryCore = extract([
    new RegExp(`行业核心变量[：:]\\s*(.{20,400}?)(?=关键影响|锻件市场|板材市场|${ANCHORS}|$)`, 's'),
    new RegExp(`(中核.{0,5}中广核.{0,5}华龙.{0,500}?)(?=关键影响|锻件|板材|${ANCHORS}|$)`, 's'),
  ], d.industryCore || d.industryVariable)

  const standardChange = extract([
    new RegExp(`标准切换[：:]\\s*(.{10,300}?)(?=时间节点|采购模式|远期增量|锻件市场|${ANCHORS}|$)`, 's'),
    new RegExp(`(评定体系.{0,80}RCCM.{0,80}NB标准|评定体系.{0,150}?资质不可顺延|切换.{0,100}?国产NB标准)`, 's'),
    /(欧洲.{0,5}RCCM.{0,30}国产.{0,10}NB[^，。；]{0,100})/s,
  ], d.standardChange)

  const timeline = extract([
    new RegExp(`时间节点[：:]\\s*(.{10,300}?)(?=采购模式|远期增量|锻件市场|${ANCHORS}|$)`, 's'),
    new RegExp(`(交付锁定.{0,150}?20\\d{2}.{0,50}开工.{0,50}20\\d{2}.{0,50}预计.{0,50}20\\d{2}|交付锁定.{0,120}20\\d{2}.{0,100}开工.{0,50}20\\d{2})`, 's'),
  ], d.timeline)

  const procurementMode = extract([
    new RegExp(`采购模式[：:]\\s*(.{10,300}?)(?=远期增量|锻件市场|${ANCHORS}|$)`, 's'),
    new RegExp(`(统一.{0,15}招标.{0,50}双供方.{0,50}两家合格供应商|上海国贸.{0,50}统一.{0,10}招标.{0,50}双供方托底)`, 's'),
  ], d.procurementMode)

  const longTermOpportunity = extract([
    new RegExp(`远期增量[：:]\\s*(.{10,300}?)(?=锻件市场|${ANCHORS}|$)`, 's'),
    new RegExp(`(聚变.{0,30}CN15\\d{2}.{0,80}黄金.{0,80}多机组叠加.{0,80}规模可观)`, 's'),
  ], d.longTermOpportunity)

  // 锻件市场
  const benchmark = extract([
    new RegExp(`标杆落地[：:]\\s*(.{10,300}?)(?=准入门槛|细分品类|板材市场|${ANCHORS}|$)`, 's'),
    new RegExp(`(武核.{0,250}?)(?=2\.0以后|准入门槛|细分品类|板材市场|${ANCHORS}|$)`, 's'),
    new RegExp(`锻件市场[：:]\\s*(.{20,300}?)(?=2\.0以后|准入门槛|细分品类|板材市场|${ANCHORS}|$)`, 's'),
  ], d.benchmark)

  const entryBarrier1 = extract([
    new RegExp(`(?:锻件.{0,5})?准入门槛[：:]\\s*(.{5,200}?)(?=细分品类|板材市场|${ANCHORS}|$)`, 's'),
    new RegExp(`(2\\.0以后.{0,80}?重新鉴定.{0,80}?问题)`, 's'),
  ], d.entryBarrier)

  const segmentCategory = extract([
    new RegExp(`细分品类[：:]\\s*(.{10,300}?)(?=板材市场|${ANCHORS}|$)`, 's'),
    new RegExp(`(贯穿件.{0,50}690.{0,50}合金.{0,5}套管.{0,100}304.{0,5}金属.{0,5}套管.{0,150}?)(?=板材市场|$)`, 's'),
  ], d.segmentCategory)

  // 板材市场
  const industryBenchmark = extract([
    new RegExp(`行业标杆[：:]\\s*(.{10,300}?)(?=准入门槛|竞品梯队|我方切入|${ANCHORS}|$)`, 's'),
    new RegExp(`(太钢.{0,200}?)(?=须覆盖|准入门槛|朱段企业|竞品梯队|${ANCHORS}|$)`, 's'),
    new RegExp(`板材市场[：:]\\s*(.{10,200}?)(?=须覆盖|准入门槛|竞品梯队|朱段|${ANCHORS}|$)`, 's'),
  ], d.industryBenchmark)

  const entryBarrier2 = extract([
    new RegExp(`(须覆盖.{0,5}?[\\d.]+\\s*mm.{0,200}?)(?=竞品梯队|我方切入|${ANCHORS}|$)`, 's'),
    new RegExp(`(全规格覆盖要求.{0,50}朱段.{0,50}超大规格瓶颈.{0,50}九钢.{0,100}供货资质|须覆盖.{0,5}[\\d.]+.{0,5}mm.{0,150}九钢)`, 's'),
  ], undefined)

  const competitorTiers = extract([
    new RegExp(`竞品梯队[：:]\\s*(.{10,300}?)(?=我方切入|${ANCHORS}|$)`, 's'),
    new RegExp(`(宝武.{0,5}第一.{0,50}舞洋.{0,50}久立.{0,50}酒钢.{0,100}?)`, 's'),
  ], d.competitorTiers)

  const entryPath = extract([
    new RegExp(`我方切入.{0,10}(?:路径|方式|策略)?[：:]\\s*(.{10,300}?)(?=短板|上海辅机|下一步|${ANCHORS}|$)`, 's'),
    new RegExp(`(示范.{0,10}试制.{0,5}合同.{0,50}全规格.{0,50}批量.{0,10}供货.{0,150}?)(?=短板|上海辅机|下一步|$)`, 's'),
  ], d.entryPath)

  // 下一步行动计划：先从原始文本抓段落，再解析"编号+事项+，+责任人"
  const nextStepsText = (() => {
    const ns = extract([
      new RegExp(`下一步行动计划[：:]\\s*(.{10,800}?$)`, 's'),
      new RegExp(`下一步[：:]\\s*(.{10,800}?$)`, 's'),
    ], d.nextSteps)
    if (ns === '/' || !ns) return p(d.nextSteps)

    // Step 1: 严格匹配每行开头的"编号."作为步骤分隔符（避免内容中"2.0、2027年"这类误切）
    // 在 ns 前后补换行，便于锚定"行首"
    const pad = '\n' + ns + '\n'
    // 匹配：行首 + 1~2位数字 + .或、 + 空格/内容，直到下一个行首编号或结尾
    const stepRegex = /\n\s*(\d{1,2})[.、]\s*([\s\S]*?)(?=\n\s*\d{1,2}[.、]\s|\n\s*$)/g
    const stepList = []
    let mm
    while ((mm = stepRegex.exec(pad)) !== null && stepList.length < 20) {
      const [_, noStr, restRaw] = mm
      const rest = restRaw.trim().replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').replace(/[，,\s]+$/, '')
      if (!rest || rest.length < 3) continue

      let item = rest, person = '/'
      // 从尾部找"，xxx" 或 " xxx"，xxx 像人名（1~12字，不像业务长词）
      const tailPatterns = [
        /^(.*)[，,、]\s*([\u4e00-\u9fa5A-Za-z·\/&\s]{1,12})\s*$/, // 最后一个逗号/顿号+人名
        /^(.*)\s+([\u4e00-\u9fa5A-Za-z][\u4e00-\u9fa5A-Za-z·\/&\s]{0,10})\s*$/, // 最后一个空格+人名
      ]
      for (const pat of tailPatterns) {
        const tm = rest.match(pat)
        if (tm && tm[1] && tm[1].trim().length > 3) {
          const cand = tm[2].trim()
          const looksLikePerson =
            cand.length >= 1 &&
            cand.length <= 12 &&
            !/^(.*)(数据|资料|方案|计划|申请|检测|提交|部门|技术|采购|华龙|一机床|团队|厂区|无锡|产线|示范|项目|企业|客户|合同|验证|标准|国贸|批量|供货|业绩|锻件|集采|需求|工艺|试制|完整|报告|机构|资质)$/.test(cand) &&
            !/[\d（）()]/.test(cand)
          if (looksLikePerson) {
            item = tm[1].trim().replace(/[，,、\s]+$/, '')
            person = cand
            break
          }
        }
      }
      if (item.length < 3) { item = rest; person = '/' }
      stepList.push({ no: noStr, item, person })
    }

    if (stepList.length === 0) return ns
    const rows = ['| 序号 | 事项 | 责任人 | 目标完成时间 |', '| --- | --- | --- | --- |']
    const seen = new Set()
    for (const s of stepList) {
      if (seen.has(s.no)) continue
      seen.add(s.no)
      rows.push(`| ${s.no} | ${s.item} | ${s.person} | / |`)
    }
    return rows.join('\n')
  })()

  // 客户单位1（一机床）客户背景
  const client1Background = extract([
    new RegExp(`(一机床是.{10,200}?)(?=行业核心变量|关键影响|${ANCHORS}|$)`, 's'),
    new RegExp(`对接客户[：:](.{10,300}?)(?=行业核心变量|${ANCHORS}|$)`, 's'),
  ], undefined)

  const lines = []
  lines.push('# 出差报告')
  lines.push(`**日报时间**：${date}`)
  lines.push('')
  lines.push('## 一、基本信息')
  lines.push(`- **出差人**：${travelers}`)
  lines.push(`- **出差时间**：${date}`)
  lines.push(`- **出差地点**：${location}`)
  lines.push('')
  lines.push('## 二、出差计划和目标')
  lines.push(`主要目的：${purpose}`)
  lines.push('')
  lines.push('## 三、出差对象（多人可复制该格式）')
  lines.push(`- **客户单位名称**：${clients}`)
  lines.push(`- **客户背景**：${p(d.customerBackground)}`)
  lines.push(`- **其它客户关系情况说明**：${p(d.customerRelations)}`)
  lines.push('')
  lines.push('## 四、出差日报总结（当天）')
  lines.push('')
  lines.push('### （一）计划事项达成情况')
  lines.push(raw && raw.length > 50 ? '（以下内容已从原始出差记录自动抽取归纳，按八大卡片结构展示）' : p(d.planAchievement))
  lines.push('')
  lines.push('#### 一、上海第一机床厂出差报告')
  lines.push(`**出差时间**：${date}`)
  lines.push(`**出差地点**：${location}（临港新片区倚天路185号）`)
  lines.push(`**对接客户**：${client1Background !== '/' ? client1Background : '（详见出差对象）'}`)
  lines.push('')
  lines.push('##### （一）行业核心变量')
  lines.push(industryCore)
  lines.push('**关键影响：**')
  lines.push(`- **标准切换**：${standardChange}`)
  lines.push(`- **时间节点**：${timeline}`)
  lines.push(`- **采购模式**：${procurementMode}`)
  lines.push(`- **远期增量**：${longTermOpportunity}`)
  lines.push('')
  lines.push('##### （二）锻件市场')
  lines.push(`**标杆落地：**${benchmark}`)
  lines.push(`**准入门槛：**${entryBarrier1}`)
  lines.push(`**细分品类：**${segmentCategory}`)
  lines.push('')
  lines.push('##### （三）板材市场')
  lines.push(`**行业标杆：**${industryBenchmark}`)
  lines.push(`**准入门槛：**${entryBarrier2 !== undefined ? entryBarrier2 : p(d.entryBarrier)}`)
  lines.push(`**竞品梯队：**${competitorTiers}`)
  lines.push(`**我方切入路径：**${entryPath}`)
  lines.push('')
  lines.push('#### 二、上海辅机厂')
  lines.push(otherClients)
  lines.push('')
  lines.push(`##### （四）大小业主交流记录：${p(d.ownerComm)}`)
  lines.push(`##### （五）其他人员交流记录：${p(d.otherComm)}`)
  lines.push('')
  lines.push('### （二）其他收获（其他有价值信息，选填）')
  lines.push(p(d.otherHarvest))
  lines.push(`1、**行业盈利格局判断**：${p(d.profitPattern)}`)
  lines.push('')
  lines.push(`### （三）风险：${p(d.risks)}`)
  lines.push('')
  lines.push(`### （四）求助：${p(d.helpNeeded)}`)
  lines.push('')
  lines.push('### （五）下一步行动计划（明确接下来需要推进的具体事项）')
  lines.push(nextStepsText)
  lines.push('')
  lines.push('---')
  lines.push('*AI 服务暂不可用 · 本地模板从原始记录自动抽取生成，可手动微调完善*')
  return lines.join('\n')
}

module.exports = router
