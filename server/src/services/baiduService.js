/**
 * 百度千帆 AI 服务模块（V1 RPC 方式）
 * 使用文心大模型（ERNIE），支持普通调用、流式调用和结构化输出
 *
 * 当前模型：ernie-4.0-turbo（免费可用，endpoint=ernie-4.0-turbo-8k）
 * 降级方案：智谱AI GLM-4-Flash（永久免费，OpenAI兼容格式）
 *
 * 环境变量（可选，覆盖内置默认值）：
 *   BAIDU_API_KEY - 百度千帆 API Key（格式：bce-v3/ALTAK-xxx/xxx）
 *   BAIDU_MODEL   - 模型端点路径（默认 ernie-4.0-turbo-8k）
 *   ZHIPU_API_KEY - 智谱AI API Key（永久免费，https://open.bigmodel.cn/usercenter/proj-mgmt/apikeys）
 */

const QIANFAN_BASE_URL = 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat'
const ZHIPU_BASE_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions'

// 加载密钥配置（优先环境变量，回退到配置文件）
const { BAIDU_API_KEY: _defaultKey, BAIDU_MODEL: _defaultModel, ZHIPU_API_KEY: _defaultZhipuKey } = require('../config/aiKeys')

const BAIDU_MODEL = process.env.BAIDU_MODEL || _defaultModel || 'ernie-4.0-turbo-8k'

// 智谱 API Key（环境变量优先，回退配置文件）
const getZhipuKey = () => process.env.ZHIPU_API_KEY || _defaultZhipuKey || ''
const isZhipuConfigured = () => !!getZhipuKey()

/**
 * 检查 API Key 是否配置（千帆大模型 或 智谱AI）
 */
const isConfigured = () => {
  return !!(process.env.BAIDU_API_KEY || _defaultKey) || isZhipuConfigured()
}

const { BAIDU_ASR_API_KEY, BAIDU_ASR_SECRET_KEY } = require('../config/aiKeys')

const getAsrKeys = () => ({
  apiKey: process.env.BAIDU_ASR_API_KEY || BAIDU_ASR_API_KEY || '',
  secretKey: process.env.BAIDU_ASR_SECRET_KEY || BAIDU_ASR_SECRET_KEY || '',
})

/**
 * 检查 ASR 语音识别密钥是否配置
 */
const isAsrConfigured = () => {
  const { apiKey, secretKey } = getAsrKeys()
  return !!(apiKey && secretKey)
}

let _asrTokenCache = null
/**
 * 获取 ASR 接口 access_token（百度OAuth 2.0 grant_type=client_credentials），25天缓存
 */
const getAsrAccessToken = async () => {
  const { apiKey, secretKey } = getAsrKeys()
  if (!apiKey || !secretKey) throw new Error('BAIDU_ASR_API_KEY / BAIDU_ASR_SECRET_KEY 未配置')
  if (_asrTokenCache && _asrTokenCache.expireAt > Date.now() + 60000) return _asrTokenCache.token
  const url = `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${encodeURIComponent(apiKey)}&client_secret=${encodeURIComponent(secretKey)}`
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' } })
  if (!res.ok) throw new Error(`ASR token 获取失败 HTTP ${res.status}`)
  const data = await res.json()
  if (!data.access_token) throw new Error('ASR token 获取失败: ' + JSON.stringify(data).substring(0, 200))
  _asrTokenCache = { token: data.access_token, expireAt: Date.now() + (Number(data.expires_in) || 2592000) * 1000 }
  return _asrTokenCache.token
}

/**
 * 语音识别（ASR）—— 小程序录音格式通常是 mp3 16kHz 单声道
 * @param {string} audioBase64 - 音频文件 base64（不含 data:audio/xxx;base64, 前缀）
 * @param {Object} opts - { format:'mp3'|'wav'|'pcm'|'m4a', sampleRate: 16000|8000, channels: 1 }
 * @returns {Promise<string>} 识别出的文本
 */
