const mongoose = require('mongoose')

const contractSchema = new mongoose.Schema({
  clientContractNo: { type: String, required: true },
  customer: { type: String, required: true },
  linkedProjects: { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 },
  paymentStatus: { type: String, default: '未回款' },
  invoiceDate: { type: String, default: '未开票' },
  paymentDate: { type: String, default: '—' },
  partialAmount: { type: Number, default: 0 },
  contractPaymentMethod: { type: String, default: '—' },
  actualPaymentMethod: { type: String, default: '—' },
  risk: { type: String, default: '正常' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
})

module.exports = mongoose.model('Contract', contractSchema)