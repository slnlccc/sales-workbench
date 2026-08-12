/**
 * DeepSeek AI 服务模块
 * 支持 OpenAI 兼容格式的普通调用和流式调用
 */

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions'
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat'

/**
 * 检查 API Key 是否配置
 */
const isConfigured = () => {
  return !!process.env.DEEPSEEK_API_KEY
}

/**
 * 获取 API Key（未配置时抛出错误）
 */
const getApiKey = () => {
  const key = process.env.DEEPSEEK_API_KEY
  if (!key) {
    throw new Error('DEEPSEEK_API_KEY 未配置，AI 功能不可用')
  }
  return key
}

/**
 * 构建请求体
 */
const buildRequestBody = (messages, options = {}) => {
  return {
    model: options.model || DEEPSEEK_MODEL,
    messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens ?? 2048,
    stream: options.stream || false,
    ...(options.responseFormat ? { response_format: options.responseFormat } : {}),
  }
}

/**
 * 普通调用（非流式）
 * @param {Array<{role: string, content: string}>} messages - 消息数组
 * @param {Object} options - 调用选项
 * @returns {Promise<string>} AI 返回的文本
 */
const chat = async (messages, options = {}) => {
  const apiKey = getApiKey()
  const body = buildRequestBody(messages, { ...options, stream: false })

  const response = await fetch(DEEPSEEK_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`DeepSeek API 错误 (${response.status}): ${errText}`)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content || ''
}

/**
 * 流式调用（SSE）
 * @param {Array<{role: string, content: string}>} messages - 消息数组
 * @param {Object} options - 调用选项
 * @param {function(string): void} onChunk - 每收到一段文本时的回调
 * @returns {Promise<string>} 完整的 AI 返回文本
 */
const chatStream = async (messages, options = {}, onChunk) => {
  const apiKey = getApiKey()
  const body = buildRequestBody(messages, { ...options, stream: true })

  const response = await fetch(DEEPSEEK_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`DeepSeek API 错误 (${response.status}): ${errText}`)
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
      if (!trimmed || !trimmed.startsWith('data: ')) continue

      const jsonStr = trimmed.slice(6)
      if (jsonStr === '[DONE]') continue

      try {
        const parsed = JSON.parse(jsonStr)
        const delta = parsed.choices?.[0]?.delta?.content || ''
        if (delta) {
          fullText += delta
          if (onChunk) onChunk(delta)
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
  const text = await chat(messages, {
    ...options,
    responseFormat: { type: 'json_object' },
  })

  try {
    return JSON.parse(text)
  } catch {
    // 尝试从文本中提取 JSON
    const match = text.match(/\{[\s\S]*\}/)
    if (match) {
      return JSON.parse(match[0])
    }
    throw new Error('AI 返回内容无法解析为 JSON')
  }
}

module.exports = {
  isConfigured,
  chat,
  chatStream,
  chatJSON,
  DEEPSEEK_MODEL,
}