const speechToText = async (audioBase64, opts = {}) => {
  if (!audioBase64) throw new Error('音频内容为空')
  let format = (opts.format || 'mp3').toLowerCase()
  const sampleRate = Number(opts.sampleRate) || 16000
  const channels = Number(opts.channels) || 1
  // 百度ASR对音频有限制（60秒以内/5MB以内），这里做个简单的 base64 长度校验
  if (audioBase64.length > 5_000_000) throw new Error('音频过大，请控制在 60 秒以内')

  // 百度ASR支持的格式：pcm, wav, amr, m4a, mp3
  // webm 不被支持，需要前端先转换成 wav/m4a
  const supportedFormats = ['pcm', 'wav', 'amr', 'm4a', 'mp3']
  if (!supportedFormats.includes(format)) {
    throw new Error(`ASR不支持的音频格式: ${format}。请使用 m4a/wav/mp3 格式`)
  }

  const accessToken = await getAsrAccessToken()
  const body = {
    format,
    rate: sampleRate,
    channel: channels,
    cuid: 'sales-workbench-' + Math.random().toString(36).slice(2, 10),
    token: accessToken,
    speech: audioBase64,
    len: Buffer.byteLength(audioBase64, 'base64'),
    dev_pid: 1537, // 1537 = 普通话（支持简单英文）16kHz 单声道
  }
  const response = await fetch('https://vop.baidu.com/server_api', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!response.ok) throw new Error(`ASR HTTP ${response.status}`)
  const data = await response.json()
  if (data.err_no !== 0) {
    throw new Error(`ASR 识别失败(${data.err_no})：${data.err_msg || '未知错误'}`)
  }
  return data.result && Array.isArray(data.result) ? (data.result[0] || '') : (data.result || '')
}

/**
 * 获取 API Key
 */
const getApiKey = () => {
  const key = process.env.BAIDU_API_KEY || _defaultKey
  if (!key) {
    throw new Error('BAIDU_API_KEY 未配置，AI 功能不可用')
  }
  return key
}

/**
 * 百度千帆普通调用（非流式）
 * @param {Array<{role: string, content: string}>} messages - 消息数组
 * @param {Object} options - 调用选项
 * @returns {Promise<string>} AI 返回的文本
 */
const chatBaidu = async (messages, options = {}) => {
  const apiKey = getApiKey()
  const endpoint = options.model || BAIDU_MODEL
  const maxTokens = Math.min(options.maxTokens ?? 2048, 8192)

  const body = {
    messages: messages.map(m => ({
      role: m.role,
      content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
    })),
    temperature: options.temperature ?? 0.7,
    max_output_tokens: maxTokens,
    stream: false,
  }

  const response = await fetch(`${QIANFAN_BASE_URL}/${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`百度千帆 API 错误 (${response.status}): ${errText}`)
  }

  const data = await response.json()

  if (data.error_code) {
    throw new Error(`百度千帆 API 错误 (${data.error_code}): ${data.error_msg}`)
  }

  return data.result || ''
}

/**
 * 智谱AI GLM 调用（永久免费降级方案）
 * OpenAI 兼容格式，使用 GLM-4-Flash 模型
 */
const chatZhipu = async (messages, options = {}) => {
  const apiKey = getZhipuKey()
  if (!apiKey) throw new Error('ZHIPU_API_KEY 未配置')

  const maxTokens = Math.min(options.maxTokens ?? 2048, 8192)

  const body = {
    model: options.model || 'glm-4-flash',
    messages: messages.map(m => ({
      role: m.role,
      content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
    })),
    temperature: options.temperature ?? 0.7,
    max_tokens: maxTokens,
    stream: false,
  }

  const response = await fetch(ZHIPU_BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`智谱 API 错误 (${response.status}): ${errText}`)
  }

  const data = await response.json()

  if (data.error) {
    throw new Error(`智谱 API 错误: ${data.error.message || JSON.stringify(data.error)}`)
  }

  return data.choices?.[0]?.message?.content || ''
}

/**
 * 统一 chat 调用（带自动降级）
 * 优先百度千帆，失败时自动降级到智谱AI GLM-4-Flash（永久免费）
 */
const chatWithFallback = async (messages, options = {}) => {
  const baiduKey = process.env.BAIDU_API_KEY || _defaultKey

  // 1. 先尝试百度千帆
  if (baiduKey) {
    try {
      return await chatBaidu(messages, options)
    } catch (err) {
      const msg = err.message || ''
      console.warn('百度千帆调用失败，尝试降级到智谱AI:', msg.substring(0, 100))
      // 配额耗尽/限流/网络错误 → 降级
      if (isZhipuConfigured()) {
        try {
          return await chatZhipu(messages, options)
        } catch (zhipuErr) {
          console.error('智谱AI也失败:', zhipuErr.message)
          throw zhipuErr
        }
      }
      throw err
    }
  }

  // 2. 百度未配置，直接用智谱
  if (isZhipuConfigured()) {
    return await chatZhipu(messages, options)
  }

  throw new Error('BAIDU_API_KEY 和 ZHIPU_API_KEY 均未配置，AI 功能不可用')
}

// 对外导出的 chat 使用带降级的版本
const chat = chatWithFallback

/**
 * 流式调用（SSE）
 * @param {Array<{role: string, content: string}>} messages - 消息数组
 * @param {Object} options - 调用选项
 * @param {function(string): void} onChunk - 每收到一段文本时的回调
 * @returns {Promise<string>} 完整的 AI 返回文本
 */
const chatStream = async (messages, options = {}, onChunk) => {
  const apiKey = getApiKey()
  const endpoint = options.model || BAIDU_MODEL
  const maxTokens = Math.min(options.maxTokens ?? 2048, 2048)

  const body = {
    messages: messages.map(m => ({
      role: m.role,
      content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
    })),
    temperature: options.temperature ?? 0.7,
    max_output_tokens: maxTokens,
    stream: true,
  }

  const response = await fetch(`${QIANFAN_BASE_URL}/${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`百度千帆 API 错误 (${response.status}): ${errText}`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let fullText = ''
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) continue

      const jsonStr = trimmed.slice(5).trim()
      if (!jsonStr || jsonStr === '[DONE]') continue

      try {
        const parsed = JSON.parse(jsonStr)
        const content = parsed.result || ''
        if (content) {
          fullText += content
          if (onChunk) onChunk(content)
        }
      } catch {
        // 跳过无法解析的行
      }
    }
  }

  return fullText
}

