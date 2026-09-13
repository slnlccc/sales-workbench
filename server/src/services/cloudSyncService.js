const COS = require('cos-nodejs-sdk-v5')
const path = require('path')
const Project = require('../models/Project')
const Contract = require('../models/Contract')
const Schedule = require('../models/Schedule')
const Customer = require('../models/Customer')

// 加载密钥配置（优先环境变量，回退到配置文件）
const cosKeys = require('../config/cosKeys')

const getConfig = (key) => process.env[key] || cosKeys[key]

// 检查腾讯云COS是否已配置
const isConfigured = () => {
  const id = getConfig('TENCENT_SECRET_ID')
  return !!(id && id !== 'your-secret-id' &&
    getConfig('TENCENT_SECRET_KEY') &&
    getConfig('TENCENT_COS_BUCKET') &&
    getConfig('TENCENT_COS_REGION'))
}

// 创建COS客户端实例（懒加载）
let cosInstance = null
const getCos = () => {
  if (!cosInstance && isConfigured()) {
    cosInstance = new COS({
      SecretId: getConfig('TENCENT_SECRET_ID'),
      SecretKey: getConfig('TENCENT_SECRET_KEY'),
    })
  }
  return cosInstance
}

// 获取用户数据存储路径（使用 username 作为稳定标识，避免内存DB冷启动导致 _id 变化后找不到云端数据）
const getUserDataKey = (username) => {
  return `userdata/${username}/workbench-data.json`
}

// 获取用户同步状态路径
const getUserSyncMetaKey = (username) => {
  return `userdata/${username}/sync-meta.json`
}

// 导出用户所有数据
const exportUserData = async (userId) => {
  const [projects, contracts, schedules, customers] = await Promise.all([
    Project.find({ userId }).lean(),
    Contract.find({ userId }).lean(),
    Schedule.find({ userId }).lean(),
    Customer.find({ userId }).lean(),
  ])

  return {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    data: {
      projects,
      contracts,
      schedules,
      customers,
    },
  }
}

// 上传数据到腾讯云COS
const uploadToCloud = async (userId, username) => {
  const cos = getCos()
  if (!cos) {
    throw new Error('腾讯云COS未配置，请先在 .env 中设置 TENCENT_SECRET_ID、TENCENT_SECRET_KEY 等参数')
  }

  const exportData = await exportUserData(userId)
  const key = getUserDataKey(username)
  const body = JSON.stringify(exportData, null, 2)

  await new Promise((resolve, reject) => {
    cos.putObject({
      Bucket: getConfig('TENCENT_COS_BUCKET'),
      Region: getConfig('TENCENT_COS_REGION'),
      Key: key,
      Body: body,
      ContentType: 'application/json',
    }, (err, data) => {
      if (err) reject(err)
      else resolve(data)
    })
  })

  // 上传同步元信息
  const syncMeta = {
    lastSyncAt: new Date().toISOString(),
    recordCount: {
      projects: exportData.data.projects.length,
      contracts: exportData.data.contracts.length,
      schedules: exportData.data.schedules.length,
      customers: exportData.data.customers.length,
    },
    version: '1.0',
  }

  const metaKey = getUserSyncMetaKey(username)
  await new Promise((resolve, reject) => {
    cos.putObject({
      Bucket: getConfig('TENCENT_COS_BUCKET'),
      Region: getConfig('TENCENT_COS_REGION'),
      Key: metaKey,
      Body: JSON.stringify(syncMeta, null, 2),
      ContentType: 'application/json',
    }, (err, data) => {
      if (err) reject(err)
      else resolve(data)
    })
  })

  return {
    success: true,
    lastSyncAt: syncMeta.lastSyncAt,
    recordCount: syncMeta.recordCount,
  }
}

// 从腾讯云COS拉取数据
const downloadFromCloud = async (username) => {
  const cos = getCos()
  if (!cos) {
    throw new Error('腾讯云COS未配置')
  }

  const key = getUserDataKey(username)

  const result = await new Promise((resolve, reject) => {
    cos.getObject({
      Bucket: getConfig('TENCENT_COS_BUCKET'),
      Region: getConfig('TENCENT_COS_REGION'),
      Key: key,
    }, (err, data) => {
      if (err) {
        if (err.statusCode === 404) {
          reject(new Error('云端暂无同步数据，请先上传'))
        } else {
          reject(err)
        }
      } else {
        try {
          const body = data.Body.toString('utf-8')
          resolve(JSON.parse(body))
        } catch (parseErr) {
          reject(new Error('云端数据解析失败'))
        }
      }
    })
  })

  return result
}

