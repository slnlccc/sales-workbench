/**
 * 百度千帆 AI 服务模块
 * 使用文心大模型（ERNIE），支持普通调用、流式调用和结构化输出
 * API 文档：https://cloud.baidu.com/doc/WENXINWORKSHOP/index.html
 *
 * 环境变量：
 *   BAIDU_API_KEY    - 百度千帆 API Key
 *   BAIDU_SECRET_KEY - 百度千帆 Secret Key
 *   BAIDU_MODEL      - 模型名称（默认 ernie-speed-128k，免费）
 */

// 模型名称到端点路径的映射
const MODEL_ENDPOINT_MAP = {
  'ernie-4.0-8k': 'completions_pro',
  'ernie-4.0-turbo-8k': 'ernie-4.0-turbo-8k',
  'ernie-speed-128k': 'ernie-speed-128k',
  'ernie-speed-8k': 'ernie-speed-8k',
  'ernie-bot-8k': 'ernie_bot_8k',
  'ernie-bot-turbo': 'eb-instant',
  'deepseek-v3': 'deepseek-v3',
  'deepseek-r1': 'deepseek-r1',
}

const BAIDU_API_KEY = process.env.BAIDU_API_KEY
const BAIDU_SECRET_KEY = process.env.BAIDU_SECRET_KEY
const BAIDU_MODEL = process.env.BAIDU_MODEL || 'ernie-speed-128k'

// access token 缓存
let cachedToken = null
let tokenExpiry = 0

/**
 * 检查 API Key 是否配置
 */
const isConfigured = () => {
  return !!(process.env.BAIDU_API_KEY && process.env.BAIDU_SECRET_KEY)
}

/**
 * 获取 access token（带缓存，有效期约 30 天）
 */
const getAccessToken = async () => {
  // 缓存未过期则直接返回
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken
  }

  const apiKey = process.env.BAIDU_API_KEY
  const secretKey = process.env.BAIDU_SECRET_KEY
  if (!apiKey || !secretKey) {
    throw new Error('BAIDU_API_KEY 或 BAIDU_SECRET_KEY 未配置')
  }

  const url = `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${apiKey}&client_secret=${secretKey}`

  const response = await fetch(url, { method: 'POST' })
  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`获取 access_token 失败 (${response.status}): ${errText}`)
  }

  const data = await response.json()
  if (!data.access_token) {
    throw new Error(`获取 access_token 失败: ${JSON.stringify(data)}`)
  }

  cachedToken = data.access_token
  // 提前 5 分钟过期，避免边界问题
  tokenExpiry = Date.now() + (data.expires_in - 300) * 1000

  return cachedToken
}

/**
 * 获取模型端点路径
 */
const getEndpoint = (model) => {
  return MODEL_ENDPOINT_MAP[model] || model
}

/**
 * 普通调用（非流式）
 * @param {Array<{role: string, content: string}>} messages - 消息数组
 * @param {Object} options - 调用选项
 * @returns {Promise<string>} AI 返回的文本
 */
const chat = async (messages, options = {}) => {
  const token = await getAccessToken()
  const model = options.model || BAIDU_MODEL
  const endpoint = getEndpoint(model)
  const url = `https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/${endpoint}?access_token=${token}`

  const body = {
    messages: messages.map(m => ({
      role: m.role,
      content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
    })),
    temperature: options.temperature ?? 0.7,
    max_output_tokens: options.maxTokens ?? 2048,
    stream: false,
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
 * 流式调用（SSE）
 * @param {Array<{role: string, content: string}>} messages - 消息数组
 * @param {Object} options - 调用选项
 * @param {function(string): void} onChunk - 每收到一段文本时的回调
 * @returns {Promise<string>} 完整的 AI 返回文本
 */
const chatStream = async (messages, options = {}, onChunk) => {
  const token = await getAccessToken()
  const model = options.model || BAIDU_MODEL
  const endpoint = getEndpoint(model)
  const url = `https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/${endpoint}?access_token=${token}`

  const body = {
    messages: messages.map(m => ({
      role: m.role,
      content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
    })),
    temperature: options.temperature ?? 0.7,
    max_output_tokens: options.maxTokens ?? 2048,
    stream: true,
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
        const content = parsed.result || parsed.choices?.[0]?.delta?.content || ''
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
 * 在 system prompt 中强制要求 JSON 格式输出
 * @param {Array<{role: string, content: string}>} messages - 消息数组
 * @param {Object} options - 调用选项
 * @returns {Promise<Object>} 解析后的 JSON 对象
 */
const chatJSON = async (messages, options = {}) => {
  // 在 system 消息中追加 JSON 格式要求
  const enhancedMessages = messages.map(m => {
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
    temperature: options.temperature ?? 0.1, // 降低温度提高 JSON 准确性
  })

  try {
    return JSON.parse(text)
  } catch {
    // 尝试从文本中提取 JSON
    // 先去掉 markdown 代码块标记
    const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
    try {
      return JSON.parse(cleaned)
    } catch {
      // 尝试匹配 { ... }
      const match = cleaned.match(/\{[\s\S]*\}/)
      if (match) {
        return JSON.parse(match[0])
      }
      throw new Error('AI 返回内容无法解析为 JSON: ' + text.substring(0, 200))
    }
  }
}

module.exports = {
  isConfigured,
  chat,
  chatStream,
  chatJSON,
  BAIDU_MODEL,
}
