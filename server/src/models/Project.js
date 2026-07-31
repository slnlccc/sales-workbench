const mongoose = require('mongoose')

const projectSchema = new mongoose.Schema({
  customer: { type: String, required: true },
  productionNo: { type: String, required: true },
  drawingNo: { type: String },
  productName: { type: String },
  material: { type: String },
  spec: { type: String },
  quantity: { type: Number, default: 0 },
  blankWeight: { type: String },
  unitPrice: { type: Number, default: 0 },
  piecePrice: { type: Number, default: 0 },
  totalPrice: { type: Number, default: 0 },
  hasContract: { type: Boolean, default: false },
  clientContractNo: { type: String, default: '—' },
  plannedDelivery: { type: String },
  actualDelivery: { type: String, default: '—' },
  plannedQualified: { type: String },
  qualified: { type: Boolean, default: false },
  risk: { type: String, default: '正常' },
  overdueDays: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
})

module.exports = mongoose.model('Project', projectSchema)