/* eslint-disable no-extend-native */
const express = require('express')
const router = express.Router()
const keysetPagination = require('objection-keyset-pagination')({ limit: 15, countTotal: true })

module.exports.grouped = async (req) => {

	if (req.user.premium) {
		return this.groupedEverybody(req)
	} else {
		return this.groupedMutualMatches(req)
	}
}

module.exports.groupedMutualMatches = async (req) => {

	const { Chat, Match } = req.models
	const me = req.user

	// Get people _I_ matched with
	const matches = await Match.query().eager('[complementaryMatches]').where({ matcherId: me.id }).whereNull('unmatchDate')
	const mutualMatchedUserIds = [...(new Set(matches.filter(m => m.mutual()).map(m => m.matchedId)))]
        let chats = [];
	let newChats = await /* keysetPagination( */Chat/* ) */
		.query()
		.eager('[from, to, match.[complementaryMatches]]')
		// .modifyEager('match.[complementaryMatches]', (query) => query.where('id', 8))
                .where(query => query.where('fromId', me.id).orWhere('toId', me.id))
		// .orWhere('matchId')
		/*comented on 22 july 2019
                 * .where(query =>
                    query
                    .where(subQuery => subQuery.whereIn('fromId', mutualMatchedUserIds).andWhere('toId', me.id))
                    .orWhere(subQuery => subQuery.where('fromId', me.id).whereIn('toId', mutualMatchedUserIds)))*/
		// .whereNotNull('match:complementaryMatches')
		.orderBy('id', 'desc')
		// .keysetPage({ first, last })
        newChats.forEach(chat => { 
            if(chat.match != null && chat.match.sentMessage == true && chat.match.status == 2){
                chats.push(chat);
            } 
        })
	chats = chats.filter(chat => chat.from && chat.to)
	chats.forEach(chat => { chat.other = chat.getOther(me) })
	chats = chats.reverse()

	// const grouped = Array.groupBy(chats, 'other')

	const allPeople = chats.map(c => c.other)
        //console.log(allPeople);
	const peopleIds = [...(new Set(allPeople.map(p => p.id)))]
	const people = peopleIds.map(id => allPeople.find(p => p.id === id))

	const grouped = people.map(p => ({ user: p, chats: chats.filter(c => c.other.id === p.id) }))
	grouped.forEach(row => { row.lastChat = row.chats[row.chats.length - 1] })

	const others = await this.usersWhoWroteMe(req)

	return {
            others: others.filter(other => !mutualMatchedUserIds.includes(other)).length,
            messages: grouped
	}
}

module.exports.groupedEverybody = async (req) => {

	const { Chat } = req.models
	const myUser = req.user

	let chats = await /* keysetPagination( */Chat/* ) */
		.query()
		.eager('[from, to, match.[complementaryMatches]]')
		// .modifyEager('match.[complementaryMatches]', (query) => query.where('id', 8))
		.where(query => query.where('fromId', myUser.id).orWhere('toId', myUser.id))
		// .whereNotNull('match:complementaryMatches')
		.orderBy('id', 'desc')
		// .keysetPage({ first, last })

	chats = chats.filter(chat => chat.from && chat.to)
	chats.forEach(chat => { chat.other = chat.getOther(myUser) })
	chats = chats.reverse()

	// const grouped = Array.groupBy(chats, 'other')

	const allPeople = chats.map(c => c.other)
	const peopleIds = [...(new Set(allPeople.map(p => p.id)))]
	const people = peopleIds.map(id => allPeople.find(p => p.id === id))

	const grouped = people.map(p => ({ user: p, chats: chats.filter(c => c.other.id === p.id) }))
	grouped.forEach(row => { row.lastChat = row.chats[row.chats.length - 1] })

	return {
		messages: grouped
	}
}

module.exports.usersWhoWroteMe = async (req) => {

	const { Chat } = req.models
	const me = req.user

	const chats = await Chat
		.query()
		.where(query => query.where('toId', me.id))

	const senders = [...(new Set(chats.map(chat => chat.fromId)))]

	return senders
}

// module.exports = router

Array.prototype.unique = function () {
	return this.filter((elem, pos, arr) => {
		return arr.indexOf(elem) === pos
	})
}

Array.groupBy = function (xs, key) {
	return xs.reduce(function (rv, x) {
		(rv[x[key]] = rv[x[key]] || []).push(x)
		return rv
	}, {})
}

// Array.groupBy = (list, keyGetter) => {
// 	const map = new Map()
// 	list.forEach((item) => {
// 		const key = keyGetter(item)
// 		const collection = map.get(key)
// 		if (!collection) {
// 			map.set(key, [item])
// 		} else {
// 			collection.push(item)
// 		}
// 	})
// 	return map
// }
