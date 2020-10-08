const express = require('express')
const router = express.Router()

const { requireAdmin } = require('../middleware/protect')

const CRUDRouter = require('../modules/crud')
const crud = new CRUDRouter('Coin', 'user')

router.get('/', requireAdmin, crud.findAll)
router.put('/', requireAdmin, crud.create)
router.get('/:id(\\d+)', requireAdmin, crud.findById)
router.patch('/:id(\\d+)', requireAdmin, crud.patch)

router.delete('/:id(\\d+)', requireAdmin, async (req, res, next) => {

	const { Coin } = req.models

	const results = await Coin.query().patchAndFetch(req.params.id, { invalidated: req.body })

	return res.json(results)

})

module.exports = router
