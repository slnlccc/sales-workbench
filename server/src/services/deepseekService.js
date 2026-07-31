const axios = require('axios')

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions'
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || ''

/**
 * 调用 DeepSeek AI 大模型
 * @param {string} systemPrompt - 系统提示词
 * @param {string} userMessage - 用户消息
 * @param {object} options - 可选参数
 * @returns {Promise<string>} AI 回复内容
 */
async function callDeepSeek(systemPrompt, userMessage, options = {}) {
  if (!DEEPSEEK_API_KEY) {
    throw new Error('DeepSeek API Key 未配置，请在环境变量中设置 DEEPSEEK_API_KEY')
  }

  const {
    model = 'deepseek-chat',
    temperature = 0.7,
    max_tokens = 2048,
  } = options

  try {
    const response = await axios.post(
      DEEPSEEK_API_URL,
      {
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature,
        max_tokens,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        },
        timeout: 30000,
      }
    )

    return response.data.choices[0].message.content
  } catch (err) {
    const msg = err.response?.data?.error?.message || err.message
    console.error('DeepSeek API 调用失败:', msg)
    throw new Error(`AI 服务调用失败: ${msg}`)
  }
}

/**
 * 流式调用 DeepSeek AI 大模型
 * @param {string} systemPrompt - 系统提示词
 * @param {string} userMessage - 用户消息
 * @param {function} onChunk - 每个数据块的回调
 * @param {object} options - 可选参数
 */
async function streamDeepSeek(systemPrompt, userMessage, onChunk, options = {}) {
  if (!DEEPSEEK_API_KEY) {
    throw new Error('DeepSeek API Key 未配置，请在环境变量中设置 DEEPSEEK_API_KEY')
  }

  const {
    model = 'deepseek-chat',
    temperature = 0.7,
    max_tokens = 2048,
  } = options

  try {
    const response = await axios.post(
      DEEPSEEK_API_URL,
      {
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature,
        max_tokens,
        stream: true,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        },
        responseType: 'stream',
        timeout: 60000,
      }
    )

    return new Promise((resolve, reject) => {
      let fullContent = ''
      response.data.on('data', (chunk) => {
        const lines = chunk.toString().split('\n').filter(line => line.startsWith('data: '))
        for (const line of lines) {
          const data = line.slice(6)
          if (data === '[DONE]') {
            resolve(fullContent)
            return
          }
          try {
            const parsed = JSON.parse(data)
            const content = parsed.choices?.[0]?.delta?.content || ''
            if (content) {
              fullContent += content
              onChunk(content)
            }
          } catch (e) {
            // 忽略解析错误
          }
        }
      })
      response.data.on('end', () => resolve(fullContent))
      response.data.on('error', reject)
    })
  } catch (err) {
    const msg = err.response?.data?.error?.message || err.message
    console.error('DeepSeek 流式调用失败:', msg)
    throw new Error(`AI 流式调用失败: ${msg}`)
  }
}

module.exports = { callDeepSeek, streamDeepSeek }
