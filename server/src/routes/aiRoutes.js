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
  try {
    const { message, context } = req.body

    if (!message) {
      return res.status(400).json({ error: '请提供语音指令内容' })
    }

    // Step 1: 锻造专业文本矫正
    const correctionResult = await correctForgeText(message, { useAI: true })
    const correctedText = correctionResult.correctedText

    // Step 2: 使用矫正后的文本进行语义解析
    const systemPrompt = `你是销售工作台的智能语音助手。你的职责是：
1. 解析销售人员的语音指令，提取关键信息（客户名称、项目、金额、时间、事项类型等）
2. 根据指令内容，判断应执行的操作（创建记录、更新数据、查询信息、生成报告等）
3. 以结构化 JSON 格式返回解析结果

注意：所有内容默认属于金属锻造、锻件热处理、航空锻件领域。

返回格式示例：
{
  "intent": "create_record|update_data|query_info|generate_report|schedule_meeting",
  "entities": {
    "customer": "客户名称",
    "project": "项目名称",
    "amount": 金额数字,
    "date": "日期",
    "type": "事项类型",
    "description": "详细描述"
  },
  "action": "建议执行的操作",
  "reply": "对用户的友好回复"
}

当前工作台上下文：${context || '无'}`

    const result = await callDeepSeek(systemPrompt, correctedText)

    let parsed
    try {
      parsed = JSON.parse(result)
    } catch {
      parsed = { intent: 'general', reply: result }
    }

    // 返回矫正前后的完整信息
    res.json({
      success: true,
      data: parsed,
      // 锻造专业矫正信息
      correction: {
        originalText: correctionResult.originalText,
        correctedText: correctionResult.correctedText,
        hasCorrection: correctionResult.originalText !== correctionResult.correctedText,
        localCorrections: correctionResult.localCorrections,
        aiCorrections: correctionResult.aiCorrections,
        isForgeRelated: correctionResult.isForgeRelated,
        note: correctionResult.note,
      },
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
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
