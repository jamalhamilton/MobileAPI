const express = require('express')
const router = express.Router()
const moment = require('moment')
const _ = require('lodash')

const { requireAdmin } = require('../middleware/protect')
const { checkRecipient, requireCompleteProfile, requireMatch } = require('../middleware/users')
const { APIError } = require('../modules/errors')
const NotificationServices = require('../services/notifications')

const chatController = require('../controllers/chat')
const chatSocket = require('../services/sockets/chat')

//
// -- Chat
//

// View our messages

router.get('/:id(\\d+)/', checkRecipient, requireMatch, async (req, res, next) => {

	const { Chat } = req.models
	const recipientId = req.params.id

	const messages = await Chat.query().participants(req.user.id, recipientId).where({ matchId: req.match.id }).orderBy('id', 'asc').limit(100)

	if (!messages) {
		return res.json([])
	}

	// Mark unread messages read (no need to await)

	const unreadMessages = messages.filter(m => m.toId === req.user.id && m.read === false)

	if (unreadMessages && unreadMessages.length > 0) {
		await Chat.query().whereIn('id', unreadMessages.map(m => m.id)).where({ matchId: req.match.id, toId: req.user.id }).whereNull('read').update({ read: 'CURRENT_TIMESTAMP' })
		messages.filter(m => m.toId === req.user.id).forEach(m => { m.read = true })
	}

	chatSocket.wss.sendToUser(recipientId, { action: 'read', sender: req.user.id })

	return res.json(messages || [])

})

// Send a message
// TODO: validators

router.post('/:id(\\d+)/', checkRecipient, requireMatch, async (req, res, next) => {

	// Send message

	const { Chat, Coin } = req.models
	const recipientId = req.params.id
	const myUser = req.user

	// Filters
	if (!req.user.plate) {
		throw new APIError(400, 'Messaging not available', { alert: { title: 'You can\'t send messages', message: 'You have to add your own plate before you can use this functionality' } })
	}

	const messageCount = await Chat.query().participants(myUser.id, recipientId).where({ matchId: req.match.id }).count('* as count').first()
	const isFirstMessage = messageCount.count === 0

	console.log(messageCount)

	if (isFirstMessage) {
		const transaction = await Coin.spendCoins(myUser, process.env.COINS_FIRST_MESSAGE, 'first-message') // TODO: Replace with Product class
		console.log('transaction', transaction)
		console.log(req.match)
		await req.match.$query().updateAndFetch({ sentMessage: true })
		console.log(req.match)
	}

	const savedChat = await Chat.query().insertAndFetch({ matchId: req.match.id, fromId: req.user.id, toId: recipientId, text: req.body.message })

	// return res.json({ sent: true, message: savedChat })

	res.json(savedChat)

	// TODO: Send notification

	chatSocket.wss.sendToUser(recipientId, { action: 'chat', sender: req.user.id, chat: savedChat })

})

router.get('/pending_request', requireCompleteProfile, async (req, res, next) => {
        const { Match } = req.models
	const myUser = req.user
        
	return res.json({
            chats: await chatController.grouped(req),
            pendingRequest: await Match
            .query()
            .eager('[matcherUser, chat]')
            .where({
                matchedId: myUser.id,
                status: 1
            })
            .orderBy('id', 'desc')
	})

})


// var chatConnections = []

// const { expressWs: wsInstance } = require('../../index')

// router.ws('/socket', (ws, res) => {

// 	ws.on('open', (conn) => {
// 		console.log('ws open', conn)
// 	})

// 	ws.on('close', (conn) => {
// 		console.log('ws close', conn)
// 	})

// 	ws.on('error', (conn) => {
// 		console.log('ws error', conn)
// 	})

// 	ws.on('unexpected-response', (conn) => {
// 		console.log('ws unex resp', conn)
// 	})

// 	ws.on('message', (msg) => {
// 		console.log('ws msg', msg)
// 	})

// 	res.json({ yay: true })
// })

module.exports = router
