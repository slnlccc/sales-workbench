/**
 * 锻造工艺专业文本矫正服务
 *
 * 接收语音识别(ASR)原始文本，按以下规则矫正：
 * 1. 语境强制锁定为金属锻造/锻件热处理/航空锻件/压力加工领域
 * 2. 高频错别字正则替换（快速本地修正）
 * 3. 合金牌号智能修正
 * 4. DeepSeek AI 深度矫正（处理语境相关的复杂修正）
 */

const { callDeepSeek } = require('./deepseekService')

// ============================================================
// 1. 高频错别字对照表（错别字 → 标准锻造术语）
// 顺序：先长后短，避免短词先替换破坏长词
// ============================================================
const CORRECTION_MAP = [
  // 多字术语优先
  ['热处里', '热处理'],
  ['变行量', '变形量'],

  // 双字术语（按出现频率排序）
  ['段造', '锻造'],
  ['断件', '锻件'],
  ['锻胚', '锻坯'],
  ['筒结', '筒节'],   // 筒节是标准压力容器术语
  ['封投', '封头'],   // 封头是标准压力容器术语
  ['翠火', '淬火'],
  ['回洗', '回火'],
  ['固融', '固溶'],
  ['墩粗', '镦粗'],
  ['拔常', '拔长'],
  ['扎制', '轧制'],
  ['退伙', '退火'],
  ['金象', '金相'],
  ['映力', '应力'],

  // 特殊：实效 → 时效（仅在锻造语境下，由 AI 层处理歧义）
  // 特殊：毛坯/毛胚 双向兼容（两者均可，不强制替换）
]

// 合金牌号修正表（常见的 ASR 误识别）
const ALLOY_CORRECTIONS = [
  // GH 系列（高温合金）
  ['g h 四一六九', 'GH4169'],
  ['g h 4169', 'GH4169'],
  ['gh四一六九', 'GH4169'],
  ['g h 四', 'GH4'],
  ['g h', 'GH'],

  // 17-4PH（沉淀硬化不锈钢）
  ['十七四 p h', '17-4PH'],
  ['174ph', '17-4PH'],
  ['17 4 p h', '17-4PH'],
  ['十七四', '17-4PH'],

  // In783（低膨胀高温合金）
  ['in 783', 'In783'],
  ['in七八三', 'In783'],
  ['i n 783', 'In783'],
  ['英 783', 'In783'],

  // 其他常见合金
  ['三零四', '304'],
  ['三一六', '316'],
  ['tc 4', 'TC4'],
  ['t c 4', 'TC4'],
  ['tc四', 'TC4'],
  ['钛合金 t c 4', '钛合金TC4'],

  // 工模具钢
  ['五铬镍钼', '5CrNiMo'],
  ['三铬二钨八钒', '3Cr2W8V'],
  ['h 13', 'H13'],
  ['h十三', 'H13'],
  ['cr 12', 'Cr12'],
  ['cr十二', 'Cr12'],
  ['四十五号钢', '45号钢'],
  ['四十五钢', '45钢'],
]

// ============================================================
// 2. 本地快速矫正（正则替换）
// ============================================================

/**
 * 本地快速矫正：正则替换高频错别字和合金牌号
 * @param {string} text - 原始 ASR 文本
 * @returns {{ corrected: string, corrections: Array<{from:string, to:string}> }}
 */
function localCorrect(text) {
  let corrected = text
  const corrections = []

  // 先修正合金牌号（因为可能包含空格等噪声）
  for (const [wrong, right] of ALLOY_CORRECTIONS) {
    const regex = new RegExp(escapeRegExp(wrong), 'gi')
    if (regex.test(corrected)) {
      corrected = corrected.replace(regex, right)
      corrections.push({ from: wrong, to: right, type: '合金牌号' })
    }
  }

  // 再修正常规错别字
  for (const [wrong, right] of CORRECTION_MAP) {
    const regex = new RegExp(escapeRegExp(wrong), 'g')
    if (regex.test(corrected)) {
      corrected = corrected.replace(regex, right)
      corrections.push({ from: wrong, to: right, type: '锻造术语' })
    }
  }

  // 清理多余空格（ASR 常在术语间插入空格）
  corrected = corrected.replace(/\s{2,}/g, ' ').trim()

  return { corrected, corrections }
}

/**
 * 转义正则特殊字符
 */
function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// ============================================================
// 3. DeepSeek AI 深度矫正
// ============================================================

