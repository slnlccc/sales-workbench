const Project = require('../models/Project')
const Contract = require('../models/Contract')

exports.getProjects = async (req, res) => {
  try {
    let query = Project.find({ userId: req.user._id })
    
    if (req.query.search) {
      const search = req.query.search
      query = query.find({
        $or: [
          { customer: { $regex: search, $options: 'i' } },
          { productName: { $regex: search, $options: 'i' } },
          { drawingNo: { $regex: search, $options: 'i' } },
          { productionNo: { $regex: search, $options: 'i' } }
        ]
      })
    }

    if (req.query.contractStatus) {
      query = query.find({ hasContract: req.query.contractStatus === '有合同' })
    }

    if (req.query.deliveryStatus) {
      if (req.query.deliveryStatus === '已发货') {
        query = query.find({ actualDelivery: { $ne: '—' } })
      } else {
        query = query.find({ actualDelivery: '—' })
      }
    }

    const projects = await query.sort({ createdAt: -1 })
    res.json(projects)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

exports.getProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
    if (!project) return res.status(404).json({ message: '项目不存在' })
    res.json(project)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

exports.createProject = async (req, res) => {
  try {
    const project = new Project({ ...req.body, userId: req.user._id })
    const saved = await project.save()

    if (project.hasContract && project.clientContractNo !== '—') {
      const contract = await Contract.findOne({ clientContractNo: project.clientContractNo })
      if (contract) {
        contract.linkedProjects += 1
        contract.totalAmount += project.totalPrice
        await contract.save()
      }
    }

    res.status(201).json(saved)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
}

exports.updateProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
    if (!project) return res.status(404).json({ message: '项目不存在' })

    const oldContractNo = project.clientContractNo
    const oldPrice = project.totalPrice

    Object.assign(project, req.body)
    project.updatedAt = Date.now()
    const updated = await project.save()

    if (oldContractNo !== '—') {
      const oldContract = await Contract.findOne({ clientContractNo: oldContractNo })
      if (oldContract) {
        oldContract.linkedProjects = Math.max(0, oldContract.linkedProjects - 1)
        oldContract.totalAmount = Math.max(0, oldContract.totalAmount - oldPrice)
        await oldContract.save()
      }
    }

    if (project.hasContract && project.clientContractNo !== '—') {
      let contract = await Contract.findOne({ clientContractNo: project.clientContractNo })
      if (!contract) {
        contract = new Contract({
          clientContractNo: project.clientContractNo,
          customer: project.customer,
          linkedProjects: 0,
          totalAmount: 0,
          userId: req.user._id
        })
      }
      contract.linkedProjects += 1
      contract.totalAmount += project.totalPrice
      await contract.save()
    }

    res.json(updated)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
}

exports.deleteProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
    if (!project) return res.status(404).json({ message: '项目不存在' })

    if (project.hasContract && project.clientContractNo !== '—') {
      const contract = await Contract.findOne({ clientContractNo: project.clientContractNo })
      if (contract) {
        contract.linkedProjects = Math.max(0, contract.linkedProjects - 1)
        contract.totalAmount = Math.max(0, contract.totalAmount - project.totalPrice)
        await contract.save()
      }
    }

    await project.deleteOne()
    res.json({ message: '项目已删除' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}