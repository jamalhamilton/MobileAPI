const { BaseModel } = require('./Base')
const { Model, QueryBuilder } = require('objection')

class Invite extends BaseModel {

	static get tableName () {
		return 'invites'
	}

	static get visible () {
		return ['inviteCode', 'redeemedCode', 'invitedBy']
	}

	static get virtualAttributes () {
		return ['user', 'invitedBy']
	}

	static get defaultEager () {
		return '[invitedBy]'
	}

	static get relationMappings () {
		return {
			user: {
				relation: Model.HasOneRelation,
				modelClass: this.models.User,
				join: {
					from: 'invites.userId',
					to: 'users.id'
				}
			},
			invitedBy: {
				relation: Model.HasOneRelation,
				modelClass: this.models.User,
				join: {
					from: 'invites.inviterId',
					to: 'users.id'
				}
			}
		}
	}
}

module.exports = Invite
