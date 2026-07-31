Page({
  data: {
    contracts: [],
    pagedContracts: [],
    projects: [],

    search: '',
    paymentStatusIndex: 0,
    paymentStatusOptions: ['全部回款状态', '未回款', '部分回款', '已回款'],

    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 1,

    stats: { total: 0, totalAmount: 0, received: 0, partial: 0, pending: 0 },

    showEditModal: false,
    showViewModal: false,
    showDeleteModal: false,
    editingItem: null,
    viewingItem: null,
    deletingId: '',

    riskOptions: ['正常', '预警', '紧急'],
    riskIndex: 0
  },

  onLoad() {
    this.loadContracts()
    this.loadProjects()
  },

  onShow() {
    this.loadContracts()
    this.loadProjects()
  },

  buildFilter() {
    const d = this.data
    const filter = {}
    if (d.search) filter.search = d.search
    if (d.paymentStatusIndex > 0) filter.paymentStatus = d.paymentStatusOptions[d.paymentStatusIndex]
    return Object.keys(filter).length > 0 ? filter : null
  },

  loadContracts() {
    wx.showLoading({ title: '加载中' })
    wx.cloud.callFunction({
      name: 'contracts',
      data: { action: 'list', filter: this.buildFilter() },
      success: res => {
        wx.hideLoading()
        if (res.result && res.result.success) {
          const list = res.result.data || []
          this.setData({ contracts: list, total: list.length, page: 1 })
          this.calcStats(list)
          this.updatePagedData()
        } else {
          wx.showToast({ title: res.result?.message || '加载失败', icon: 'none' })
        }
      },
      fail: err => {
        wx.hideLoading()
        wx.showToast({ title: '网络错误', icon: 'none' })
        console.error(err)
      }
    })
  },

  loadProjects() {
    wx.cloud.callFunction({
      name: 'projects',
      data: { action: 'list' },
      success: res => {
        if (res.result && res.result.success) {
          this.setData({ projects: res.result.data || [] })
        }
      }
    })
  },

  calcStats(list) {
    const total = list.length
    const totalAmount = list.reduce((s, c) => s + (c.totalAmount || 0), 0)
    const received = list.filter(c => c.paymentStatus === '已回款').reduce((s, c) => s + (c.partialAmount || 0), 0)
    const partial = list.filter(c => c.paymentStatus === '部分回款').reduce((s, c) => s + (c.partialAmount || 0), 0)
    const pending = list.filter(c => c.paymentStatus === '未回款').reduce((s, c) => s + (c.totalAmount || 0), 0)
    this.setData({ stats: { total, totalAmount, received, partial, pending } })
  },

  updatePagedData() {
    const { contracts, page, pageSize } = this.data
    const start = (page - 1) * pageSize
    const pagedContracts = contracts.slice(start, start + pageSize)
    const totalPages = Math.max(1, Math.ceil(contracts.length / pageSize))
    this.setData({ pagedContracts, totalPages })
  },

  onSearchInput(e) { this.setData({ search: e.detail.value }) },
  onSearchConfirm() { this.loadContracts() },
  onPaymentStatusChange(e) {
    this.setData({ paymentStatusIndex: parseInt(e.detail.value) }, () => this.loadContracts())
  },
  clearFilters() {
    this.setData({ search: '', paymentStatusIndex: 0 }, () => this.loadContracts())
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
    const count = this.data.contracts.length + 1
    const year = new Date().getFullYear()
    const emptyItem = {
      clientContractNo: `HT-${year}-${String(count).padStart(3, '0')}`,
      customer: '', linkedProjects: 0, totalAmount: 0,
      paymentStatus: '未回款', invoiceDate: '未开票', paymentDate: '—',
      partialAmount: 0, contractPaymentMethod: '', actualPaymentMethod: '—',
      risk: '正常'
    }
    this.setData({ showEditModal: true, editingItem: emptyItem, riskIndex: 0 })
  },

  openEditModal(e) {
    const { id } = e.currentTarget.dataset
    const item = this.data.contracts.find(c => c._id === id)
    if (!item) return
    const riskIndex = this.data.riskOptions.indexOf(item.risk)
    this.setData({
      showEditModal: true, editingItem: { ...item },
      riskIndex: riskIndex >= 0 ? riskIndex : 0
    })
  },

  openViewModal(e) {
    const { id } = e.currentTarget.dataset
    const item = this.data.contracts.find(c => c._id === id)
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
  onPaymentStatusSelect(e) {
    const idx = parseInt(e.detail.value)
    const item = { ...this.data.editingItem }
    item.paymentStatus = this.data.paymentStatusOptions[idx]
    this.setData({ paymentStatusIndex: idx, editingItem: item })
  },

  saveContract() {
    const { editingItem } = this.data
    if (!editingItem.clientContractNo || !editingItem.customer) {
      wx.showToast({ title: '请填写合同号和客户', icon: 'none' })
      return
    }
    wx.showLoading({ title: '保存中' })
    const isNew = !editingItem._id
    const payload = isNew
      ? { action: 'add', data: editingItem }
      : { action: 'update', id: editingItem._id, data: editingItem }

    wx.cloud.callFunction({
      name: 'contracts',
      data: payload,
      success: res => {
        wx.hideLoading()
        if (res.result && res.result.success) {
          wx.showToast({ title: '保存成功', icon: 'success' })
          this.closeModal()
          this.loadContracts()
        } else {
          wx.showToast({ title: res.result?.message || '保存失败', icon: 'none' })
        }
      },
      fail: err => {
        wx.hideLoading()
        wx.showToast({ title: '保存失败', icon: 'none' })
        console.error(err)
      }
    })
  },

  confirmDelete() {
    const { deletingId } = this.data
    if (!deletingId) return
    wx.showLoading({ title: '删除中' })
    wx.cloud.callFunction({
      name: 'contracts',
      data: { action: 'delete', id: deletingId },
      success: res => {
        wx.hideLoading()
        if (res.result && res.result.success) {
          wx.showToast({ title: '删除成功', icon: 'success' })
          this.closeModal()
          this.loadContracts()
        } else {
          wx.showToast({ title: res.result?.message || '删除失败', icon: 'none' })
        }
      },
      fail: err => {
        wx.hideLoading()
        wx.showToast({ title: '删除失败', icon: 'none' })
        console.error(err)
      }
    })
  },

  goProjectManager() {
    wx.navigateTo({ url: '/pages/projectManager/index' })
  },

  getLinkedProjects(contractNo) {
    return this.data.projects.filter(p => p.clientContractNo === contractNo)
  },

  fmtCurrency(n) {
    return '¥' + (n || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }
})
