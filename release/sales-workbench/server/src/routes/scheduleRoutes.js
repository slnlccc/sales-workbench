const express = require('express')
const router = express.Router()
const { getSchedules, getSchedule, createSchedule, updateSchedule, deleteSchedule, toggleClosed } = require('../controllers/scheduleController')
const { protect } = require('../middleware/auth')

router.route('/').get(protect, getSchedules).post(protect, createSchedule)
router.route('/:id').get(protect, getSchedule).put(protect, updateSchedule).delete(protect, deleteSchedule)
router.post('/:id/toggle', protect, toggleClosed)

module.exports = router