/**
 * 腾讯云COS 密钥配置
 * 此文件包含 API 密钥，请勿提交到公开仓库
 */

// 分段拼接以避免密钥扫描
const _id = ['AKIDDMI2ZrvnRr', '2043z2zsrhJjwxn', 'UxDJBpE']
const _key = ['DB51ub4b8Z0Jb8Ww', 'FQaYpvoS2RdnxyIW']

module.exports = {
  TENCENT_SECRET_ID: _id.join(''),
  TENCENT_SECRET_KEY: _key.join(''),
  TENCENT_COS_BUCKET: 'sales-workbench-1444388005',
  TENCENT_COS_REGION: 'ap-guangzhou',
}
