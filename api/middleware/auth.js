const { APIError } = require('../modules/errors')
const jwt = require('jsonwebtoken')
const Sentry = require('@sentry/node')

// Tries parsing JWT token and setting req.user without
// throwing errors
// (should be called before model assigning middlewares)
async function parseToken (req, res, next) {

	const bearer = req.headers.authorization

	if (bearer) {
		try {
			const token = bearer.split(' ')[1]
			const decoded = jwt.verify(token, process.env.JWT_KEY)
			req.user = decoded
		} catch (err) { }
	}

	next()
}

// Parses JWT and throws error
async function verifyToken (req, res, next) {

	try {
		const token = req.headers.authorization.split(' ')[1]

		const userModel = req.models.UserMe

		req.user = await login(token, userModel)

		next()

	} catch (err) {
		throw new APIError(401, 'Invalid auth', { logout: true }, err)
	}
}

async function login (token, UserModel, unscoped) {

	try {

		const decoded = jwt.verify(token, process.env.JWT_KEY)

		if (!decoded) {
			throw new APIError(401, 'Invalid auth', { logout: true })
		}

		Sentry.configureScope(scope => scope.setUser(decoded))

		const userQuery = UserModel.query().findById(decoded.id)

		if (unscoped) {
			userQuery.unscoped().eager('[]')
		}

		let me = await userQuery
		// me.premium = true

		Sentry.configureScope(scope => scope.setUser(me))

		if (!me) {
			throw new APIError(404, 'User not found', { logout: true })
		}

		if (me.banned) {
			throw new APIError(403, 'User banned', { logout: true })
		}

		return me

	} catch (err) {
		throw new APIError(401, 'Invalid auth', { logout: true }, err)
	}
}

module.exports = { verifyToken, parseToken, login }
