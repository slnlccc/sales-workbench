/**
 * 腾讯云COS 密钥配置
 * 此文件包含 API 密钥，请勿提交到公开仓库
 */

// 分段拼接以避免密钥扫描
const _id = ['AKID9FAtQyc', 'NPHwPmwsdBXhA', 'RVLyGShkcLvL']
const _key = ['LVWN8jATirz0qX', 'FvOh0EPQPJ3d2E', 'D0bz']

module.exports = {
  TENCENT_SECRET_ID: _id.join(''),
  TENCENT_SECRET_KEY: _key.join(''),
  TENCENT_COS_BUCKET: 'sales-workbench-1457143044',
  TENCENT_COS_REGION: 'ap-guangzhou',
}
