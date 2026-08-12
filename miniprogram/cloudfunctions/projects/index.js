const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { action, id, data, filter, page = 1, pageSize = 50 } = event

  try {
    switch (action) {
      case 'list': {
        let query = db.collection('projects')
        const where = {}

        if (filter) {
          if (filter.search) {
            const reg = db.RegExp({ regexp: filter.search, options: 'i' })
            return await query.where(
              _.or([
                { customer: reg },
                { productName: reg },
                { drawingNo: reg },
                { productionNo: reg }
              ])
            ).orderBy('createdAt', 'desc').get()
          }
          if (filter.contractStatus === '有合同') where.hasContract = true
          if (filter.contractStatus === '无合同') where.hasContract = false
          if (filter.deliveryStatus === '已发货') where.actualDelivery = _.neq('—')
          if (filter.deliveryStatus === '未发货') where.actualDelivery = '—'
          if (filter.dateFrom || filter.dateTo) {
            const dateCond = {}
            if (filter.dateFrom) dateCond.$gte = filter.dateFrom
            if (filter.dateTo) dateCond.$lte = filter.dateTo
            where.plannedDelivery = dateCond
          }
        }

        query = Object.keys(where).length > 0 ? query.where(where) : query
        const res = await query.orderBy('createdAt', 'desc').get()
        return { success: true, data: res.data }
      }

      case 'add': {
        const res = await db.collection('projects').add({
          data: { ...data, createdAt: db.serverDate(), updatedAt: db.serverDate() }
        })
        return { success: true, id: res._id }
      }

      case 'update': {
        await db.collection('projects').doc(id).update({
          data: { ...data, updatedAt: db.serverDate() }
        })
        return { success: true }
      }

      case 'delete': {
        await db.collection('projects').doc(id).remove()
        return { success: true }
      }

      default:
        return { success: false, message: '未知操作' }
    }
  } catch (e) {
    return { success: false, message: e.message }
  }
}
