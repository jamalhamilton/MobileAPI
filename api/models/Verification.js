const { BaseModel } = require('./Base')
const { Model } = require('objection')

class Verification extends BaseModel {

	static get tableName () {
		return 'verifications'
	}

	static get hidden () {
		return []
	}

	static get relationMappings () {
		return {
			user: {
				relation: Model.HasOneRelation,
				modelClass: this.models.User,
				join: {
					from: 'verifications.userId',
					to: 'users.id'
				}
			}
		}
	}
}

module.exports = Verification
