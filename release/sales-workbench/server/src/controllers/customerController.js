const Customer = require('../models/Customer')

exports.getCustomers = async (req, res) => {
  try {
    const customers = await Customer.find({ userId: req.user._id }).sort({ createdAt: -1 })
    res.json(customers)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

exports.getCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id)
    if (!customer) return res.status(404).json({ message: '客户不存在' })
    res.json(customer)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

exports.createCustomer = async (req, res) => {
  try {
    const customer = new Customer({ ...req.body, userId: req.user._id })
    const saved = await customer.save()
    res.status(201).json(saved)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
}

exports.updateCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id)
    if (!customer) return res.status(404).json({ message: '客户不存在' })

    Object.assign(customer, req.body)
    customer.updatedAt = Date.now()
    const updated = await customer.save()
    res.json(updated)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
}

exports.deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id)
    if (!customer) return res.status(404).json({ message: '客户不存在' })

    await customer.remove()
    res.json({ message: '客户已删除' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

exports.addProject = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id)
    if (!customer) return res.status(404).json({ message: '客户不存在' })

    const project = { ...req.body.project, id: Date.now().toString() }
    customer.projects.push(project)
    customer.updatedAt = Date.now()
    const updated = await customer.save()
    res.json(updated)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
}

exports.updateProject = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id)
    if (!customer) return res.status(404).json({ message: '客户不存在' })

    const projectIdx = customer.projects.findIndex(p => p.id === req.body.project.id)
    if (projectIdx === -1) return res.status(404).json({ message: '项目不存在' })

    customer.projects[projectIdx] = req.body.project
    customer.updatedAt = Date.now()
    const updated = await customer.save()
    res.json(updated)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
}

exports.deleteProject = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id)
    if (!customer) return res.status(404).json({ message: '客户不存在' })

    customer.projects = customer.projects.filter(p => p.id !== req.params.projectId)
    customer.updatedAt = Date.now()
    const updated = await customer.save()
    res.json(updated)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}