const { schedules, auth } = require('../../utils/api.js')

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
    if (!auth.isLoggedIn()) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      setTimeout(() => wx.reLaunch({ url: '/pages/index/index' }), 800)
      return
    }
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
    if (!auth.isLoggedIn()) return
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

  async loadSchedules() {
    try {
      const res = await schedules.list()
      const list = res.data || res.schedules || []
      const normalized = list.map(s => ({ ...s, _id: s._id || s.id }))
      this.setData({ schedules: normalized })
      this.updateScheduleMarks()
      this.loadDaySchedules()
    } catch (e) {}
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

  async saveSchedule() {
    const { newSchedule } = this.data
    if (!newSchedule.title.trim()) {
      wx.showToast({ title: '请输入标题', icon: 'none' })
      return
    }
    if (!newSchedule.date) {
      wx.showToast({ title: '请选择日期', icon: 'none' })
      return
    }
    wx.showLoading({ title: '保存中' })
    try {
      await schedules.create({ ...newSchedule, closed: false })
      wx.hideLoading()
      wx.showToast({ title: '已同步到云端', icon: 'success' })
      this.closeModal()
      this.loadSchedules()
    } catch (e) {
      wx.hideLoading()
      const msg = e?.message || e?.data?.message || '保存失败，请检查网络或重试'
      console.error('[calendar] saveSchedule error', e)
      wx.showToast({ title: msg, icon: 'none' })
    }
  },

  async updateSchedule() {
    const { editingSchedule } = this.data
    if (!editingSchedule.title.trim()) {
      wx.showToast({ title: '请输入标题', icon: 'none' })
      return
    }
    if (!editingSchedule.date) {
      wx.showToast({ title: '请选择日期', icon: 'none' })
      return
    }
    wx.showLoading({ title: '保存中' })
    try {
      const payload = { ...editingSchedule }
      delete payload._id
      await schedules.update(editingSchedule._id, payload)
      wx.hideLoading()
      wx.showToast({ title: '修改成功，已同步', icon: 'success' })
      this.closeModal()
      this.loadSchedules()
    } catch (e) {
      wx.hideLoading()
      const msg = e?.message || e?.data?.message || '修改失败，请检查网络或重试'
      console.error('[calendar] updateSchedule error', e)
      wx.showToast({ title: msg, icon: 'none' })
    }
  },

  async toggleClosed(e) {
    const { id } = e.currentTarget.dataset
    try {
      await schedules.toggle(id)
      this.loadSchedules()
    } catch (e) {
      const msg = e?.message || e?.data?.message || '切换失败'
      console.error('[calendar] toggleClosed error', e)
      wx.showToast({ title: msg, icon: 'none' })
    }
  },

  async deleteSchedule(e) {
    const { id } = e.currentTarget.dataset
    wx.showModal({
      title: '确认删除',
      content: '删除后不可恢复',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中' })
          try {
            await schedules.del(id)
            wx.hideLoading()
            wx.showToast({ title: '删除成功，已同步', icon: 'success' })
            this.loadSchedules()
          } catch (e) {
            wx.hideLoading()
            const msg = e?.message || e?.data?.message || '删除失败，请检查网络或重试'
            console.error('[calendar] deleteSchedule error', e)
            wx.showToast({ title: msg, icon: 'none' })
          }
        }
      }
    })
  },

  stopPropagation() {}
})
