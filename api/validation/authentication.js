const { check, validationResult } = require('express-validator/check')
const { wrapper } = require('./')

module.exports.patch = wrapper([
	check('username').isEmail(),
	check('password').isLength({ min: 5 })
])

module.exports.email = wrapper([
	check('email').isEmail().trim(),
	check('password').isLength({ min: 1 })
])
