const { customers, auth } = require('../../utils/api.js')

Page({
  data: {
    customers: [],
    showCustomerModal: false,
    editingCustomer: null,
    showProjectModal: false,
    editingProject: null,
    customerIndex: -1,
    projectIndex: -1,

    levelOptions: ['A', 'B', 'C'],
    statusOptions: ['待下料', '生产中', '加工中', '质检中', '已发货']
  },

  onLoad() {
    if (!auth.isLoggedIn()) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      setTimeout(() => wx.reLaunch({ url: '/pages/index/index' }), 800)
      return
    }
    this.loadCustomers()
  },

  onShow() {
    if (!auth.isLoggedIn()) return
    this.loadCustomers()
  },

  async loadCustomers() {
    wx.showLoading({ title: '加载中' })
    try {
      const list = await customers.list()
      const normalized = (Array.isArray(list) ? list : (list.data || [])).map(c => ({ ...c, _id: c._id || c.id }))
      this.setData({ customers: normalized })
      wx.hideLoading()
    } catch (e) {
      wx.hideLoading()
    }
  },

  openCustomerModal(e) {
    const { idx } = e.currentTarget.dataset
    if (idx !== undefined) {
      const customer = { ...this.data.customers[idx] }
      this.setData({ showCustomerModal: true, editingCustomer: customer, customerIndex: idx })
    } else {
      this.setData({
        showCustomerModal: true,
        editingCustomer: {
          name: '', contact: '', phone: '', email: '', level: 'B',
          projects: [], tags: [], remark: ''
        },
        customerIndex: -1
      })
    }
  },

  openProjectModal(e) {
    const { cidx, pidx } = e.currentTarget.dataset
    const customer = this.data.customers[cidx]
    if (pidx !== undefined) {
      const project = { ...customer.projects[pidx] }
      this.setData({
        showProjectModal: true,
        editingProject: project,
        customerIndex: cidx,
        projectIndex: pidx
      })
    } else {
      this.setData({
        showProjectModal: true,
        editingProject: { name: '', status: '待下料', progress: 0 },
        customerIndex: cidx,
        projectIndex: -1
      })
    }
  },

  closeModal() {
    this.setData({ showCustomerModal: false, showProjectModal: false })
  },

  onCustomerFieldChange(e) {
    const { field } = e.currentTarget.dataset
    const editingCustomer = { ...this.data.editingCustomer }
    editingCustomer[field] = e.detail.value
    this.setData({ editingCustomer })
  },

  onProjectFieldChange(e) {
    const { field } = e.currentTarget.dataset
    const editingProject = { ...this.data.editingProject }
    editingProject[field] = e.detail.value
    this.setData({ editingProject })
  },

  onLevelChange(e) {
    const idx = parseInt(e.detail.value)
    const editingCustomer = { ...this.data.editingCustomer }
    editingCustomer.level = this.data.levelOptions[idx]
    this.setData({ editingCustomer })
  },

  onStatusChange(e) {
    const idx = parseInt(e.detail.value)
    const editingProject = { ...this.data.editingProject }
    editingProject.status = this.data.statusOptions[idx]
    this.setData({ editingProject })
  },

  async saveCustomer() {
    const { editingCustomer, customerIndex } = this.data
    if (!editingCustomer.name.trim()) {
      wx.showToast({ title: '请输入客户名称', icon: 'none' })
      return
    }
    wx.showLoading({ title: '保存中' })
    try {
      const payload = { ...editingCustomer }
      delete payload._id
      if (customerIndex >= 0) {
        await customers.update(editingCustomer._id, payload)
      } else {
        await customers.create(payload)
      }
      wx.hideLoading()
      wx.showToast({ title: '保存成功', icon: 'success' })
      this.closeModal()
      this.loadCustomers()
    } catch (e) {
      wx.hideLoading()
    }
  },

  async saveProject() {
    const { editingProject, customerIndex, projectIndex } = this.data
    if (!editingProject.name.trim()) {
      wx.showToast({ title: '请输入项目名称', icon: 'none' })
      return
    }
    const customer = this.data.customers[customerIndex]
    if (!customer) return
    wx.showLoading({ title: '保存中' })
    try {
      if (projectIndex >= 0) {
        await customers.updateProject(customer._id, { project: editingProject })
      } else {
        await customers.addProject(customer._id, { project: editingProject })
      }
      wx.hideLoading()
      wx.showToast({ title: '保存成功', icon: 'success' })
      this.closeModal()
      this.loadCustomers()
    } catch (e) {
      wx.hideLoading()
    }
  },

  async deleteCustomer(e) {
    const { idx } = e.currentTarget.dataset
    const customer = this.data.customers[idx]
    if (!customer) return
    wx.showModal({
      title: '确认删除',
      content: '删除后不可恢复',
      success: async (res) => {
        if (res.confirm) {
          try {
            await customers.del(customer._id)
            wx.showToast({ title: '删除成功', icon: 'success' })
            this.loadCustomers()
          } catch (e) {}
        }
      }
    })
  },

  async deleteProject(e) {
    const { cidx, pidx } = e.currentTarget.dataset
    const customer = this.data.customers[cidx]
    if (!customer) return
    const project = customer.projects[pidx]
    if (!project) return
    wx.showModal({
      title: '确认删除',
      content: '删除后不可恢复',
      success: async (res) => {
        if (res.confirm) {
          try {
            await customers.delProject(customer._id, project.id || project._id)
            wx.showToast({ title: '删除成功', icon: 'success' })
            this.loadCustomers()
          } catch (e) {}
        }
      }
    })
  },

  getLevelColor(level) {
    const map = { A: '#DC2626', B: '#D97706', C: '#6B7280' }
    return map[level] || '#6B7280'
  },

  stopPropagation() {}
})
