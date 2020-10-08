const { APIError } = require('../modules/errors')

module.exports.requireAdmin = async function (req, res, next) {

	if (!req.user || !req.user.admin) {
		throw new APIError(403, 'Not authorized')
	}

	next()
}
