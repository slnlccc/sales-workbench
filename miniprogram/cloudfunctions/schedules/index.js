const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { action, id, data, filter } = event

  try {
    switch (action) {
      case 'list': {
        let query = db.collection('schedules')
        const where = {}
        if (filter) {
          if (filter.date) where.date = filter.date
          if (filter.closed !== undefined) where.closed = filter.closed
        }
        query = Object.keys(where).length > 0 ? query.where(where) : query
        const res = await query.orderBy('date', 'asc').orderBy('createdAt', 'desc').get()
        return { success: true, data: res.data }
      }

      case 'add': {
        const res = await db.collection('schedules').add({
          data: { ...data, createdAt: db.serverDate(), updatedAt: db.serverDate() }
        })
        return { success: true, id: res._id }
      }

      case 'update': {
        await db.collection('schedules').doc(id).update({
          data: { ...data, updatedAt: db.serverDate() }
        })
        return { success: true }
      }

      case 'delete': {
        await db.collection('schedules').doc(id).remove()
        return { success: true }
      }

      case 'toggleClosed': {
        const doc = await db.collection('schedules').doc(id).get()
        await db.collection('schedules').doc(id).update({
          data: { closed: !doc.data.closed, updatedAt: db.serverDate() }
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