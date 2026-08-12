const Schedule = require('../models/Schedule')

exports.getSchedules = async (req, res) => {
  try {
    let query = Schedule.find({ userId: req.user._id })

    if (req.query.date) {
      query = query.find({ date: req.query.date })
    }

    if (req.query.closed !== undefined) {
      query = query.find({ closed: req.query.closed === 'true' })
    }

    const schedules = await query.sort({ date: 1, createdAt: -1 })
    res.json(schedules)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

exports.getSchedule = async (req, res) => {
  try {
    const schedule = await Schedule.findById(req.params.id)
    if (!schedule) return res.status(404).json({ message: '日程不存在' })
    res.json(schedule)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

exports.createSchedule = async (req, res) => {
  try {
    const schedule = new Schedule({ ...req.body, userId: req.user._id })
    const saved = await schedule.save()
    res.status(201).json(saved)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
}

exports.updateSchedule = async (req, res) => {
  try {
    const schedule = await Schedule.findById(req.params.id)
    if (!schedule) return res.status(404).json({ message: '日程不存在' })

    Object.assign(schedule, req.body)
    schedule.updatedAt = Date.now()
    const updated = await schedule.save()
    res.json(updated)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
}

exports.deleteSchedule = async (req, res) => {
  try {
    const schedule = await Schedule.findById(req.params.id)
    if (!schedule) return res.status(404).json({ message: '日程不存在' })

    await schedule.remove()
    res.json({ message: '日程已删除' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

exports.toggleClosed = async (req, res) => {
  try {
    const schedule = await Schedule.findById(req.params.id)
    if (!schedule) return res.status(404).json({ message: '日程不存在' })

    schedule.closed = !schedule.closed
    schedule.updatedAt = Date.now()
    const updated = await schedule.save()
    res.json(updated)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}