/**
 * 结构化输出调用（强制返回 JSON）
 * @param {Array<{role: string, content: string}>} messages - 消息数组
 * @param {Object} options - 调用选项
 * @returns {Promise<Object>} 解析后的 JSON 对象
 */
const chatJSON = async (messages, options = {}) => {
  // 智谱AI 要求 messages 中必须有 user 角色
  // 如果调用方只传了 system 消息（常见于纯指令型prompt），自动补一条 user 消息
  const hasUser = messages.some(m => m.role === 'user')
  const fixedMessages = hasUser ? messages : [
    ...messages,
    { role: 'user', content: '请按上述要求生成内容并返回 JSON 格式结果。' },
  ]

  const enhancedMessages = fixedMessages.map(m => {
    if (m.role === 'system') {
      return {
        ...m,
        content: m.content + '\n\n重要：你必须只返回有效的 JSON 格式数据，不要包含任何其他文字说明，不要使用 markdown 代码块标记。',
      }
    }
    return m
  })

  const text = await chat(enhancedMessages, {
    ...options,
    temperature: options.temperature ?? 0.1,
  })

  try {
    return JSON.parse(text)
  } catch {
    let cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
    // 尝试多种修复策略
    const tryParse = (str) => {
      try { return JSON.parse(str) } catch { return null }
    }

    // 1. 直接解析
    let result = tryParse(cleaned)
    if (result) return result

    // 2. 修复数组/对象末尾多余逗号: [1, 2, 3,] 或 {"a": 1,}
    cleaned = cleaned.replace(/,\s*([\]}])/g, '$1')
    result = tryParse(cleaned)
    if (result) return result

    // 3. 从文本中提取 JSON 对象
    const match = cleaned.match(/\{[\s\S]*\}/)
    if (match) {
      let extracted = match[0]
      // 再尝试修复多余逗号
      extracted = extracted.replace(/,\s*([\]}])/g, '$1')
      result = tryParse(extracted)
      if (result) return result

      // 4. 尝试截断到最后一个完整的 }，处理可能的截断问题
      const lastBrace = extracted.lastIndexOf('}')
      if (lastBrace > 0) {
        const truncated = extracted.substring(0, lastBrace + 1)
        result = tryParse(truncated) || tryParse(truncated.replace(/,\s*([\]}])/g, '$1'))
        if (result) return result
      }
    }

    throw new Error('AI 返回内容无法解析为 JSON: ' + text.substring(0, 200))
  }
}

module.exports = {
  isConfigured,
  isAsrConfigured,
  isZhipuConfigured,
  chat,
  chatBaidu,
  chatZhipu,
  chatStream,
  chatJSON,
  speechToText,
  BAIDU_MODEL,
}
