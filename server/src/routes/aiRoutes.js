const express = require('express')
const router = express.Router()
const { callDeepSeek, streamDeepSeek } = require('../services/deepseekService')
const { correctForgeText } = require('../services/forgeCorrectionService')
const { protect: auth } = require('../middleware/auth')

// ============ 锻造专业文本矫正 ============

/**
 * POST /api/ai/forge-correct
 * 独立的锻造专业文本矫正接口
 * 接收 ASR 原始文本，返回矫正后的标准锻造专业文本
 */
router.post('/forge-correct', auth, async (req, res) => {
  try {
    const { text, useAI = true } = req.body

    if (!text || !text.trim()) {
      return res.status(400).json({ error: '请提供待矫正文本' })
    }

    const result = await correctForgeText(text, { useAI })
    res.json({ success: true, data: result })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ============ 语音工作台助手（已集成锻造文本矫正） ============

/**
 * POST /api/ai/voice-assistant
 * 语音指令智能解析（流程：ASR原文 → 锻造专业矫正 → DeepSeek语义解析）
 */
router.post('/voice-assistant', auth, async (req, res) => {
  const { message, context } = req.body

  if (!message) {
    return res.status(400).json({ error: '请提供语音指令内容' })
  }

  let correctionResult = null

  try {
    // Step 1: 锻造专业文本矫正（本地词典兜底，不会抛错）
    correctionResult = await correctForgeText(message, { useAI: true })
  } catch (err) {
    // 即使矫正失败，也继续用原文解析
    correctionResult = {
      originalText: message,
      correctedText: message,
      hasCorrection: false,
      localCorrections: [],
      aiCorrections: [],
      isForgeRelated: true,
      note: '矫正服务暂不可用，已使用原文',
    }
  }

  const correctedText = correctionResult.correctedText

  // Step 2: 使用矫正后的文本进行语义解析（DeepSeek 失败则返回兜底结果）
  const systemPrompt = `你是销售工作台的智能语音助手。你的职责是：
1. 解析销售人员的语音指令，提取关键信息（客户名称、项目、金额、时间、事项类型等）
2. 根据指令内容，判断应执行的操作（创建记录、更新数据、查询信息、生成报告等）
3. 以结构化 JSON 格式返回解析结果

注意：所有内容默认属于金属锻造、锻件热处理、航空锻件领域。

返回格式示例：
{
  "intent": "create_record|update_data|query_info|generate_report|schedule_meeting|customer_research",
  "entities": {
    "customer": "客户名称",
    "project": "项目名称",
    "material": "材料牌号（如GH4169）",
    "amount": 金额数字,
    "date": "日期",
    "type": "事项类型",
    "description": "详细描述"
  },
  "action": "建议执行的操作",
  "reply": "对用户的友好回复"
}

当前工作台上下文：${context || '无'}`

  try {
    const result = await callDeepSeek(systemPrompt, correctedText)

    let parsed
    try {
      parsed = JSON.parse(result)
    } catch {
      parsed = { intent: 'general', reply: result }
    }

    return res.json({
      success: true,
      data: parsed,
      correction: {
        originalText: correctionResult.originalText,
        correctedText: correctionResult.correctedText,
        hasCorrection: correctionResult.originalText !== correctionResult.correctedText,
        localCorrections: correctionResult.localCorrections || [],
        aiCorrections: correctionResult.aiCorrections || [],
        isForgeRelated: correctionResult.isForgeRelated ?? null,
        note: correctionResult.note || '',
      },
    })
  } catch (err) {
    // AI 不可用时，返回本地兜底解析结果，不抛 500
    const aiErrorMsg = err.message || 'AI 暂不可用'
    const text = correctedText.trim()

    // ===== 1. 意图判断（先看整体意图，再提取实体）=====
    const INTENT_RULES = [
      // 提醒/任务：含"提醒/记得/别忘了/要...完成/需要做"
      { pattern: /提醒|记得|别忘了|要.*(完成|做|提交|准备|写|处理|发|联系|跟进)|需要做|得做/, intent: 'set_reminder', label: '设置提醒' },
      // 日程/会议：含具体时间
      { pattern: /(周[一二三四五六日天]|星期[一二三四五六日天]|今天|明天|后天|大后天).*(点|时|:：)|(上午|下午|晚上).*(点|时)/, intent: 'schedule', label: '日程安排' },
      // 报告/纪要
      { pattern: /周报|日报|月报|出差报告|拜访纪要|会议纪要|总结|报告/, intent: 'generate_report', label: '生成报告' },
      // 查询/信息：价格/行情
      { pattern: /价格|行情|走势|多少钱|报价|多少钱一吨|市场|资讯|新闻/, intent: 'query_info', label: '行情查询' },
      // 展会/会议
      { pattern: /展会|参展|博览会|论坛/, intent: 'query_info', label: '展会信息' },
      // 客户/商机调研
      { pattern: /客户|画像|商机|跟进|抓取|供应商|厂商|原材料|客户管理/, intent: 'customer_research', label: '客户/商机调研' },
      // 修改/更新
      { pattern: /修改|更新|添加|删除|删除|改/, intent: 'update_data', label: '更新数据' },
    ]

    let intent = 'general'
    let intentLabel = '通用指令'
    for (const rule of INTENT_RULES) {
      if (rule.pattern.test(text)) {
        intent = rule.intent
        intentLabel = rule.label
        break
      }
    }

    // ===== 2. 实体提取 =====
    let customer = ''
    let material = ''
    let task = ''
    let timeStr = ''
    let dateStr = ''

    // --- 时间提取 ---
    const timeMatch = text.match(/(\d{1,2})[点时:：](\d{1,2})?/)
    if (timeMatch) {
      let hour = parseInt(timeMatch[1], 10)
      const minute = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0
      const periodMatch = text.match(/(上午|下午|晚上|中午|早上|凌晨)/)
      if (periodMatch && periodMatch[1] && (hour < 12 || periodMatch[1] === '下午' || periodMatch[1] === '晚上')) {
        if (periodMatch[1] === '下午' || periodMatch[1] === '晚上') hour += 12
      }
      timeStr = `${hour}:${minute.toString().padStart(2, '0')}`
    }

    // --- 日期提取 ---
    const dateMatch = text.match(/(周[一二三四五六日天]|星期[一二三四五六日天]|今天|明天|后天|大后天|下周[一二三四五六日天]?)/)
    if (dateMatch) dateStr = dateMatch[1]

    // --- 材料提取 ---
    const materialMatch = text.match(/(GH\d+|H\d+|Cr\d+[A-Za-z\d]+|Ti\d+|Nb\d+|Al\d+|Ni\d+|Co\d+|W\d+|Mo\d+|V\d+|45#|20CrMnTi|40Cr|35CrMo|304|316)/i)
    if (materialMatch) material = materialMatch[0].toUpperCase()

    // --- 客户名提取（只有在客户调研意图下才提取，且必须有企业后缀）---
    if (intent === 'customer_research' || /客户|公司|厂商|供应商/.test(text)) {
      const suffixMatch = text.match(/([\u4e00-\u9fa5A-Za-z0-9·•\-]{2,})(?:股份有限公司|有限责任公司|有限公司|公司|集团|股份|科技|厂|工业|制造|重工|航空|航天|材料|精密|机械|电气|动力|贸易|金属|锻造|铸造)/u)
      if (suffixMatch) customer = suffixMatch[1] + (suffixMatch[0].match(/(?:股份有限公司|有限责任公司|有限公司|公司|集团|股份|科技|厂|工业|制造|重工|航空|航天|材料|精密|机械|电气|动力|贸易|金属|锻造|铸造)/) || '')

      // 关系匹配
      if (!customer) {
        const relationMatch = text.match(/(和|与|跟|同|拜访|会见|接待|洽谈|对接|联系)[\s:：]*([\u4e00-\u9fa5A-Za-z0-9·•\-]{2,10}?)(?=(?:的|总|先生|女士|经理|负责人|$|，|。))/u)
        if (relationMatch && relationMatch[2] && relationMatch[2].trim().length >= 2) {
          customer = relationMatch[2].trim()
        }
      }

      // 兜底：抓取模式
      if (!customer) {
        const grabMatch = text.match(/抓取[\s:：]*([\u4e00-\u9fa5A-Za-z0-9·•\-]{2,20}?)(?=(?:的)?(?:原材料|供应商|厂商|厂家|公司|名单|信息|$))/u)
        if (grabMatch && grabMatch[1] && grabMatch[1].trim().length >= 2) {
          customer = grabMatch[1].trim()
        }
      }

      // 清理
      customer = customer.replace(/^(抓取|关于|查询|分析|查看|了解|搜索|找|研究|对比)/, '').trim()
      customer = customer.replace(/(的|了|在|是|有)$/, '').trim()
      if (customer.length < 2) customer = ''
    }

    // --- 任务提取 ---
    const taskMatch = text.match(/(提醒我|要我|我要|记得)[\s:：]*([\u4e00-\u9fa5A-Za-z0-9·•\-]{2,30}?)(?=(?:$|，|。|,))/u)
    if (taskMatch && taskMatch[2]) {
      task = taskMatch[2].trim()
    }
    // 直接提取动作短语
    if (!task) {
      const actionMatch = text.match(/(完成|提交|写|准备|处理|做|发|生成|汇报|准备好)[\s:：]*([\u4e00-\u9fa5A-Za-z0-9·•\-]{1,20}?)(?=(?:$|，|。|,|的)/u)
      if (actionMatch) task = actionMatch[0]
    }
    if (!task) {
      // 核心内容提取
      const cleaned = text
        .replace(/(提醒我|要我|我要|记得|别忘了|需要|得)/g, '')
        .replace(/(周[一二三四五六日天]|星期[一二三四五六日天]|今天|明天|后天|大后天)/g, '')
        .replace(/(上午|下午|晚上|中午|早上|凌晨|\d{1,2}[点时:：]\d{0,2})/g, '')
        .replace(/(之前|之前|前|的时候)/g, '')
        .replace(/[，。,！？、:：的了和与及\(\)\[\]【】]+/g, ' ')
        .trim()
      task = cleaned || text
    }

    // ===== 3. 构建回复和建议 =====
    let suggestion = ''
    let replyText = ''

    if (intent === 'set_reminder') {
      const timeDisplay = [dateStr, timeStr].filter(Boolean).join(' ') || '指定时间'
      replyText = `好的，我会在 ${timeDisplay} 前提醒您：${task}`
      suggestion = `💡 建议：已创建提醒，可在「日程日历」中查看和编辑。`
    } else if (intent === 'schedule') {
      const timeDisplay = [dateStr, timeStr].filter(Boolean).join(' ')
      replyText = `已为您安排：${timeDisplay} - ${task}`
      suggestion = `💡 建议：前往「日程日历」查看详情，可设置提前提醒。`
    } else if (intent === 'generate_report') {
      replyText = `好的，已为您准备生成：${task}`
      suggestion = `💡 建议：前往「报告生成」模块，选择对应报告类型快速生成。`
    } else if (intent === 'query_info') {
      replyText = `正在为您查询：${material || task}`
      if (material) {
        suggestion = `💡 建议：前往「市场行情雷达」查看「${material}」最新价格和行业资讯。`
      } else {
        suggestion = `💡 建议：前往「市场行情雷达」查看金属市场行情和行业资讯。`
      }
    } else if (intent === 'customer_research') {
      if (customer && material) {
        replyText = `已为您找到「${customer}」相关信息，并匹配到「${material}」材料。`
        suggestion = `💡 建议：在「客户管理」搜索「${customer}」查看跟进历史；在「市场行情雷达」查看「${material}」价格。`
      } else if (customer) {
        replyText = `已为您找到「${customer}」的相关信息。`
        suggestion = `💡 建议：前往「客户管理」搜索「${customer}」，查看跟进记录和商机。`
      } else if (material) {
        replyText = `已为您查询「${material}」的市场行情。`
        suggestion = `💡 建议：前往「市场行情雷达」查看「${material}」价格走势。`
      } else {
        replyText = `已收到您的指令：${text}`
        suggestion = `💡 建议：请在「客户管理」搜索客户，或在「市场行情雷达」查看金属行情。`
      }
    } else if (intent === 'update_data') {
      replyText = `已记录您的更新需求：${task}`
      suggestion = `💡 建议：前往对应模块进行修改操作。`
    } else {
      replyText = `已收到您的指令：${text}`
      suggestion = `💡 您可以在对应功能模块中完成操作。`
    }

    const displayEntities = []
    if (customer) displayEntities.push(`目标客户：${customer}`)
    if (material) displayEntities.push(`关注材料：${material}`)
    if (dateStr) displayEntities.push(`日期：${dateStr}`)
    if (timeStr) displayEntities.push(`时间：${timeStr}`)
    if (task && intent !== 'customer_research') displayEntities.push(`任务：${task}`)

    const fallbackReply = `${replyText}

📌 识别结果：
- 意图：${intentLabel}${displayEntities.length ? '\n' + displayEntities.map(e => '- ' + e).join('\n') : ''}
${suggestion}

⚠️ 注意：AI 深度解析暂不可用（${aiErrorMsg}），已使用本地规则识别。
如需要更精准的 AI 解析，请在 Railway Variables 配置 DEEPSEEK_API_KEY 并确保余额充足。`

    return res.json({
      success: true,
      data: {
        intent,
        entities: {
          ...(customer ? { customer } : {}),
          ...(material ? { material } : {}),
          ...(dateStr ? { date: dateStr } : {}),
          ...(timeStr ? { time: timeStr } : {}),
          description: text,
        },
        action: suggestion.replace(/^💡 建议：/, ''),
        reply: fallbackReply,
      },
      correction: {
        originalText: correctionResult.originalText,
        correctedText: correctionResult.correctedText,
        hasCorrection: correctionResult.originalText !== correctionResult.correctedText,
        localCorrections: correctionResult.localCorrections || [],
        aiCorrections: correctionResult.aiCorrections || [],
        isForgeRelated: correctionResult.isForgeRelated ?? null,
        note: correctionResult.note || `AI 暂不可用：${aiErrorMsg}，已使用本地规则解析`,
      },
      fallback: true,
      aiError: aiErrorMsg,
    })
  }
})

/**
 * POST /api/ai/voice-stream
 * 语音助手流式对话
 */
router.post('/voice-stream', auth, async (req, res) => {
  try {
    const { message, context } = req.body

    if (!message) {
      return res.status(400).json({ error: '请提供消息内容' })
    }

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    const systemPrompt = `你是销售工作台的智能语音助手，专注于帮助销售人员完成日常工作。
包括：客户跟进、项目推进、合同管理、日程安排、报告生成等。
回答要简洁专业，必要时以结构化方式呈现数据。
当前上下文：${context || '无'}`

    await streamDeepSeek(
      systemPrompt,
      message,
      (chunk) => {
        res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`)
      }
    )

    res.write('data: [DONE]\n\n')
    res.end()
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`)
    res.end()
  }
})

// ============ 客户管理分析 ============

/**
 * POST /api/ai/customer-analysis
 * 客户画像分析、跟进建议、商机预测
 */
router.post('/customer-analysis', auth, async (req, res) => {
  try {
    const { customerData, analysisType } = req.body

    if (!customerData) {
      return res.status(400).json({ error: '请提供客户数据' })
    }

    const prompts = {
      profile: `分析以下客户数据，生成客户画像报告，包括：
1. 客户特征总结（行业、规模、需求特点）
2. 决策链分析（关键决策人、影响力评估）
3. 合作潜力评分（1-10分）及理由
4. 推荐的跟进策略和节奏
5. 风险提示

客户数据：${JSON.stringify(customerData)}`,

      followup: `基于以下客户信息，生成个性化跟进建议：
1. 最佳跟进时机（结合客户行业特点和采购周期）
2. 推荐的沟通方式和话术要点
3. 应避免的沟通雷区
4. 下次跟进的具体行动方案（含时间建议）
5. 附加价值点（如何让客户感受到差异化服务）

客户信息：${JSON.stringify(customerData)}`,

      opportunity: `评估以下商机的成功概率和推进策略：
1. 商机阶段评估（线索→需求→方案→谈判→成交）
2. 赢单概率评估（1-10分）及关键影响因素
3. 竞争对手分析（可能的竞品及差异化策略）
4. 推进路线图（关键里程碑和时间节点）
5. 资源需求评估（需要哪些支持）

商机数据：${JSON.stringify(customerData)}`,
    }

    const systemPrompt = '你是一位资深的销售分析师，精通 B2B 销售方法论，擅长客户分析和商机管理。'
    const userMessage = prompts[analysisType] || prompts.profile

    const result = await callDeepSeek(systemPrompt, userMessage, { max_tokens: 3000 })
    res.json({ success: true, data: result })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ============ 报告自动生成 ============

/**
 * POST /api/ai/generate-report
 * 智能生成周报、出差报告、拜访纪要
 */
router.post('/generate-report', auth, async (req, res) => {
  try {
    const { reportType, data, period } = req.body

    if (!reportType) {
      return res.status(400).json({ error: '请提供报告类型' })
    }

    const prompts = {
      weekly: `根据以下本周工作数据，生成一份结构清晰的周报：
1. 本周工作概述（3-5句话总结）
2. 关键成果（数据支撑，如：签约金额、新增客户数等）
3. 项目进展（各项目推进情况，标注状态：正常/延迟/风险）
4. 客户跟进情况（重要客户互动记录）
5. 下周工作计划（按优先级排列）
6. 需要的支持和资源

本周数据：${JSON.stringify(data)}
报告周期：${period || '本周'}`,

      business_trip: `根据以下出差信息，生成一份出差报告：
1. 出差目的和背景
2. 行程概要（日期、地点、拜访对象）
3. 拜访纪要（每次拜访的关键内容、客户反馈、下一步计划）
4. 成果总结（达成的共识、签约意向、后续安排）
5. 市场观察（当地市场动态、竞品信息）
6. 建议和后续行动

出差数据：${JSON.stringify(data)}`,

      visit_memo: `根据以下拜访信息，生成一份拜访纪要：
1. 拜访基本信息（时间、地点、客户名称、参会人员）
2. 会议议题和讨论要点
3. 客户需求和关注点
4. 已达成的共识
5. 待跟进事项（含责任人和时间节点）
6. 下一步行动计划

拜访数据：${JSON.stringify(data)}`,

      proposal: `根据以下项目信息，生成一份项目方案摘要：
1. 项目背景和需求分析
2. 解决方案概述
3. 实施计划和时间线
4. 预期收益和投资回报
5. 风险评估和应对措施
6. 合作模式和商务条款建议

项目数据：${JSON.stringify(data)}`,
    }

    const systemPrompt = '你是一位专业的销售报告撰写专家，擅长将零散数据整理为结构清晰、重点突出的商务报告。使用商务正式语气，善用数据说话。'
    const userMessage = prompts[reportType] || prompts.weekly

    const result = await callDeepSeek(systemPrompt, userMessage, { max_tokens: 4000, temperature: 0.5 })
    res.json({ success: true, data: result })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ============ 行业资讯智能摘要 ============

/**
 * POST /api/ai/market-insight
 * 行业讯息智能摘要和分析
 */
router.post('/market-insight', auth, async (req, res) => {
  try {
    const { newsItems, industry } = req.body

    const systemPrompt = '你是一位金属锻造行业的市场分析师，擅长从行业资讯中提取关键信息并进行趋势分析。'
    const userMessage = `分析以下${industry || '金属锻造'}行业资讯，生成：
1. 重要资讯摘要（每条1-2句话）
2. 市场趋势分析（价格走势、供需变化）
3. 对销售工作的影响和建议
4. 重点关注事项

资讯内容：${JSON.stringify(newsItems || [])}`

    const result = await callDeepSeek(systemPrompt, userMessage, { max_tokens: 2000 })
    res.json({ success: true, data: result })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
