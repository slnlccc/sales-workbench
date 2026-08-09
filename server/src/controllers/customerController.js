const Customer = require('../models/Customer');

// @desc    Get all customers for current user
// @route   GET /api/customers
// @access  Private
exports.getCustomers = async (req, res) => {
  try {
    const customers = await Customer.find({ userId: req.user._id }).sort({ updatedAt: -1 });
    res.status(200).json({
      success: true,
      count: customers.length,
      data: customers
    });
  } catch (err) {
    console.error('Error in getCustomers:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get single customer (ownership enforced)
// @route   GET /api/customers/:id
// @access  Private
exports.getCustomer = async (req, res) => {
  try {
    const customer = await Customer.findOne({ _id: req.params.id, userId: req.user._id });
    if (!customer) {
      return res.status(404).json({ message: '客户不存在' });
    }
    res.status(200).json({ success: true, data: customer });
  } catch (err) {
    console.error('Error in getCustomer:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Create customer
// @route   POST /api/customers
// @access  Private
exports.createCustomer = async (req, res) => {
  try {
    const {
      name, type, industry, scale, contactPerson, phone,
      email, address, website, preferredProducts, businessStatus,
      creditLevel, potentialValue, tags, notes, customerSource
    } = req.body;

    if (!name) return res.status(400).json({ message: '客户名称必填' });
    if (!contactPerson) return res.status(400).json({ message: '联系人必填' });
    if (!phone) return res.status(400).json({ message: '联系电话必填' });

    const customer = new Customer({
      userId: req.user._id,
      name, type: type || '客户', industry: industry || '航空航天',
      scale: scale || '中型', contactPerson, phone,
      email: email || '', address: address || '', website: website || '',
      preferredProducts: preferredProducts || [], businessStatus: businessStatus || '初步接触',
      creditLevel: creditLevel || 'B', potentialValue: potentialValue || '中',
      tags: tags || [], notes: notes || '', customerSource: customerSource || '自主开发',
    });

    await customer.save();
    res.status(201).json({ success: true, data: customer });
  } catch (err) {
    console.error('Error in createCustomer:', err);
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(v => v.message);
      return res.status(400).json({ message: errors.join('; ') });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update customer (ownership enforced)
// @route   PUT /api/customers/:id
// @access  Private
exports.updateCustomer = async (req, res) => {
  try {
    let customer = await Customer.findOne({ _id: req.params.id, userId: req.user._id });
    if (!customer) return res.status(404).json({ message: '客户不存在' });

    const fields = ['name', 'type', 'industry', 'scale', 'contactPerson',
      'phone', 'email', 'address', 'website', 'preferredProducts',
      'businessStatus', 'creditLevel', 'potentialValue', 'tags', 'notes', 'customerSource'];
    fields.forEach(f => {
      if (req.body[f] !== undefined) customer[f] = req.body[f];
    });

    await customer.save();
    res.status(200).json({ success: true, data: customer });
  } catch (err) {
    console.error('Error in updateCustomer:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete customer (ownership enforced)
// @route   DELETE /api/customers/:id
// @access  Private
exports.deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!customer) return res.status(404).json({ message: '客户不存在' });
    res.status(200).json({ success: true, message: '删除成功' });
  } catch (err) {
    console.error('Error in deleteCustomer:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Add project to customer (scoped to current user)
// @route   POST /api/customers/:id/projects
// @access  Private
exports.addProject = async (req, res) => {
  try {
    const customer = await Customer.findOne({ _id: req.params.id, userId: req.user._id });
    if (!customer) return res.status(404).json({ message: '客户不存在' });
    const { name, status, budget, startDate, endDate, winRate, description } = req.body;
    if (!name) return res.status(400).json({ message: '项目名称必填' });

    customer.projects.push({
      userId: req.user._id,
      name, status: status || '跟进中', budget: budget || 0,
      startDate: startDate || null, endDate: endDate || null,
      winRate: winRate || 30, description: description || ''
    });

    await customer.save();
    res.status(201).json({ success: true, data: customer.projects[customer.projects.length - 1] });
  } catch (err) {
    console.error('Error in addProject:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update customer project (scoped to current user)
// @route   PUT /api/customers/:id/projects/:projectId
// @access  Private
exports.updateProject = async (req, res) => {
  try {
    const customer = await Customer.findOne({ _id: req.params.id, userId: req.user._id });
    if (!customer) return res.status(404).json({ message: '客户不存在' });
    const project = customer.projects.id(req.params.projectId);
    if (!project) return res.status(404).json({ message: '项目不存在' });

    const fields = ['name', 'status', 'budget', 'startDate', 'endDate', 'winRate', 'description'];
    fields.forEach(f => {
      if (req.body[f] !== undefined) project[f] = req.body[f];
    });
    await customer.save();
    res.status(200).json({ success: true, data: project });
  } catch (err) {
    console.error('Error in updateProject:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete customer project (scoped to current user)
// @route   DELETE /api/customers/:id/projects/:projectId
// @access  Private
exports.deleteProject = async (req, res) => {
  try {
    const customer = await Customer.findOne({ _id: req.params.id, userId: req.user._id });
    if (!customer) return res.status(404).json({ message: '客户不存在' });
    customer.projects = customer.projects.filter(p => p.id.toString() !== req.params.projectId);
    await customer.save();
    res.status(200).json({ success: true, message: '删除成功' });
  } catch (err) {
    console.error('Error in deleteProject:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
