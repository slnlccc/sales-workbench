const { contracts, projects, auth } = require('../../utils/api.js')

Page({
  data: {
    contracts: [],
    pagedContracts: [],
    projects: [],

    search: '',
    paymentStatusIndex: 0,
    paymentStatusOptions: ['全部回款状态', '未回款', '部分回款', '已回款'],

    editPaymentStatusIndex: 0,
    editPaymentStatusOptions: ['未回款', '部分回款', '已回款'],

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
    if (!auth.isLoggedIn()) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      setTimeout(() => wx.reLaunch({ url: '/pages/index/index' }), 800)
      return
    }
    this.loadContracts()
    this.loadProjects()
  },

  onShow() {
    if (!auth.isLoggedIn()) return
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

  async loadContracts() {
    wx.showLoading({ title: '加载中' })
    try {
      const res = await contracts.list(this.buildFilter())
      const list = res.data || res.contracts || []
      const normalized = list.map(c => ({ ...c, _id: c._id || c.id }))
      this.setData({ contracts: normalized, total: normalized.length, page: 1 })
      this.calcStats(normalized)
      this.updatePagedData()
      wx.hideLoading()
    } catch (e) {
      wx.hideLoading()
    }
  },

  async loadProjects() {
    try {
      const res = await projects.list()
      const list = res.data || res.projects || []
      this.setData({ projects: list })
    } catch (e) {}
  },

  calcStats(list) {
    const total = list.length
    const totalAmount = list.reduce((s, c) => s + (Number(c.totalAmount) || 0), 0)
    const received = list.filter(c => c.paymentStatus === '已回款').reduce((s, c) => s + (Number(c.totalAmount) || 0), 0)
    const partial = list.filter(c => c.paymentStatus === '部分回款').reduce((s, c) => s + (Number(c.partialAmount) || 0), 0)
    const pending = list.filter(c => c.paymentStatus === '未回款').reduce((s, c) => s + (Number(c.totalAmount) || 0), 0)
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
    this.setData({
      showEditModal: true,
      editingItem: emptyItem,
      riskIndex: 0,
      editPaymentStatusIndex: 0
    })
  },

  openEditModal(e) {
    const { id } = e.currentTarget.dataset
    const item = this.data.contracts.find(c => c._id === id)
    if (!item) return
    const riskIndex = this.data.riskOptions.indexOf(item.risk)
    const editPaymentStatusIndex = Math.max(0, this.data.editPaymentStatusOptions.indexOf(item.paymentStatus))
    this.setData({
      showEditModal: true, editingItem: { ...item },
      riskIndex: riskIndex >= 0 ? riskIndex : 0,
      editPaymentStatusIndex
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
    item.paymentStatus = this.data.editPaymentStatusOptions[idx]
    this.setData({ editPaymentStatusIndex: idx, editingItem: item })
  },

  async saveContract() {
    const { editingItem } = this.data
    if (!editingItem.clientContractNo || !editingItem.customer) {
      wx.showToast({ title: '请填写合同号和客户', icon: 'none' })
      return
    }
    wx.showLoading({ title: '保存中' })
    try {
      const isNew = !editingItem._id
      const payload = { ...editingItem }
      delete payload._id
      if (isNew) {
        await contracts.create(payload)
      } else {
        await contracts.update(editingItem._id, payload)
      }
      wx.hideLoading()
      wx.showToast({ title: '保存成功，已同步到云端', icon: 'success' })
      this.closeModal()
      this.loadContracts()
    } catch (e) {
      wx.hideLoading()
      const msg = e?.message || e?.data?.message || '保存失败，请检查网络或重试'
      console.error('[contractManager] saveContract error', e)
      wx.showToast({ title: msg, icon: 'none' })
    }
  },

  async confirmDelete() {
    const { deletingId } = this.data
    if (!deletingId) return
    wx.showLoading({ title: '删除中' })
    try {
      await contracts.del(deletingId)
      wx.hideLoading()
      wx.showToast({ title: '删除成功，已同步到云端', icon: 'success' })
      this.closeModal()
      this.loadContracts()
    } catch (e) {
      wx.hideLoading()
      const msg = e?.message || e?.data?.message || '删除失败，请检查网络或重试'
      console.error('[contractManager] confirmDelete error', e)
      wx.showToast({ title: msg, icon: 'none' })
    }
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
