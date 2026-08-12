const mongoose = require('mongoose')

const scheduleSchema = new mongoose.Schema({
  date: { type: String, required: true },
  time: { type: String },
  title: { type: String, required: true },
  type: { type: String, default: '待办' },
  closed: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
})

module.exports = mongoose.model('Schedule', scheduleSchema)