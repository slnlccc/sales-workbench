const mongoose = require('mongoose')

const customerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  contact: { type: String },
  phone: { type: String },
  email: { type: String },
  level: { type: String, default: 'B' },
  tags: { type: [String], default: [] },
  remark: { type: String },
  projects: [{
    id: { type: String },
    name: { type: String },
    status: { type: String },
    progress: { type: Number, default: 0 }
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
})

module.exports = mongoose.model('Customer', customerSchema)