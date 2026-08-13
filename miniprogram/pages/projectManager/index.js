const { projects, contracts, auth } = require('../../utils/api.js')

Page({
  data: {
    projects: [],
    pagedProjects: [],
    contracts: [],
    contractOptions: ['—'],

    search: '',
    contractStatusIndex: 0,
    contractStatusOptions: ['全部合同状态', '有合同', '无合同'],
    deliveryStatusIndex: 0,
    deliveryStatusOptions: ['全部发货状态', '已发货', '未发货'],
    dateFrom: '',
    dateTo: '',

    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 1,

    stats: { total: 0, totalAmount: 0, withContract: 0, shipped: 0 },

    showEditModal: false,
    showViewModal: false,
    showDeleteModal: false,
    editingItem: null,
    viewingItem: null,
    deletingId: '',

    newContractNo: '',
    contractPickerIndex: 0,
    riskOptions: ['正常', '注意', '预警', '紧急'],
    riskIndex: 0,
    qualifiedOptions: ['无', '有'],
    qualifiedIndex: 0
  },

  onLoad() {
    if (!auth.isLoggedIn()) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      setTimeout(() => wx.reLaunch({ url: '/pages/index/index' }), 800)
      return
    }
    this.loadProjects()
    this.loadContracts()
  },

  onShow() {
    if (!auth.isLoggedIn()) return
    this.loadProjects()
    this.loadContracts()
  },

  buildFilter() {
    const d = this.data
    const filter = {}
    if (d.search) filter.search = d.search
    if (d.contractStatusIndex > 0) filter.contractStatus = d.contractStatusOptions[d.contractStatusIndex]
    if (d.deliveryStatusIndex > 0) filter.deliveryStatus = d.deliveryStatusOptions[d.deliveryStatusIndex]
    if (d.dateFrom) filter.dateFrom = d.dateFrom
    if (d.dateTo) filter.dateTo = d.dateTo
    return filter
  },

  async loadProjects() {
    wx.showLoading({ title: '加载中' })
    try {
      const res = await projects.list(this.buildFilter())
      const list = res.data || res.projects || []
      // 兼容两种ID：_id / id
      const normalized = list.map(p => ({ ...p, _id: p._id || p.id }))
      this.setData({ projects: normalized, total: normalized.length, page: 1 })
      this.calcStats(normalized)
      this.updatePagedData()
      wx.hideLoading()
    } catch (e) {
      wx.hideLoading()
    }
  },

  async loadContracts() {
    try {
      const res = await contracts.list()
      const list = res.data || res.contracts || []
      const options = ['—', ...list.map(c => c.clientContractNo)]
      this.setData({ contracts: list, contractOptions: options })
    } catch (e) {}
  },

  calcStats(list) {
    const total = list.length
    const totalAmount = list.reduce((s, p) => s + (p.totalPrice || 0), 0)
    const withContract = list.filter(p => p.hasContract).length
    const shipped = list.filter(p => p.actualDelivery && p.actualDelivery !== '—').length
    this.setData({ stats: { total, totalAmount, withContract, shipped } })
  },

  updatePagedData() {
    const { projects, page, pageSize } = this.data
    const start = (page - 1) * pageSize
    const pagedProjects = projects.slice(start, start + pageSize)
    const totalPages = Math.max(1, Math.ceil(projects.length / pageSize))
    this.setData({ pagedProjects, totalPages })
  },

  onSearchInput(e) { this.setData({ search: e.detail.value }) },
  onSearchConfirm() { this.loadProjects() },

  onContractStatusChange(e) {
    this.setData({ contractStatusIndex: parseInt(e.detail.value) }, () => this.loadProjects())
  },
  onDeliveryStatusChange(e) {
    this.setData({ deliveryStatusIndex: parseInt(e.detail.value) }, () => this.loadProjects())
  },
  onDateFromChange(e) {
    this.setData({ dateFrom: e.detail.value }, () => this.loadProjects())
  },
  onDateToChange(e) {
    this.setData({ dateTo: e.detail.value }, () => this.loadProjects())
  },
  clearFilters() {
    this.setData({
      search: '', contractStatusIndex: 0, deliveryStatusIndex: 0,
      dateFrom: '', dateTo: ''
    }, () => this.loadProjects())
  },

  prevPage() {
    if (this.data.page > 1) {
      this.setData({ page: this.data.page - 1 }, () => this.updatePagedData())
    }
  },
  nextPage() {
    if (this.data.page < this.data.totalPages) {
      this.setData({ page: this.data.page + 1 }, () => this.updatePagedData())
    }
  },

  openAddModal() {
    const count = this.data.projects.length + 1
    const year = new Date().getFullYear()
    const emptyItem = {
      customer: '', productionNo: `SC-${year}-${String(count).padStart(3, '0')}`,
      drawingNo: '', productName: '', material: '', spec: '',
      quantity: 0, blankWeight: '', unitPrice: 0, piecePrice: 0, totalPrice: 0,
      hasContract: false, clientContractNo: '—',
      plannedDelivery: '', actualDelivery: '—', plannedQualified: '',
      qualified: false, risk: '正常', overdueDays: 0
    }
    this.setData({
      showEditModal: true, editingItem: emptyItem,
      riskIndex: 0, qualifiedIndex: 0, contractPickerIndex: 0, newContractNo: ''
    })
  },

  openEditModal(e) {
    const { id } = e.currentTarget.dataset
    const item = this.data.projects.find(p => p._id === id)
    if (!item) return
    const riskIndex = this.data.riskOptions.indexOf(item.risk)
    const qualifiedIndex = item.qualified ? 1 : 0
    const cIndex = this.data.contractOptions.indexOf(item.clientContractNo)
    this.setData({
      showEditModal: true, editingItem: { ...item },
      riskIndex: riskIndex >= 0 ? riskIndex : 0,
      qualifiedIndex: qualifiedIndex >= 0 ? qualifiedIndex : 0,
      contractPickerIndex: cIndex >= 0 ? cIndex : 0,
      newContractNo: ''
    })
  },

  openViewModal(e) {
    const { id } = e.currentTarget.dataset
    const item = this.data.projects.find(p => p._id === id)
    if (item) this.setData({ showViewModal: true, viewingItem: item })
  },

  openDeleteModal(e) {
    const { id } = e.currentTarget.dataset
    this.setData({ showDeleteModal: true, deletingId: id })
  },

  closeModal() {
    this.setData({
      showEditModal: false, showViewModal: false, showDeleteModal: false,
      editingItem: null, viewingItem: null, deletingId: ''
    })
  },
  stopPropagation() {},

  onFieldChange(e) {
    const { field } = e.currentTarget.dataset
    const item = { ...this.data.editingItem }
    item[field] = e.detail.value
    this.setData({ editingItem: item })
  },
  onNumberChange(e) {
    const { field } = e.currentTarget.dataset
    const item = { ...this.data.editingItem }
    item[field] = parseFloat(e.detail.value) || 0
    this.setData({ editingItem: item })
  },
  onRiskChange(e) {
    const idx = parseInt(e.detail.value)
    const item = { ...this.data.editingItem }
    item.risk = this.data.riskOptions[idx]
    this.setData({ riskIndex: idx, editingItem: item })
  },
  onQualifiedChange(e) {
    const idx = parseInt(e.detail.value)
    const item = { ...this.data.editingItem }
    item.qualified = idx === 1
    this.setData({ qualifiedIndex: idx, editingItem: item })
  },
  onContractChange(e) {
    const idx = parseInt(e.detail.value)
    const val = this.data.contractOptions[idx]
    const item = { ...this.data.editingItem }
    item.clientContractNo = val
    item.hasContract = val !== '—'
    this.setData({ contractPickerIndex: idx, editingItem: item })
  },
  onNewContractInput(e) {
    this.setData({ newContractNo: e.detail.value })
  },

  async saveProject() {
    const { editingItem, newContractNo } = this.data
    if (!editingItem.customer || !editingItem.productionNo) {
      wx.showToast({ title: '请填写客户和生产编号', icon: 'none' })
      return
    }

    if (newContractNo.trim()) {
      wx.showLoading({ title: '创建合同中' })
      try {
        const nc = {
          clientContractNo: newContractNo.trim(),
          customer: editingItem.customer || '未指定客户',
          linkedProjects: 1,
          totalAmount: editingItem.totalPrice || 0,
          paymentStatus: '未回款',
          invoiceDate: '未开票',
          paymentDate: '—',
          partialAmount: 0,
          contractPaymentMethod: '—',
          actualPaymentMethod: '—',
          risk: '正常'
        }
        await contracts.create(nc)
        wx.hideLoading()
        const item = { ...editingItem, clientContractNo: newContractNo.trim(), hasContract: true }
        await this.doSave(item)
      } catch (e) {
        wx.hideLoading()
      }
      return
    }

    await this.doSave(editingItem)
  },

  async doSave(item) {
    wx.showLoading({ title: '保存中' })
    try {
      const isNew = !item._id
      // 去掉_id和空值，交给后端处理
      const payload = { ...item }
      delete payload._id
      if (isNew) {
        await projects.create(payload)
      } else {
        await projects.update(item._id, payload)
      }
      wx.hideLoading()
      wx.showToast({ title: '保存成功', icon: 'success' })
      this.closeModal()
      this.loadProjects()
      this.loadContracts()
    } catch (e) {
      wx.hideLoading()
    }
  },

  async confirmDelete() {
    const { deletingId } = this.data
    if (!deletingId) return
    wx.showLoading({ title: '删除中' })
    try {
      await projects.del(deletingId)
      wx.hideLoading()
      wx.showToast({ title: '删除成功', icon: 'success' })
      this.closeModal()
      this.loadProjects()
      this.loadContracts()
    } catch (e) {
      wx.hideLoading()
    }
  },

  goContractManager() {
    wx.navigateTo({ url: '/pages/contractManager/index' })
  },

  fmtCurrency(n) {
    return '¥' + (n || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  },

  isOverdue(item) {
    return item.actualDelivery === '—' && (item.overdueDays || 0) > 0
  }
})
