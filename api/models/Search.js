const { BaseModel } = require('./Base')
const { Model, QueryBuilder } = require('objection')

class Search extends BaseModel {

	static get tableName () {
		return 'searches'
	}

	static get visible () {
		return ['id', 'plate', 'user', 'match', 'matchedUser', 'matchedPlate', 'created', 'sentRequest', 'status', 'searchcount', 'searchdate']
	}

	static get defaultEager () {
		return '[user.[plate]]'
	}

	static get virtualAttributes () {
		return ['user', 'match', 'matchedUser', 'matchedPlate']
	}

	static get relationMappings () {
		return {
			user: {
				relation: Model.HasOneRelation,
				modelClass: this.models.User,
				join: {
					from: 'searches.userId',
					to: 'users.id'
				}
			},
			match: {
				relation: Model.HasOneRelation,
				modelClass: this.models.Match,
				join: {
					from: 'searches.matchId',
					to: 'matches.id'
				}
			},
			matchedUser: {
				relation: Model.HasOneRelation,
				modelClass: this.models.User,
				join: {
					from: 'searches.matchedUserId',
					to: 'users.id'
				}
			},
			matchedPlate: {
				relation: Model.HasOneRelation,
				modelClass: this.models.Plate,
				join: {
					from: 'searches.matchedPlateId',
					to: 'plates.id'
				}
			}
		}
	}
}

module.exports = Search
