const express = require('express')
const router = express.Router()

const { requireAdmin } = require('../middleware/protect')

const CRUDRouter = require('../modules/crud')
const crud = new CRUDRouter('Report')

router.get('/', requireAdmin, crud.findAll)
router.put('/', requireAdmin, crud.create)
router.get('/:id(\\d+)', requireAdmin, crud.findById)
router.patch('/:id(\\d+)', requireAdmin, crud.patch)

router.post('/', async (req, res, next) => {

	const { Report } = req.models
	const { concern, userId } = req.body

	const results = await Report.query().insertAndFetch({ userId, concern, senderId: req.user.id })

	return res.json(results)

})

module.exports = router
