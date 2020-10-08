const { body } = require('express-validator/check')
const { wrapper, wrapAll } = require('./')

const plate = wrapper([
	body('plate').isLength({ min: 3 }).trim().escape().matches(/^[a-z\d\-\s]+$/i).customSanitizer(val => val.toUpperCase())
])

const put = wrapper([
	plate, body('temporary').isBoolean().toBoolean()
])

module.exports = { plate, put }
