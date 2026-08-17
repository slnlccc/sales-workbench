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

// ============================================================
// 8. 出差报告生成
// ============================================================
router.post('/travel-report', protect, async (req, res) => {
  try {
    const d = req.body || {}

    const systemPrompt = `你是一个专业的出差报告撰写助手。请根据用户提供的出差信息，生成一份结构清晰、内容详实的出差报告。

报告格式要求（严格按照以下模板生成，不要添加额外说明）：

# 出差报告
**日报时间**：[日期]

## 一、基本信息
- **出差人**：[出差人姓名，多人用/分隔]
- **出差时间**：[出差日期]
- **出差地点**：[出差地点，含具体地址]

## 二、出差计划和目标
主要目的：[从"获取商机、洽谈订单、维护关系、技术交流、收款、处理问题"中选多个，用√/×或☑/☐]

## 三、出差对象（多人可复制该格式）
- **客户单位名称**：[客户单位]
- **拜访客户姓名**：[客户姓名，多人用顿号分隔]
- **客户职位**：[客户职位，多人对应说明]
- **联系方式**：[联系方式，如微信/电话]
- **关系层级**：[支持/合作/中性/竞争]
- **客户影响力**：[决策评估者/关键影响人/执行人/采购人/技术把关人]
- **客户背景**：[公司背景、行业地位、主营业务等]
- **其它客户关系情况说明**：[关键联系人、历史合作情况等]

## 四、出差日报总结（当天）

### （一）计划事项达成情况
[按客户单位分组说明，结构如下，如多家客户则复制该结构]

#### 一、[客户单位1]出差报告
**出差时间**：[具体时间]
**出差地点**：[具体地址]
**对接客户**：[客户背景与核心地位说明]

##### （一）行业核心变量：[如 中核+中广核华龙一号2.0融合 等]
[两大集团/行业龙头技术整合说明]
**关键影响：**
- **标准切换**：[评定体系、资质、标准变更情况]
- **时间节点**：[招标、开工、交付等关键时间节点]
- **采购模式**：[招标方/渠道/统一采购/双供方等采购机制]
- **远期增量**：[新材料、新订单、多机组叠加等远期机会]

##### （二）锻件市场：[如 依托武核业绩打开市场]
**标杆落地：**[标杆项目、业绩、质量管控认可情况]
**准入门槛：**[资质/鉴定/认证等门槛]
**细分品类：**[品类1（壁垒/竞争情况）、品类2（壁垒/竞争情况）…]

##### （三）板材市场：[如 全规格覆盖是硬性门槛，民企存在切入空间]
**行业标杆：**[核心标杆供应商、报废后补产周期、核心工艺、价格策略]
**准入门槛：**[全规格覆盖要求、厚度范围、头部供方情况]
**竞品梯队：**[第一梯队（品牌+稳定性）→ 第二梯队（备选）→ 第三梯队（部分规格）]
**我方切入路径：**[示范合同→全规格验证→正式批量供货；并说明优势与短板]

#### 二、[客户单位2] [如 上海辅机厂]
[该客户当前合作框架、质量问题、交付问题、暂停下单情况、恢复下单条件、明年框架准备情况]

##### （四）大小业主交流记录
[项目启动、资金到位、设计进展等]

##### （五）其他人员交流记录
[其他有价值的沟通内容]

### （二）其他收获（其他有价值信息）
1、**行业盈利格局判断**：[行业利润区间、价格趋势、成本结构]

### （三）风险（业务风险、客户风险、技术风险等）
[分类列出：业务风险 / 客户风险 / 技术风险 / 交付风险 / 质量风险 / 竞争风险]

### （四）求助（需要协调的资源，如总经理出面、技术支持等）
[明确需要什么人、什么时间、提供什么支持]

### （五）下一步行动计划（明确接下来需要推进的具体事项，包括责任人）
| 序号 | 事项 | 责任人 | 目标完成时间 |
| --- | --- | --- | --- |
| 1 | [具体事项1] | [责任人] | [时间] |
| 2 | [具体事项2] | [责任人] | [时间] |

---

写作要求：
1. **AI 必须扩充丰富**：用户往往只输入关键词或短句，请基于行业常识将其扩写成 2-5 句的专业、完整、有逻辑的段落；注意用词得体、结构完整（开头-主体-收尾）。
2. 语言专业、简洁、有数据支撑；不要编造具体人名、公司名、日期、数据；但基于合理的行业常识进行背景补充是允许的。
3. 严格按照上述结构输出，缺少小标题也要保留标题骨架并标注"/"
4. 保留原始信息中的关键数据、人名、公司名、日期
5. 对于"关键影响、标准切换、时间节点、采购模式、远期增量、标杆落地、准入门槛、细分品类、行业标杆、竞品梯队、我方切入路径"等关键子标题，**用户提供了关键词就扩写成完整段落；未提供就给出空占位符"/"**。
6. 下一步行动计划，输入只有"1.提交资料-赵涛"这类简版时，自动扩充成"1. 待武核锻件发运完成后，向一机床采购部门与技术部门同步提交完整试制资料及第三方检测数据，确保资质转证材料齐备（责任人：赵涛）。"这种格式。
7. 使用 Markdown 格式输出，报告整体长度 1000-2500 字为宜。`

    const userContent = `请根据以下出差信息生成完整报告：

出差人：${d.travelers || '未提供'}
出差日期：${d.travelDate || new Date().toISOString().split('T')[0]}
出差地点：${d.location || '未提供'}
出差目的：${d.purpose || '未提供'}
客户信息：${d.clients || '未提供'}
客户背景：${d.customerBackground || '（无）'}
客户关系说明：${d.customerRelations || '（无）'}

计划事项达成情况：
${d.planAchievement || '（无详细信息）'}

行业核心变量：
${d.industryCore || d.industryVariable || '（无详细信息）'}

关键影响：
- 标准切换：${d.standardChange || '（无）'}
- 时间节点：${d.timeline || '（无）'}
- 采购模式：${d.procurementMode || '（无）'}
- 远期增量：${d.longTermOpportunity || '（无）'}

锻件市场：
- 标杆落地：${d.benchmark || '（无）'}
- 准入门槛：${d.entryBarrier || '（无）'}
- 细分品类：${d.segmentCategory || '（无）'}

板材市场：
- 行业标杆：${d.industryBenchmark || '（无）'}
- 竞品梯队：${d.competitorTiers || '（无）'}
- 我方切入路径：${d.entryPath || '（无）'}

其他客户单位情况：
${d.otherClients || '（无）'}

大小业主交流记录：
${d.ownerComm || '（无）'}
其他人员交流记录：
${d.otherComm || '（无）'}

行业/市场信息（补充）：
${d.industryInfo || d.marketInfo || '（无）'}

其他收获：
${d.otherHarvest || '（无）'}
1. 行业盈利格局判断：${d.profitPattern || '（无）'}

风险：
${d.risks || '（无）'}

求助/需要协调的资源：
${d.helpNeeded || '（无）'}

下一步行动计划：
${d.nextSteps || '（待制定）'}

请严格按照模板结构生成完整报告。`

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

function buildFallbackReport(data) {
  const d = data || {}
  const date = d.travelDate || new Date().toISOString().split('T')[0]
  const p = (v) => v && String(v).trim() ? v : '/'
  const lines = []

  lines.push('# 出差报告')
  lines.push(`**日报时间**：${date}`)
  lines.push('')
  lines.push('## 一、基本信息')
  lines.push(`- **出差人**：${p(d.travelers)}`)
  lines.push(`- **出差时间**：${date}`)
  lines.push(`- **出差地点**：${p(d.location)}`)
  lines.push('')
  lines.push('## 二、出差计划和目标')
  lines.push(`主要目的：${p(d.purpose)}`)
  lines.push('')
  lines.push('## 三、出差对象')
  lines.push(`- **客户单位名称**：${p(d.clients)}`)
  lines.push(`- **客户背景**：${p(d.customerBackground)}`)
  lines.push(`- **其它客户关系情况说明**：${p(d.customerRelations)}`)
  lines.push('')
  lines.push('## 四、出差日报总结')
  lines.push('')
  lines.push('### （一）计划事项达成情况')
  lines.push(p(d.planAchievement))
  lines.push('')
  lines.push('#### 一、行业核心变量')
  lines.push(p(d.industryCore || d.industryVariable))
  lines.push('**关键影响：**')
  lines.push(`- **标准切换**：${p(d.standardChange)}`)
  lines.push(`- **时间节点**：${p(d.timeline)}`)
  lines.push(`- **采购模式**：${p(d.procurementMode)}`)
  lines.push(`- **远期增量**：${p(d.longTermOpportunity)}`)
  lines.push('')
  lines.push('#### 二、锻件市场')
  lines.push(`- **标杆落地**：${p(d.benchmark)}`)
  lines.push(`- **准入门槛**：${p(d.entryBarrier)}`)
  lines.push(`- **细分品类**：${p(d.segmentCategory)}`)
  lines.push('')
  lines.push('#### 三、板材市场')
  lines.push(`- **行业标杆**：${p(d.industryBenchmark)}`)
  lines.push(`- **竞品梯队**：${p(d.competitorTiers)}`)
  lines.push(`- **我方切入路径**：${p(d.entryPath)}`)
  lines.push('')
  lines.push('#### 四、其他客户单位情况')
  lines.push(p(d.otherClients))
  lines.push('')
  lines.push(`##### 大小业主交流记录：${p(d.ownerComm)}`)
  lines.push(`##### 其他人员交流记录：${p(d.otherComm)}`)
  lines.push('')
  lines.push('### （二）其他收获')
  lines.push(p(d.otherHarvest))
  lines.push(`1、**行业盈利格局判断**：${p(d.profitPattern)}`)
  lines.push('')
  lines.push('### （三）风险')
  lines.push(p(d.risks))
  lines.push('')
  lines.push('### （四）求助')
  lines.push(p(d.helpNeeded))
  lines.push('')
  lines.push('### （五）下一步行动计划')
  lines.push(p(d.nextSteps))
  lines.push('')
  lines.push('---')
  lines.push('*本报告由系统模板自动生成*')
  return lines.join('\n')
}

module.exports = router
