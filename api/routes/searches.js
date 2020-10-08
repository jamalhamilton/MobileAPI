const express = require('express')
const router = express.Router()

const { requireAdmin } = require('../middleware/protect')

const CRUDRouter = require('../modules/crud')
const crud = new CRUDRouter('Search')

router.get('/', requireAdmin, crud.findAll)
router.put('/', requireAdmin, crud.create)
router.get('/:id(\\d+)', requireAdmin, crud.findById)
router.patch('/:id(\\d+)', requireAdmin, crud.patch)
router.delete('/:id(\\d+)', requireAdmin, crud.deleteById)

module.exports = router
