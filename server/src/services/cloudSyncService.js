const COS = require('cos-nodejs-sdk-v5')
const path = require('path')
const Project = require('../models/Project')
const Contract = require('../models/Contract')
const Schedule = require('../models/Schedule')
const Customer = require('../models/Customer')

// 检查腾讯云COS是否已配置
const isConfigured = () => {
  return !!(
    process.env.TENCENT_SECRET_ID &&
    process.env.TENCENT_SECRET_KEY &&
    process.env.TENCENT_COS_BUCKET &&
    process.env.TENCENT_COS_REGION &&
    process.env.TENCENT_SECRET_ID !== 'your-secret-id'
  )
}

// 创建COS客户端实例（懒加载）
let cosInstance = null
const getCos = () => {
  if (!cosInstance && isConfigured()) {
    cosInstance = new COS({
      SecretId: process.env.TENCENT_SECRET_ID,
      SecretKey: process.env.TENCENT_SECRET_KEY,
    })
  }
  return cosInstance
}

// 获取用户数据存储路径
const getUserDataKey = (userId) => {
  return `userdata/${userId}/workbench-data.json`
}

// 获取用户同步状态路径
const getUserSyncMetaKey = (userId) => {
  return `userdata/${userId}/sync-meta.json`
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
const uploadToCloud = async (userId) => {
  const cos = getCos()
  if (!cos) {
    throw new Error('腾讯云COS未配置，请先在 .env 中设置 TENCENT_SECRET_ID、TENCENT_SECRET_KEY 等参数')
  }

  const exportData = await exportUserData(userId)
  const key = getUserDataKey(userId)
  const body = JSON.stringify(exportData, null, 2)

  await new Promise((resolve, reject) => {
    cos.putObject({
      Bucket: process.env.TENCENT_COS_BUCKET,
      Region: process.env.TENCENT_COS_REGION,
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

  const metaKey = getUserSyncMetaKey(userId)
  await new Promise((resolve, reject) => {
    cos.putObject({
      Bucket: process.env.TENCENT_COS_BUCKET,
      Region: process.env.TENCENT_COS_REGION,
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
const downloadFromCloud = async (userId) => {
  const cos = getCos()
  if (!cos) {
    throw new Error('腾讯云COS未配置')
  }

  const key = getUserDataKey(userId)

  const result = await new Promise((resolve, reject) => {
    cos.getObject({
      Bucket: process.env.TENCENT_COS_BUCKET,
      Region: process.env.TENCENT_COS_REGION,
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
const importCloudData = async (userId, cloudData) => {
  if (!cloudData || !cloudData.data) {
    throw new Error('云端数据格式无效')
  }

  const { projects, contracts, schedules, customers } = cloudData.data
  let imported = { projects: 0, contracts: 0, schedules: 0, customers: 0 }

  // 导入项目
  if (projects && projects.length > 0) {
    for (const proj of projects) {
      const exists = await Project.findOne({ _id: proj._id, userId })
      if (!exists) {
        await Project.create({ ...proj, userId })
        imported.projects++
      }
    }
  }

  // 导入合同
  if (contracts && contracts.length > 0) {
    for (const con of contracts) {
      const exists = await Contract.findOne({ _id: con._id, userId })
      if (!exists) {
        await Contract.create({ ...con, userId })
        imported.contracts++
      }
    }
  }

  // 导入日程
  if (schedules && schedules.length > 0) {
    for (const sch of schedules) {
      const exists = await Schedule.findOne({ _id: sch._id, userId })
      if (!exists) {
        await Schedule.create({ ...sch, userId })
        imported.schedules++
      }
    }
  }

  // 导入客户
  if (customers && customers.length > 0) {
    for (const cus of customers) {
      const exists = await Customer.findOne({ _id: cus._id, userId })
      if (!exists) {
        await Customer.create({ ...cus, userId })
        imported.customers++
      }
    }
  }

  return imported
}

// 获取同步状态
const getSyncStatus = async (userId) => {
  const cos = getCos()
  if (!cos) {
    return {
      configured: false,
      lastSyncAt: null,
      message: '腾讯云COS未配置',
    }
  }

  const metaKey = getUserSyncMetaKey(userId)

  try {
    const result = await new Promise((resolve, reject) => {
      cos.getObject({
        Bucket: process.env.TENCENT_COS_BUCKET,
        Region: process.env.TENCENT_COS_REGION,
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

module.exports = {
  isConfigured,
  uploadToCloud,
  downloadFromCloud,
  importCloudData,
  getSyncStatus,
  exportUserData,
}
