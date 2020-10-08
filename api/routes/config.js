const express = require('express')
const router = express.Router()

const { requireAdmin } = require('../middleware/protect')

router.get('/', async (req, res, next) => {

	return res.json({
		maintanance: {
			emoji: ':)',
			title: 'hello',
			body: 'were testing'
		}
	})
})

router.get('/admin', requireAdmin, async (req, res, next) => {

	return res.json({})
})

module.exports = router
