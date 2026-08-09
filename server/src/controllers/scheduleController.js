const Schedule = require('../models/Schedule');

// @desc    Get all schedules for current user
// @route   GET /api/schedules
// @access  Private
exports.getSchedules = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const filter = { userId: req.user._id };
    if (startDate) filter.date = { ...filter.date, $gte: startDate };
    if (endDate) filter.date = { ...filter.date, $lte: endDate };
    if (startDate && endDate) filter.date = { $gte: startDate, $lte: endDate };
    else if (startDate) filter.date = { $gte: startDate };
    else if (endDate) filter.date = { $lte: endDate };

    const schedules = await Schedule.find(filter).sort({ date: 1, startTime: 1 });
    res.status(200).json({
      success: true,
      count: schedules.length,
      data: schedules
    });
  } catch (err) {
    console.error('Error in getSchedules:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get single schedule (ownership enforced)
// @route   GET /api/schedules/:id
// @access  Private
exports.getSchedule = async (req, res) => {
  try {
    const schedule = await Schedule.findOne({ _id: req.params.id, userId: req.user._id });
    if (!schedule) return res.status(404).json({ message: '日程不存在' });
    res.status(200).json({ success: true, data: schedule });
  } catch (err) {
    console.error('Error in getSchedule:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Create schedule
// @route   POST /api/schedules
// @access  Private
exports.createSchedule = async (req, res) => {
  try {
    const {
      title, date, startTime, endTime, location, participants,
      reminder, category, description, customerId, customerName,
      products, attachments, closed, source
    } = req.body;

    if (!title) return res.status(400).json({ message: '标题必填' });
    if (!date) return res.status(400).json({ message: '日期必填' });
    if (!startTime) return res.status(400).json({ message: '开始时间必填' });

    const schedule = new Schedule({
      userId: req.user._id,
      title, date, startTime, endTime: endTime || null,
      location: location || '', participants: participants || [],
      reminder: reminder || '无', category: category || '工作',
      description: description || '', customerId: customerId || null,
      customerName: customerName || '', products: products || [],
      attachments: attachments || [], closed: !!closed, source: source || 'manual'
    });

    await schedule.save();
    res.status(201).json({ success: true, data: schedule });
  } catch (err) {
    console.error('Error in createSchedule:', err);
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(v => v.message);
      return res.status(400).json({ message: errors.join('; ') });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update schedule (ownership enforced)
// @route   PUT /api/schedules/:id
// @access  Private
exports.updateSchedule = async (req, res) => {
  try {
    let schedule = await Schedule.findOne({ _id: req.params.id, userId: req.user._id });
    if (!schedule) return res.status(404).json({ message: '日程不存在' });
    const fields = ['title', 'date', 'startTime', 'endTime', 'location',
      'participants', 'reminder', 'category', 'description',
      'customerId', 'customerName', 'products', 'attachments', 'closed', 'source'];
    fields.forEach(f => {
      if (req.body[f] !== undefined) schedule[f] = req.body[f];
    });
    await schedule.save();
    res.status(200).json({ success: true, data: schedule });
  } catch (err) {
    console.error('Error in updateSchedule:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete schedule (ownership enforced)
// @route   DELETE /api/schedules/:id
// @access  Private
exports.deleteSchedule = async (req, res) => {
  try {
    const schedule = await Schedule.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!schedule) return res.status(404).json({ message: '日程不存在' });
    res.status(200).json({ success: true, message: '删除成功' });
  } catch (err) {
    console.error('Error in deleteSchedule:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Toggle closed status (ownership enforced)
// @route   PATCH /api/schedules/:id/toggle-closed
// @access  Private
exports.toggleClosed = async (req, res) => {
  try {
    const schedule = await Schedule.findOne({ _id: req.params.id, userId: req.user._id });
    if (!schedule) return res.status(404).json({ message: '日程不存在' });
    schedule.closed = !schedule.closed;
    await schedule.save();
    res.status(200).json({ success: true, data: schedule });
  } catch (err) {
    console.error('Error in toggleClosed:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
