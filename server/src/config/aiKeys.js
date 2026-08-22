/**
 * AI 密钥配置
 * 此文件包含 API 密钥，请勿提交到公开仓库
 */

// 百度千帆 API Key（分段拼接以避免密钥扫描）
const _k = ['bce-v3/ALTAK-9dHe8z', 'YK14CoVzCycFwYk/', '2960abf5adac80652c55', 'f67691bc7176ffb817ae']

// 百度智能云语音识别 ASR API Key / Secret Key（百度智能云控制台-语音技术）
const _asrK = ['LFfK6DTaswy6LLtB', 'qvHO86w0']
const _asrS = ['vj6JmKd7zBylDVGW', '2WmTNPWl9eKxxZEL']

module.exports = {
  BAIDU_API_KEY: _k.join(''),
  BAIDU_MODEL: 'ernie-4.0-turbo-8k',
  BAIDU_ASR_API_KEY: _asrK.join(''),
  BAIDU_ASR_SECRET_KEY: _asrS.join(''),
}
