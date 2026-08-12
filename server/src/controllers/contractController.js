const Contract = require('../models/Contract')
const Project = require('../models/Project')

exports.getContracts = async (req, res) => {
  try {
    let query = Contract.find({ userId: req.user._id })

    if (req.query.search) {
      const search = req.query.search
      query = query.find({
        $or: [
          { customer: { $regex: search, $options: 'i' } },
          { clientContractNo: { $regex: search, $options: 'i' } }
        ]
      })
    }

    if (req.query.paymentStatus && req.query.paymentStatus !== '全部') {
      query = query.find({ paymentStatus: req.query.paymentStatus })
    }

    const contracts = await query.sort({ createdAt: -1 })
    res.json(contracts)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

exports.getContract = async (req, res) => {
  try {
    const contract = await Contract.findById(req.params.id)
    if (!contract) return res.status(404).json({ message: '合同不存在' })
    res.json(contract)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

exports.createContract = async (req, res) => {
  try {
    const contract = new Contract({ ...req.body, userId: req.user._id })
    const saved = await contract.save()
    res.status(201).json(saved)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
}

exports.updateContract = async (req, res) => {
  try {
    const contract = await Contract.findById(req.params.id)
    if (!contract) return res.status(404).json({ message: '合同不存在' })

    Object.assign(contract, req.body)
    contract.updatedAt = Date.now()
    const updated = await contract.save()
    res.json(updated)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
}

exports.deleteContract = async (req, res) => {
  try {
    const contract = await Contract.findById(req.params.id)
    if (!contract) return res.status(404).json({ message: '合同不存在' })

    await Project.updateMany(
      { clientContractNo: contract.clientContractNo },
      { hasContract: false, clientContractNo: '—' }
    )

    await contract.remove()
    res.json({ message: '合同已删除' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

exports.getLinkedProjects = async (req, res) => {
  try {
    const contract = await Contract.findById(req.params.id)
    if (!contract) return res.status(404).json({ message: '合同不存在' })

    const projects = await Project.find({ clientContractNo: contract.clientContractNo })
    res.json(projects)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}