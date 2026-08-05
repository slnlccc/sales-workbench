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

    // 简易本地规则解析（从原文提取客户/项目/材料关键词）
    let customer = ''
    let material = ''
    let projectType = ''

    // ===== 客户名提取：按优先级尝试多种规则 =====
    // 动作动词黑名单（在客户名里必须剥掉）
    const ACTION_VERBS = /^(抓取|关于|查询|查找|搜索|分析|查看|了解|找|研究|对比|比较|梳理|整理|记录|填写|生成|写|做|发|提交|发送|准备|对接|沟通|跟进|联系|拜访|会见|接待|洽谈|洽谈见|见|和|与|跟|同)/

    // 1) 匹配「XXX公司/集团/科技/股份/厂/工业/制造/重工/航空/航天/材料/精密/机械/电气/动力/贸易/金属/锻造/铸造」等企业后缀
    const suffixMatch = correctedText.match(/([\u4e00-\u9fa5A-Za-z0-9·•\-]{2,}(?:股份有限公司|有限责任公司|有限公司|公司|集团|股份|科技|厂|工业|制造|重工|航空|航天|材料|精密|机械|电气|动力|贸易|金属|锻造|铸造))/u)
    if (suffixMatch) customer = suffixMatch[1]

    // 2) 匹配「动作动词 + XX + 名词（的信息/客户/原材料/公司/厂商/供应商...）」
    if (!customer) {
      const actionMatch = correctedText.match(/(关于|查询|分析|查看|了解|搜索|找|查询查找|抓取)[\s:：]*([\u4e00-\u9fa5A-Za-z0-9·•\-]{2,30}?)(?=(?:的|之)?(?:信息|商机|画像|跟进|数据|情况|公司|厂|厂商|供应商|客商|客户|厂家|名单|原材料|报价|价格|行情|走势|动态|新闻|$|，|。|,))/u)
      if (actionMatch && actionMatch[2] && actionMatch[2].trim().length >= 2) {
        customer = actionMatch[2].trim()
      }
    }

    // 3) 匹配「和/与/拜访/会见/接待/洽谈 + XX + 的/总/先生/女士...」
    if (!customer) {
      const relationMatch = correctedText.match(/(和|与|拜访|会见|接待|洽谈|对接|跟|见)[\s:：]*([\u4e00-\u9fa5A-Za-z0-9·•\-]{2,20}?)(?=(?:的|$|，|。|,|总|先生|女士|经理|老板|总监|工程师|负责人))/u)
      if (relationMatch && relationMatch[2] && relationMatch[2].trim().length >= 2) {
        customer = relationMatch[2].trim()
      }
    }

    // 4) 「抓取XX原材料/供应商/厂商」等特殊模式
    if (!customer) {
      const grabMatch = correctedText.match(/抓取[\s:：]*([\u4e00-\u9fa5A-Za-z0-9·•\-]{2,30}?)(?=(?:的)?(?:原材料|供应商|厂商|厂家|公司|名单|信息|$))/u)
      if (grabMatch && grabMatch[1] && grabMatch[1].trim().length >= 2) {
        customer = grabMatch[1].trim()
      }
    }

    // 5) 兜底：去除纯时间/日期/报告类噪声后，取 3-12 字最长的中文长词
    if (!customer) {
      const cleaned = correctedText
        .replace(/(今天|明天|后天|昨天|上午|下午|晚上|点|分|周[一二三四五六日天]|月|日|号|周报|日报|月报|报告|纪要|出差|拜访|方案|计划|总结|一份|上周|本周|下周|上个月|下个月|抓取|关于|查询|分析|查看|了解|搜索|找)/g, ' ')
      const words = cleaned.split(/[\s，。,。!！？?、:：的了和与及/\(\)\[\]【】]+/).filter(w => w.length >= 3 && /[\u4e00-\u9fa5]/.test(w))
      if (words.length) {
        const preferred = words.filter(w => w.length <= 12)
        const pool = preferred.length ? preferred : words
        customer = pool.sort((a, b) => b.length - a.length)[0]
      }
    }

    customer = (customer || '').trim()
    // 剥掉前缀动作动词
    customer = customer.replace(ACTION_VERBS, '').trim()
    // 剥掉结尾多余助词
    customer = customer.replace(/(的|了|在|是|有|和|与)$/, '').trim()
    // 如果清洗后 <2 字符，清空让前端跳过
    if (customer.length < 2) customer = ''

    // 匹配材料牌号：如 GH4169、45#、20CrMnTi 等
    const materialMatch = correctedText.match(/(GH|H|T|Cr|Ti|Mo|V|Nb|Al|Fe|Ni|Co|W|A)\d+[A-Za-z\d]*/i)
      || correctedText.match(/(\d+Cr[A-Za-z\d]+)/i)
      || correctedText.match(/(\d+号钢|\d+#钢)/i)
    if (materialMatch) material = materialMatch[0].toUpperCase()

    // 判断意图
    let intent = 'customer_research'
    if (/展会|参展|博览会|会议/.test(correctedText)) intent = 'query_info'
    else if (/周报|日报|出差|拜访|纪要|方案|报告/.test(correctedText)) intent = 'generate_report'
    else if (/时间|几点|周|月|号|明天|今天|后天|上午|下午/.test(correctedText)) intent = 'schedule_meeting'
    else if (/价格|行情|走势|多少钱|报价/.test(correctedText)) intent = 'query_info'
    else if (/抓取|分析|客户|画像|跟进|商机|商情|供应商|原材料/.test(correctedText)) intent = 'customer_research'
    else if (/修改|更新|添加|删除|改/.test(correctedText)) intent = 'update_data'

    // 关键词清洗，避免「无」「相关」等无意义搜索词出现在建议里
    const customerDisplay = customer && !/^(无|相关|的|了|抓取|关于|查询|分析|查看|一份|今天|明天|上周|本周|)$/.test(customer) ? customer : ''
    const materialDisplay = material || ''

    let suggestion = ''
    if (customerDisplay && materialDisplay) {
      suggestion = `💡 建议：在「客户管理」搜索「${customerDisplay}」查看客商跟进历史；在「市场行情雷达」查看「${materialDisplay}」最新价格。`
    } else if (customerDisplay) {
      suggestion = `💡 建议：前往「客户管理」搜索「${customerDisplay}」，查看跟进记录和商机。`
    } else if (materialDisplay) {
      suggestion = `💡 建议：前往「市场行情雷达」查看「${materialDisplay}」价格走势和行业资讯。`
    } else {
      suggestion = `💡 建议：请在「客户管理」搜索客户名称，或在「市场行情雷达」查看金属市场行情。`
    }

    const intentLabel = {
      create_record: '创建工作记录',
      update_data: '更新数据',
      query_info: '查询信息',
      generate_report: '生成报告',
      schedule_meeting: '日程/会议',
      customer_research: '客户/商机调研',
    }[intent] || intent

    const fallbackReply = `我收到您的请求：${correctedText}

📌 识别结果：
- 意图：${intentLabel}${customerDisplay ? '\n- 目标客户：' + customerDisplay : ''}${materialDisplay ? '\n- 关注材料：' + materialDisplay : ''}
${suggestion}

⚠️ 注意：AI 深度解析暂不可用（${aiErrorMsg}），已使用本地规则识别。
如已在 Railway Variables 配置了 DEEPSEEK_API_KEY 仍看到此消息：请确认 Key 有效并有余额；或前往 deepseek.com 充值。`

    return res.json({
      success: true,
      data: {
        intent,
        entities: {
          customer: customer || undefined,
          material: material || undefined,
          description: correctedText,
        },
        action: customer ? `在客户管理中搜索 ${customer}，查看商机和跟进记录` : '请在对应模块操作',
        reply: fallbackReply,
      },
      correction: {
        originalText: correctionResult.originalText,
        correctedText: correctionResult.correctedText,
        hasCorrection: correctionResult.originalText !== correctionResult.correctedText,
        localCorrections: correctionResult.localCorrections || [],
        aiCorrections: correctionResult.aiCorrections || [],
        isForgeRelated: correctionResult.isForgeRelated ?? true,
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
