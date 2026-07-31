const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { action, id, data, filter } = event

  try {
    switch (action) {
      case 'list': {
        let query = db.collection('contracts')
        const where = {}

        if (filter) {
          if (filter.search) {
            const reg = db.RegExp({ regexp: filter.search, options: 'i' })
            return await query.where(
              _.or([
                { customer: reg },
                { clientContractNo: reg }
              ])
            ).orderBy('createdAt', 'desc').get()
          }
          if (filter.paymentStatus && filter.paymentStatus !== '全部') {
            where.paymentStatus = filter.paymentStatus
          }
        }

        query = Object.keys(where).length > 0 ? query.where(where) : query
        const res = await query.orderBy('createdAt', 'desc').get()
        return { success: true, data: res.data }
      }

      case 'add': {
        const res = await db.collection('contracts').add({
          data: { ...data, createdAt: db.serverDate(), updatedAt: db.serverDate() }
        })
        return { success: true, id: res._id }
      }

      case 'update': {
        await db.collection('contracts').doc(id).update({
          data: { ...data, updatedAt: db.serverDate() }
        })
        return { success: true }
      }

      case 'delete': {
        await db.collection('contracts').doc(id).remove()
        return { success: true }
      }

      case 'incrementLinked': {
        const doc = await db.collection('contracts').doc(id).get()
        const current = doc.data.linkedProjects || 0
        await db.collection('contracts').doc(id).update({
          data: { linkedProjects: current + 1, updatedAt: db.serverDate() }
        })
        return { success: true }
      }

      case 'decrementLinked': {
        const doc = await db.collection('contracts').doc(id).get()
        const current = doc.data.linkedProjects || 0
        await db.collection('contracts').doc(id).update({
          data: { linkedProjects: Math.max(0, current - 1), updatedAt: db.serverDate() }
        })
        return { success: true }
      }

      default:
        return { success: false, message: '未知操作' }
    }
  } catch (e) {
    return { success: false, message: e.message }
  }
}
