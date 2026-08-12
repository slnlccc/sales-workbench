Page({
  data: {
    customers: [
      {
        id: 1,
        name: '上海航天设备有限公司',
        contact: '张经理',
        phone: '138****1234',
        email: 'zhang@shht.com',
        level: 'A',
        projects: [
          { id: 1, name: '长征十号乙环件', status: '生产中', progress: 75 },
          { id: 2, name: '发动机连接座', status: '待下料', progress: 10 }
        ],
        tags: ['航天', '重点客户'],
        remark: '长期合作客户，需求稳定'
      },
      {
        id: 2,
        name: '北京航空精密机械研究所',
        contact: '李主任',
        phone: '139****5678',
        email: 'li@bjaero.com',
        level: 'A',
        projects: [
          { id: 3, name: '高温合金叶片', status: '已发货', progress: 100 }
        ],
        tags: ['航空', '军工'],
        remark: '技术要求高，回款及时'
      },
      {
        id: 3,
        name: '江苏锻造集团有限公司',
        contact: '王总',
        phone: '137****9012',
        email: 'wang@jsdz.com',
        level: 'B',
        projects: [
          { id: 4, name: '大型锻件毛坯', status: '加工中', progress: 45 }
        ],
        tags: ['锻造', '批量'],
        remark: '价格敏感，注重交期'
      },
      {
        id: 4,
        name: '西安航空发动机集团',
        contact: '赵部长',
        phone: '136****3456',
        email: 'zhao@xaec.com',
        level: 'A',
        projects: [
          { id: 5, name: '涡轮盘锻件', status: '质检中', progress: 90 }
        ],
        tags: ['航空', '核心客户'],
        remark: '战略合作伙伴'
      }
    ],
    showCustomerModal: false,
    editingCustomer: null,
    showProjectModal: false,
    editingProject: null,
    customerIndex: -1,

    levelOptions: ['A', 'B', 'C'],
    statusOptions: ['待下料', '生产中', '加工中', '质检中', '已发货']
  },

  onLoad() {},

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

  saveCustomer() {
    const { editingCustomer, customerIndex } = this.data
    if (!editingCustomer.name.trim()) {
      wx.showToast({ title: '请输入客户名称', icon: 'none' })
      return
    }
    const customers = [...this.data.customers]
    if (customerIndex >= 0) {
      customers[customerIndex] = editingCustomer
    } else {
      editingCustomer.id = Date.now()
      customers.push(editingCustomer)
    }
    this.setData({ customers })
    wx.showToast({ title: '保存成功', icon: 'success' })
    this.closeModal()
  },

  saveProject() {
    const { editingProject, customerIndex, projectIndex } = this.data
    if (!editingProject.name.trim()) {
      wx.showToast({ title: '请输入项目名称', icon: 'none' })
      return
    }
    const customers = [...this.data.customers]
    const projects = [...customers[customerIndex].projects]
    if (projectIndex >= 0) {
      projects[projectIndex] = editingProject
    } else {
      editingProject.id = Date.now()
      projects.push(editingProject)
    }
    customers[customerIndex].projects = projects
    this.setData({ customers })
    wx.showToast({ title: '保存成功', icon: 'success' })
    this.closeModal()
  },

  deleteCustomer(e) {
    const { idx } = e.currentTarget.dataset
    wx.showModal({
      title: '确认删除',
      content: '删除后不可恢复',
      success: (res) => {
        if (res.confirm) {
          const customers = this.data.customers.filter((_, i) => i !== idx)
          this.setData({ customers })
          wx.showToast({ title: '删除成功', icon: 'success' })
        }
      }
    })
  },

  deleteProject(e) {
    const { cidx, pidx } = e.currentTarget.dataset
    wx.showModal({
      title: '确认删除',
      content: '删除后不可恢复',
      success: (res) => {
        if (res.confirm) {
          const customers = [...this.data.customers]
          customers[cidx].projects = customers[cidx].projects.filter((_, i) => i !== pidx)
          this.setData({ customers })
          wx.showToast({ title: '删除成功', icon: 'success' })
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