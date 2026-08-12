/**
 * 百度千帆 AI 服务模块（新版 Bearer Token 方式）
 * 使用文心大模型（ERNIE），支持普通调用、流式调用和结构化输出
 * API 文档：https://cloud.baidu.com/doc/WENXINWORKSHOP/index.html
 *
 * 环境变量：
 *   BAIDU_API_KEY - 百度千帆 API Key（格式：bce-v3/ALTAK-xxx/xxx）
 *   BAIDU_MODEL   - 模型名称（默认 ernie-speed-128k，免费）
 */

const QIANFAN_API_URL = 'https://qianfan.baidubce.com/v2/chat/completions'

// 加载密钥配置（优先环境变量，回退到配置文件）
const { BAIDU_API_KEY: _defaultKey, BAIDU_MODEL: _defaultModel } = require('../config/aiKeys')
const BAIDU_MODEL = process.env.BAIDU_MODEL || _defaultModel || 'ernie-4.0-8k-latest'

/**
 * 检查 API Key 是否配置
 */
const isConfigured = () => {
  return !!(process.env.BAIDU_API_KEY || _defaultKey)
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
 * 普通调用（非流式）— OpenAI 兼容格式
 * @param {Array<{role: string, content: string}>} messages - 消息数组
 * @param {Object} options - 调用选项
 * @returns {Promise<string>} AI 返回的文本
 */
const chat = async (messages, options = {}) => {
  const apiKey = getApiKey()

  const body = {
    model: options.model || BAIDU_MODEL,
    messages: messages.map(m => ({
      role: m.role,
      content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
    })),
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens ?? 2048,
    stream: false,
  }

  const response = await fetch(QIANFAN_API_URL, {
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

  if (data.error) {
    throw new Error(`百度千帆 API 错误: ${data.error.message || JSON.stringify(data.error)}`)
  }

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

  const body = {
    model: options.model || BAIDU_MODEL,
    messages: messages.map(m => ({
      role: m.role,
      content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
    })),
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens ?? 2048,
    stream: true,
  }

  const response = await fetch(QIANFAN_API_URL, {
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
      if (!trimmed || !trimmed.startsWith('data:')) continue

      const jsonStr = trimmed.slice(5).trim()
      if (!jsonStr || jsonStr === '[DONE]') continue

      try {
        const parsed = JSON.parse(jsonStr)
        const content = parsed.choices?.[0]?.delta?.content || ''
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
    temperature: options.temperature ?? 0.1,
  })

  try {
    return JSON.parse(text)
  } catch {
    const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
    try {
      return JSON.parse(cleaned)
    } catch {
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
