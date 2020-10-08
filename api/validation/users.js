const { body } = require('express-validator/check')
const { wrapper, wrapAll } = require('./')

const patch = wrapper([
	body('name').trim().escape().isLength({ min: 1 })
])

module.exports = { patch }
