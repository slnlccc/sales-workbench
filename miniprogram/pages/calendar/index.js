Page({
  data: {
    currentYear: 2026,
    currentMonth: 7,
    today: '',
    selectedDate: '',
    calendarDays: [],
    schedules: [],
    daySchedules: [],

    showAddModal: false,
    newSchedule: { title: '', date: '', time: '', type: '待办' },
    typeOptions: ['待办', '会议', '出差', '提醒'],
    typeIndex: 0,

    showEditModal: false,
    editingSchedule: null
  },

  onLoad() {
    const now = new Date()
    this.setData({
      currentYear: now.getFullYear(),
      currentMonth: now.getMonth() + 1,
      today: this.formatDate(now),
      selectedDate: this.formatDate(now)
    })
    this.generateCalendar()
    this.loadSchedules()
  },

  onShow() {
    this.loadSchedules()
  },

  formatDate(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  },

  generateCalendar() {
    const { currentYear, currentMonth } = this.data
    const firstDay = new Date(currentYear, currentMonth - 1, 1)
    const lastDay = new Date(currentYear, currentMonth, 0)
    const startDay = firstDay.getDay()
    const totalDays = lastDay.getDate()

    const days = []
    for (let i = 0; i < startDay; i++) {
      days.push({ day: '', isCurrentMonth: false })
    }
    for (let i = 1; i <= totalDays; i++) {
      const date = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(i).padStart(2, '0')}`
      days.push({
        day: i,
        date,
        isCurrentMonth: true,
        isToday: date === this.data.today,
        hasSchedule: false
      })
    }
    this.setData({ calendarDays: days })
    this.updateScheduleMarks()
  },

  updateScheduleMarks() {
    const { schedules, calendarDays } = this.data
    const updatedDays = calendarDays.map(day => {
      if (!day.date) return day
      return {
        ...day,
        hasSchedule: schedules.some(s => s.date === day.date)
      }
    })
    this.setData({ calendarDays: updatedDays })
  },

  loadSchedules() {
    wx.cloud.callFunction({
      name: 'schedules',
      data: { action: 'list' },
      success: res => {
        if (res.result && res.result.success) {
          this.setData({ schedules: res.result.data || [] })
          this.updateScheduleMarks()
          this.loadDaySchedules()
        }
      }
    })
  },

  loadDaySchedules() {
    const daySchedules = this.data.schedules.filter(s => s.date === this.data.selectedDate)
    this.setData({ daySchedules })
  },

  prevMonth() {
    let { currentYear, currentMonth } = this.data
    currentMonth--
    if (currentMonth < 1) {
      currentMonth = 12
      currentYear--
    }
    this.setData({ currentYear, currentMonth })
    this.generateCalendar()
  },

  nextMonth() {
    let { currentYear, currentMonth } = this.data
    currentMonth++
    if (currentMonth > 12) {
      currentMonth = 1
      currentYear++
    }
    this.setData({ currentYear, currentMonth })
    this.generateCalendar()
  },

  selectDate(e) {
    const { date, day } = e.currentTarget.dataset
    if (!day) return
    this.setData({ selectedDate: date })
    this.loadDaySchedules()
  },

  goToday() {
    const now = new Date()
    this.setData({
      currentYear: now.getFullYear(),
      currentMonth: now.getMonth() + 1,
      selectedDate: this.formatDate(now)
    })
    this.generateCalendar()
    this.loadDaySchedules()
  },

  openAddModal() {
    this.setData({
      showAddModal: true,
      newSchedule: { title: '', date: this.data.selectedDate, time: '', type: '待办' },
      typeIndex: 0
    })
  },

  openEditModal(e) {
    const { id } = e.currentTarget.dataset
    const schedule = this.data.schedules.find(s => s._id === id)
    if (!schedule) return
    this.setData({
      showEditModal: true,
      editingSchedule: { ...schedule },
      typeIndex: this.data.typeOptions.indexOf(schedule.type)
    })
  },

  closeModal() {
    this.setData({ showAddModal: false, showEditModal: false })
  },

  onFieldChange(e) {
    const { field } = e.currentTarget.dataset
    const newSchedule = { ...this.data.newSchedule }
    newSchedule[field] = e.detail.value
    this.setData({ newSchedule })
  },

  onEditFieldChange(e) {
    const { field } = e.currentTarget.dataset
    const editingSchedule = { ...this.data.editingSchedule }
    editingSchedule[field] = e.detail.value
    this.setData({ editingSchedule })
  },

  onTypeChange(e) {
    const idx = parseInt(e.detail.value)
    const newSchedule = { ...this.data.newSchedule }
    newSchedule.type = this.data.typeOptions[idx]
    this.setData({ typeIndex: idx, newSchedule })
  },

  onEditTypeChange(e) {
    const idx = parseInt(e.detail.value)
    const editingSchedule = { ...this.data.editingSchedule }
    editingSchedule.type = this.data.typeOptions[idx]
    this.setData({ typeIndex: idx, editingSchedule })
  },

  saveSchedule() {
    const { newSchedule } = this.data
    if (!newSchedule.title.trim()) {
      wx.showToast({ title: '请输入标题', icon: 'none' })
      return
    }
    wx.cloud.callFunction({
      name: 'schedules',
      data: { action: 'add', data: { ...newSchedule, closed: false } },
      success: res => {
        if (res.result && res.result.success) {
          wx.showToast({ title: '添加成功', icon: 'success' })
          this.closeModal()
          this.loadSchedules()
        }
      }
    })
  },

  updateSchedule() {
    const { editingSchedule } = this.data
    if (!editingSchedule.title.trim()) {
      wx.showToast({ title: '请输入标题', icon: 'none' })
      return
    }
    wx.cloud.callFunction({
      name: 'schedules',
      data: { action: 'update', id: editingSchedule._id, data: editingSchedule },
      success: res => {
        if (res.result && res.result.success) {
          wx.showToast({ title: '修改成功', icon: 'success' })
          this.closeModal()
          this.loadSchedules()
        }
      }
    })
  },

  toggleClosed(e) {
    const { id } = e.currentTarget.dataset
    wx.cloud.callFunction({
      name: 'schedules',
      data: { action: 'toggleClosed', id },
      success: res => {
        if (res.result && res.result.success) {
          this.loadSchedules()
        }
      }
    })
  },

  deleteSchedule(e) {
    const { id } = e.currentTarget.dataset
    wx.showModal({
      title: '确认删除',
      content: '删除后不可恢复',
      success: (res) => {
        if (res.confirm) {
          wx.cloud.callFunction({
            name: 'schedules',
            data: { action: 'delete', id },
            success: res => {
              if (res.result && res.result.success) {
                wx.showToast({ title: '删除成功', icon: 'success' })
                this.loadSchedules()
              }
            }
          })
        }
      }
    })
  },

  stopPropagation() {}
})