/**
 * 百度千帆 AI 服务模块（V1 RPC 方式）
 * 使用文心大模型（ERNIE），支持普通调用、流式调用和结构化输出
 *
 * 当前模型：ernie-4.0-turbo（免费可用，endpoint=ernie-4.0-turbo-8k）
 *
 * 环境变量（可选，覆盖内置默认值）：
 *   BAIDU_API_KEY - 百度千帆 API Key（格式：bce-v3/ALTAK-xxx/xxx）
 *   BAIDU_MODEL   - 模型端点路径（默认 ernie-4.0-turbo-8k）
 */

const QIANFAN_BASE_URL = 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat'

// 加载密钥配置（优先环境变量，回退到配置文件）
const { BAIDU_API_KEY: _defaultKey, BAIDU_MODEL: _defaultModel } = require('../config/aiKeys')

const BAIDU_MODEL = process.env.BAIDU_MODEL || _defaultModel || 'ernie-4.0-turbo-8k'

/**
 * 检查 API Key 是否配置（千帆大模型）
 */
const isConfigured = () => {
  return !!(process.env.BAIDU_API_KEY || _defaultKey)
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
  const format = (opts.format || 'mp3').toLowerCase()
  const sampleRate = Number(opts.sampleRate) || 16000
  const channels = Number(opts.channels) || 1
  // 百度ASR对音频有限制（60秒以内/5MB以内），这里做个简单的 base64 长度校验（1MB base64≈1.36MB 原数据）
  if (audioBase64.length > 5_000_000) throw new Error('音频过大，请控制在 60 秒以内')
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
 * 普通调用（非流式）
 * @param {Array<{role: string, content: string}>} messages - 消息数组
 * @param {Object} options - 调用选项
 * @returns {Promise<string>} AI 返回的文本
 */
const chat = async (messages, options = {}) => {
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
  isAsrConfigured,
  chat,
  chatStream,
  chatJSON,
  speechToText,
  BAIDU_MODEL,
}
