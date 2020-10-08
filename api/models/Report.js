const { BaseModel } = require('./Base')
const { Model, QueryBuilder } = require('objection')

class Report extends BaseModel {

	static get tableName () {
		return 'reports'
	}

	static get relationMappings () {
		return {
			user: {
				relation: Model.HasOneRelation,
				modelClass: this.models.User,
				join: {
					from: 'reports.userId',
					to: 'users.id'
				}
			}
		}
	}
}

module.exports = Report
