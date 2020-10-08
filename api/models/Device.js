const { BaseModel } = require('./Base')
const { Model, QueryBuilder } = require('objection')

class Device extends BaseModel {

	static get tableName () {
		return 'devices'
	}

	static get relationMappings () {
		return {
			user: {
				relation: Model.HasOneRelation,
				modelClass: this.models.User,
				join: {
					from: 'devices.userId',
					to: 'users.id'
				}
			}
		}
	}
}

module.exports = Device
