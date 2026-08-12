const express = require('express')
const router = express.Router()
const { getContracts, getContract, createContract, updateContract, deleteContract, getLinkedProjects } = require('../controllers/contractController')
const { protect } = require('../middleware/auth')

router.route('/').get(protect, getContracts).post(protect, createContract)
router.route('/:id').get(protect, getContract).put(protect, updateContract).delete(protect, deleteContract)
router.get('/:id/projects', protect, getLinkedProjects)

module.exports = router