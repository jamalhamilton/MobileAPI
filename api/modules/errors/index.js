
/* export function APIError (status = 500, message = 'Server Error', options = {}, technicalError = new Error()) {

	return {
		status,
		error: message,
		technicalError,
		...options
	}
} */

class APIError extends Error {
	constructor (status = 500, message = 'Server Error', options = {}, error, details = {}) {
		super(error || message)
		this.status = status
		// this.code = status
		this.error = message
		this.options = options || {}
		this.details = details

		// Didnt find a cleaner solution
		// Object.keys(options).forEach(key => { this[key] = options[key] })
	}
}

class ServerError extends APIError {
	constructor (error, details = {}, options = {}) {
		super(500, 'Server Error', options, error, details)
	}
}

const Sentry = require('@sentry/node')
const config = require('../../../package.json')

function handle (app) {

	// 404 Not Found
	app.use((req, res, next) => {
		const error = new APIError(404, 'Not found')
		next(error)
	})

	// 500 Server Error
	app.use((error, req, res, next) => {

		// UNUSED: .silent is never assigned
		if (error.silent !== true) {
			console.error(error)
		}

		// if (error.name === 'ValidationError') {
		// 	error.error = 'Bad request'
		// 	error.status = 400
		// }

		const errorId = Sentry.captureException(error)

		console.log(error)

		return res.status(error.status || 500).json({
			error: error.error || 'Server Error',
			code: error.status || 500,
			...(process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'testing' || (req.user && req.user.admin)) && {
				technicalError: error.message,
				errorId: errorId,
				fullError: error,
				otherDetails: error.details,
				stack: error.stack
			},
			...error.options
		})

		/* return res.status(error.status || 500).json({
			error: error.error || 'Server Error',
			code: error.status || 500,
			...(process.env.NODE_ENV === 'development' || (req.user && req.user.admin)) && {
				errorId: errorId,
				...error,
				stack: error.stack
			},
			...error.options
		}) */
	})
}

function preventEmptyResponsesMiddleware (req, res, next) {

	const send = res.send
	res.send = function (body) {

		if (!body) {
			throw new APIError(404, 'Not found', {}, 'Empty response')
		}

		send.apply(this, arguments)
	}
	next()
}

function initSentry () {

	Sentry.init({
		release: `${config.name}@${config.version}`,
		environment: process.env.NODE_ENV,
		attachStacktrace: true,
		debug: false,
		dsn: 'https://5c428639faee4dfaaa1768b42982f17a@sentry.io/1510136'
	})

	return Sentry
}

module.exports = { APIError, ServerError, handle, initSentry, preventEmptyResponsesMiddleware }
