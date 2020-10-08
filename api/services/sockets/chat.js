const WebSocket = require('ws')
const jwt = require('jsonwebtoken')
const authMiddleware = require('../../middleware/auth')
const modelsMiddleware = require('../../middleware/models')

const Chat = require('../../models/Chat')

// just for the type safe code completion
let wss

// WS Setup

function setup (server, path) {

	const wss = new WebSocket.Server({
		server,
		path
	})

	// Connection handler

	wss.on('connection', function (ws) {

		// Basic handlers

		ws.on('message', toEvent)

		// TODO: test:
		ws.on('__message__', function (message) {
			if (!ws.user) {
				// TODO: Notify admins
				// BREACH
				console.warn('[socket] illegal! guest trying to send message!')
			}

			toEvent(message)
		})

		ws.on('close', function (code, reason) {
			console.log('[socket] client closed', code, reason, ws.guestId, ws.user && ws.user.id)
			// wss.showActiveUsers()
		})

		ws.on('error', function (err) {
			console.log('socket client err', err)
		})

		// Auth timeout to drop inactive/fake connections

		const authTimeout = 5000

		const checkAuthTimeout = setTimeout(() => {

			if (!ws.user && !ws.guestId) {
				ws.closeWithError(401, 'Auth timeout')
			}
		}, authTimeout)

		ws.json({ message: 'Waiting for authentication' })

		// Event handlers

		ws.on('authenticate', async function ({ token, guest }) {
			try {

				/*
					const models = modelsMiddleware.cloneCoreModels()

					Object.keys(models).forEach(key => {
						models[key].models = models
					})

					const user = await authMiddleware.login(token, models.UserMe, true)
				*/

				//
				// PROBLEM: Making db queries without express `req` is quite problematic the way the model system is built up
				// Temp solution: solely relying on the JWT payload's userId. For the current setup its enough. WS now only serves as an event stream
				//

				if (guest) {

					ws.guestId = token
					ws.user = null

					ws.json({ message: `Connected as guest#${ws.guestId}` })

					console.log(`[socket] 🔑 authenticated guest #${ws.guestId}`)

				} else {

					const decoded = jwt.verify(token, process.env.JWT_KEY)

					if (!decoded) {
						throw new Error(401)
					}

					ws.guestId = null
					ws.user = decoded

					ws.json({ message: `Connected as user#${ws.user.id}` })

					console.log(`[socket] 🔑 authenticated #${ws.user.id}`)

				}

				clearTimeout(checkAuthTimeout)
				// -> Maybe clear the auth timeout?

			} catch (err) {
				console.error(err)
				ws.closeWithError(401, 'Unauthorized')
			}
		})

		// WARN: UNSAFE - Match between the two users don't get checked. No harm when exploited
		ws.on('typing', async function (userId) {
			console.log(`[socket] user #${ws.user.id} typing to #${userId}...`)
			wss.sendToUser(userId, { action: 'typing', sender: ws.user.id })
		})

		// WARN: UNSAFE - Match between the two users don't get checked. No harm when exploited
		ws.on('enter', async function (userId) {
			console.log(`[socket] user #${ws.user.id} entered chat with #${userId}...`)
			wss.sendToUser(userId, { action: 'enter', sender: ws.user.id })
			wss.sendToUser(userId, { action: 'read', sender: ws.user.id })

			// TODO: mark the messages as read

			console.log('[socket] chat read update query has started?...')

			const results = await Chat.query().where({ fromId: userId, toId: ws.user.id }).update({
				read: 'CURRENT_TIMESTAMP'
			})

			console.log('[socket] chat read update after room enter event finished', results)
		})

		// WARN: UNSAFE - Match between the two users don't get checked. No harm when exploited
		ws.on('leave', async function (userId) {
			console.log(`[socket] user #${ws.user.id} left chat with #${userId}...`)
			wss.sendToUser(userId, { action: 'leave', sender: ws.user.id })
		})
	})

	wss.on('error', function (ws, error) {
		console.error('[socket] error', error, ws)
	})

	wss.on('listening', function (ws) {
		console.log('[socket] listening')
	})

	// setInterval(() => {
	// 	wss.showActiveUsers()
	// }, 10)

	// Server function
	wss.sendToUser = async function sendToUser (id, payload) {

		try {

			this.clients.forEach(ws => {

				// eslint-disable-next-line eqeqeq
				if (ws.user && ws.user.id == id && ws.readyState === ws.OPEN) {
					ws.send(JSON.stringify(payload))
				}
			})

		} catch (err) {
			console.error('[socket] error while sending to #' + id, err)
		}
	}

	wss.showActiveUsers = async function () {
		console.log('active users: ', wss.clients.size)
		console.log('- ', Array.from(wss.clients).map(c => c.user && c.user.name).filter(n => n).join(', '))
	}

	this.wss = wss
}

// Helpers, extensions

WebSocket.prototype.closeWithError = closeWithError
WebSocket.prototype.json = sendJSON

function closeWithError (code, error) {
	this.send(JSON.stringify({ error, code }))
	this.close()
}

function sendJSON (payload) {
	this.send(JSON.stringify(payload))
}

/* Convert every ws message to an event */
function toEvent (message) {

	if (process.env.NODE_ENV !== 'production') {
		console.log('[socket] received: %s', message)
	}

	try {
		var event = JSON.parse(message)
		this.emit(event.type, event.payload)
	} catch (err) {
		console.log('not an event', err)
	}
}

module.exports = { setup, wss }
