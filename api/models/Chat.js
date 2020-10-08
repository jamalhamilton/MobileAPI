const { BaseModel, AdvancedQueryBuilder } = require('./Base')
const { Model } = require('objection')

class ChatQueryBuilder extends AdvancedQueryBuilder {

	participants (me, other) {

		const meId = me.id ? me.id : me
		const otherId = other.id ? other.id : other

		return this.where({ fromId: meId, toId: otherId }).orWhere({ fromId: otherId, toId: meId })
	}
}

class Chat extends BaseModel {

	static get tableName () {
		return 'chats'
	}

	static get visible () {
		return ['id', 'fromId', 'toId', 'otherId', 'from', 'to', 'other', 'text', 'read', 'sent', 'match']
	}

	getOthersId (me) {
		return [this.toId, this.fromId].find(id => id !== me.id)
	}

	getOther (me) {
		return [this.to, this.from].find(person => person && person.id !== me.id)
	}

	static get virtualAttributes () {
		return []
	}

	static get QueryBuilder () {
		return ChatQueryBuilder
	}

	static get relationMappings () {
		return {
			match: {
				relation: Model.HasOneRelation,
				modelClass: this.models.Match,
				join: {
					from: 'chats.matchId',
					to: 'matches.id'
				}
			},
			from: {
				relation: Model.HasOneRelation,
				modelClass: this.models.User,
				join: {
					from: 'chats.fromId',
					to: 'users.id'
				}
			},
			to: {
				relation: Model.HasOneRelation,
				modelClass: this.models.User,
				join: {
					from: 'chats.toId',
					to: 'users.id'
				}
			}
		}
	}
}

module.exports = Chat