const FORGE_CORRECTION_PROMPT = `你是锻造工艺专业文本矫正与语义解析专家。接收语音识别（ASR）输出的原始文本，严格遵守以下规则：

1. 语境强制锁定：默认所有内容均属于【金属锻造、锻件热处理、航空锻件、压力加工】领域，优先按照锻造专业术语修正同音、近音错误；

2. 高频错别字自动校正对照表：
   - 段造 → 锻造；断件 → 锻件；毛坯/毛胚（语音混淆双向兼容）；
   - 翠火 → 淬火；回洗 → 回火；实效 → 时效（热处理语境）；固融 → 固溶；
   - 热处里 → 热处理；锻胚 → 锻坯；筒结 → 筒节；封投 → 封头；
   - 变行量 → 变形量；墩粗 → 镦粗；拔常 → 拔长；
   - 扎制 → 轧制；退伙 → 退火；金象 → 金相；映力 → 应力；
   - GH4169、17-4PH、In783、TC4 等合金牌号识别出错时自动修正；

3. 处理优先级：
   ① 先修正语音同音错误，还原标准锻造术语；
   ② 保留说话人原本语义，禁止擅自篡改原意、不要凭空增加不存在的内容；
   ③ 口语短句保留简洁，不要过度扩写；
   ④ 如果出现歧义句子，优先选用锻造行业释义，不选用日常通用释义；

4. 输出格式（严格 JSON）：
{
  "correctedText": "校正后的标准锻造专业文本",
  "corrections": [
    { "from": "原文中的错别字", "to": "修正后的术语", "reason": "简短说明" }
  ],
  "isForgeRelated": true或false,
  "note": "如果与锻造无关，此处标注「未检测到锻造相关内容」"
}

约束：不要闲聊，只执行文本校正；如果文本完全和锻造无关，correctedText 原样输出，isForgeRelated 设为 false。`

/**
 * AI 深度矫正：调用 DeepSeek 处理语境相关的复杂修正
 * @param {string} text - 本地矫正后的文本
 * @returns {Promise<object>} { correctedText, corrections, isForgeRelated, note }
 */
async function aiCorrect(text) {
  if (!process.env.DEEPSEEK_API_KEY) {
    // AI 不可用时，返回本地矫正结果
    return {
      correctedText: text,
      corrections: [],
      isForgeRelated: null,
      note: 'AI 服务未配置，仅使用本地正则矫正',
    }
  }

  try {
    const result = await callDeepSeek(FORGE_CORRECTION_PROMPT, text, {
      temperature: 0.1,  // 低温度保证稳定性
      max_tokens: 1500,
    })

    // 尝试解析 JSON
    try {
      const parsed = JSON.parse(result)
      return {
        correctedText: parsed.correctedText || text,
        corrections: parsed.corrections || [],
        isForgeRelated: parsed.isForgeRelated ?? true,
        note: parsed.note || '',
      }
    } catch {
      // AI 返回非 JSON，直接取文本
      return {
        correctedText: result.trim() || text,
        corrections: [],
        isForgeRelated: true,
        note: 'AI 返回非结构化文本',
      }
    }
  } catch (err) {
    console.error('[锻造矫正] AI 矫正失败，降级为本地结果:', err.message)
    return {
      correctedText: text,
      corrections: [],
      isForgeRelated: null,
      note: `AI 矫正失败：${err.message}，已使用本地矫正结果`,
    }
  }
}

// ============================================================
// 4. 完整矫正流程：本地快速矫正 → AI 深度矫正
// ============================================================

/**
 * 矫正语音识别文本（完整流程）
 * @param {string} rawText - ASR 原始文本
 * @param {object} options - { useAI: boolean }
 * @returns {Promise<object>} { originalText, correctedText, localCorrections, aiCorrections, isForgeRelated, note }
 */
async function correctForgeText(rawText, options = {}) {
  const { useAI = true } = options

  if (!rawText || !rawText.trim()) {
    return {
      originalText: '',
      correctedText: '',
      localCorrections: [],
      aiCorrections: [],
      isForgeRelated: false,
      note: '空文本',
    }
  }

  // Step 1: 本地快速矫正
  const { corrected: locallyCorrected, corrections: localCorrections } = localCorrect(rawText)

  // Step 2: AI 深度矫正（可选）
  if (useAI) {
    const aiResult = await aiCorrect(locallyCorrected)

    return {
      originalText: rawText,
      correctedText: aiResult.correctedText,
      localCorrections,
      aiCorrections: aiResult.corrections,
      isForgeRelated: aiResult.isForgeRelated,
      note: aiResult.note,
    }
  }

  // 仅本地矫正
  return {
    originalText: rawText,
    correctedText: locallyCorrected,
    localCorrections,
    aiCorrections: [],
    isForgeRelated: null,
    note: '仅本地矫正',
  }
}

module.exports = {
  correctForgeText,
  localCorrect,
  aiCorrect,
  CORRECTION_MAP,
  ALLOY_CORRECTIONS,
}
