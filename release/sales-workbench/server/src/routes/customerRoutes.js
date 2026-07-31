const express = require('express')
const router = express.Router()
const { getCustomers, getCustomer, createCustomer, updateCustomer, deleteCustomer, addProject, updateProject, deleteProject } = require('../controllers/customerController')
const { protect } = require('../middleware/auth')

router.route('/').get(protect, getCustomers).post(protect, createCustomer)
router.route('/:id').get(protect, getCustomer).put(protect, updateCustomer).delete(protect, deleteCustomer)
router.post('/:id/projects', protect, addProject)
router.put('/:id/projects', protect, updateProject)
router.delete('/:id/projects/:projectId', protect, deleteProject)

module.exports = router