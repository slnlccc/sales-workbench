const Contract = require('../models/Contract')
const Project = require('../models/Project')

exports.getContracts = async (req, res) => {
  try {
    let query = Contract.find({ userId: req.user._id })
    if (req.query.search) {
      const s = req.query.search
      query = query.find({
        $or: [
          { clientContractNo: { $regex: s, $options: 'i' } },
          { ourContractNo: { $regex: s, $options: 'i' } },
          { customer: { $regex: s, $options: 'i' } }
        ]
      })
    }
    const contracts = await query.sort({ createdAt: -1 }).lean()
    for (const c of contracts) {
      c.linkedProjectsList = await Project.find({
        userId: req.user._id,
        clientContractNo: c.clientContractNo
      }).sort({ createdAt: -1 }).limit(5).lean()
    }
    res.json(contracts)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

exports.getContract = async (req, res) => {
  try {
    const contract = await Contract.findOne({ _id: req.params.id, userId: req.user._id }).lean()
    if (!contract) return res.status(404).json({ message: '合同不存在' })
    contract.linkedProjectsList = await Project.find({
      userId: req.user._id,
      clientContractNo: contract.clientContractNo
    }).sort({ createdAt: -1 }).lean()
    res.json(contract)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

exports.getLinkedProjects = async (req, res) => {
  try {
    const contract = await Contract.findOne({ _id: req.params.id, userId: req.user._id })
    if (!contract) return res.status(404).json({ message: '合同不存在' })
    const projects = await Project.find({
      userId: req.user._id,
      clientContractNo: contract.clientContractNo
    }).sort({ createdAt: -1 })
    res.json(projects)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

exports.createContract = async (req, res) => {
  try {
    const c = new Contract({ ...req.body, userId: req.user._id })
    await c.save()
    res.status(201).json(c)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
}

exports.updateContract = async (req, res) => {
  try {
    let c = await Contract.findOne({ _id: req.params.id, userId: req.user._id })
    if (!c) return res.status(404).json({ message: '合同不存在' })
    Object.assign(c, req.body)
    c.updatedAt = Date.now()
    await c.save()
    res.json(c)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
}

exports.deleteContract = async (req, res) => {
  try {
    const c = await Contract.findOne({ _id: req.params.id, userId: req.user._id })
    if (!c) return res.status(404).json({ message: '合同不存在' })

    if (c.clientContractNo) {
      // 只清理本用户自己的项目（同合同号下）的 hasContract 标记，不影响别人
      await Project.updateMany(
        { userId: req.user._id, clientContractNo: c.clientContractNo },
        { $set: { hasContract: false, clientContractNo: '—' } }
      )
    }
    await c.deleteOne()
    res.json({ message: '合同已删除' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}
