const { validationResult } = require('express-validator/check')
const { APIError } = require('../modules/errors')

const wrapper = function (validators, limitedValidators) {

	let returnLimited = false

	return [

		function (req, res, next) {
			returnLimited = req.user && req.user.admin
			next()
		},

		...(returnLimited ? limitedValidators : validators),

		function (req, res, next) {
			const errors = validationResult(req)

			if (!errors.isEmpty()) {
				throw new APIError(400, 'Bad request', {}, 'Validation error', errors.array())
			}

			next()
		}

	]
}

const wrapAll = function (obj) {

	Object.keys(obj).forEach(key => {
		obj[key] = wrapper(obj[key])
	})

	return obj
}

module.exports = { wrapper, wrapAll }