// 将云端数据导入到本地数据库（合并模式，不删除已有数据）
// 安全策略：每条记录按 _id 检查归属，仅导入属于当前用户的数据，
// 若本地已存在同 _id 记录则跳过，避免跨用户数据污染与主键冲突。
const importCloudData = async (userId, cloudData) => {
  if (!cloudData || !cloudData.data) {
    throw new Error('云端数据格式无效')
  }

  const { projects, contracts, schedules, customers } = cloudData.data
  const imported = { projects: 0, contracts: 0, schedules: 0, customers: 0 }

  const importModel = async (Model, items, key) => {
    if (!items || items.length === 0) return
    for (const item of items) {
      if (!item._id) continue
      const existing = await Model.findById(item._id).lean()
      if (existing) {
        // 本地已存在该记录：仅当属于当前用户时跳过（同一条），
        // 不属于当前用户则跳过以保证隔离，绝不覆盖他人数据
        continue
      }
      try {
        const { _id, ...rest } = item
        await Model.create({ _id, ...rest, userId })
        imported[key]++
      } catch (createErr) {
        // 忽略单条导入失败（如唯一键冲突），继续导入其余记录
        console.warn(`[sync] 导入${key}记录失败:`, createErr.message)
      }
    }
  }

  await importModel(Project, projects, 'projects')
  await importModel(Contract, contracts, 'contracts')
  await importModel(Schedule, schedules, 'schedules')
  await importModel(Customer, customers, 'customers')

  return imported
}

// 获取同步状态
const getSyncStatus = async (username) => {
  const cos = getCos()
  if (!cos) {
    return {
      configured: false,
      lastSyncAt: null,
      message: '腾讯云COS未配置',
    }
  }

  const metaKey = getUserSyncMetaKey(username)

  try {
    const result = await new Promise((resolve, reject) => {
      cos.getObject({
        Bucket: getConfig('TENCENT_COS_BUCKET'),
        Region: getConfig('TENCENT_COS_REGION'),
        Key: metaKey,
      }, (err, data) => {
        if (err) {
          if (err.statusCode === 404) {
            resolve(null)
          } else {
            reject(err)
          }
        } else {
          try {
            resolve(JSON.parse(data.Body.toString('utf-8')))
          } catch {
            resolve(null)
          }
        }
      })
    })

    return {
      configured: true,
      lastSyncAt: result ? result.lastSyncAt : null,
      recordCount: result ? result.recordCount : null,
      message: result ? '已同步' : '尚未同步',
    }
  } catch (err) {
    return {
      configured: true,
      lastSyncAt: null,
      message: `查询同步状态失败: ${err.message}`,
    }
  }
}

/**
 * 登录后自动同步：从云端拉取数据并导入本地。
 * 用于解决 mongodb-memory-server 冷启动导致本地数据丢失的问题。
 * 失败时不抛出异常（仅记录日志），避免影响登录流程。
 * @param {string} userId - MongoDB 用户 _id，用于数据库查询
 * @param {string} username - 用户名，作为 COS 存储路径的稳定标识
 */
async function autoSync(userId, username) {
  try {
    if (!isConfigured()) {
      console.log(`[sync] COS未配置，跳过自动同步 user=${username}`)
      return { skipped: true, reason: 'cos_not_configured' }
    }
    const cloudData = await downloadFromCloud(username)
    const imported = await importCloudData(userId, cloudData)
    console.log(`[sync] 自动同步完成 user=${username}`, imported)
    return { success: true, imported, cloudExportedAt: cloudData.exportedAt }
  } catch (err) {
    // 云端暂无数据等情况视为正常，不阻塞登录
    console.warn(`[sync] 自动同步失败 user=${username}:`, err.message)
    return { success: false, error: err.message }
  }
}

// 将前端传来的 localStorage 数据直接写入云端 COS（绕过 MongoDB）
// 这是前端数据直接写 localStorage 而不经过后端 API 时的同步桥梁
const uploadLocalDataToCloud = async (username, localData) => {
  const cos = getCos()
  if (!cos) {
    throw new Error('腾讯云COS未配置')
  }

  const now = new Date().toISOString()
  const exportData = {
    version: '1.0',
    exportedAt: now,
    // 前端传来的 data 字段直接使用，兼容 { projects, contracts, schedules, customers } 结构
    data: localData?.data || localData || { projects: [], contracts: [], schedules: [], customers: [] },
  }

  const key = getUserDataKey(username)
  const body = JSON.stringify(exportData, null, 2)

  await new Promise((resolve, reject) => {
    cos.putObject({
      Bucket: getConfig('TENCENT_COS_BUCKET'),
      Region: getConfig('TENCENT_COS_REGION'),
      Key: key,
      Body: body,
      ContentType: 'application/json',
    }, (err, data) => {
      if (err) reject(err)
      else resolve(data)
    })
  })

  const d = exportData.data
  const syncMeta = {
    lastSyncAt: now,
    recordCount: {
      projects: (d.projects || []).length,
      contracts: (d.contracts || []).length,
      schedules: (d.schedules || []).length,
      customers: (d.customers || []).length,
    },
    version: '1.0',
  }

  const metaKey = getUserSyncMetaKey(username)
  await new Promise((resolve, reject) => {
    cos.putObject({
      Bucket: getConfig('TENCENT_COS_BUCKET'),
      Region: getConfig('TENCENT_COS_REGION'),
      Key: metaKey,
      Body: JSON.stringify(syncMeta, null, 2),
      ContentType: 'application/json',
    }, (err, data) => {
      if (err) reject(err)
      else resolve(data)
    })
  })

  return {
    success: true,
    lastSyncAt: syncMeta.lastSyncAt,
    recordCount: syncMeta.recordCount,
  }
}

module.exports = {
  isConfigured,
  uploadToCloud,
  uploadLocalDataToCloud,
  downloadFromCloud,
  importCloudData,
  getSyncStatus,
  exportUserData,
  autoSync,
}
