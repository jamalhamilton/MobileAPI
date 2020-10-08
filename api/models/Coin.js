const { BaseModel } = require('./Base')
const { Model, QueryBuilder } = require('objection')

const { APIError } = require('../modules/errors')

class Coin extends BaseModel {

	static get tableName () {
		return 'coins'
	}

	static get hidden () {
		return []
	}

	static get modifiers () {
		return {
			valid: (builder) => builder.whereNull('invalidated'),
			sum: (builder) => builder.sum('value')
		}
	}

	static get relationMappings () {
		return {
			user: {
				relation: Model.HasOneRelation,
				modelClass: this.models.User,
				join: {
					from: 'coins.userId',
					to: 'users.id'
				}
			}
		}
	}

	static async spendCoins (user, amount, type) {

		if (!user || parseInt(user.coins) == null || parseInt(amount) == null || type == null) {
			throw new APIError(500, 'Error while processing coins', {}, null, { user, amount, type })
		}

		if (user.coins < amount) {
			console.log(`💸 Transaction failed: User "${user.name}" (#${user.id}) has ${user.coins} and is too broke to spent ${amount} coins on [${type}]`)
			throw new APIError(403, 'Insufficient coins')
		}

		const transaction = await this.query().insert({ userId: user.id, value: amount * -1, type })

		console.log(`💸 Transaction complete: User "${user.name}" (#${user.id}) spent ${amount} coins on [${type}]`)

		return transaction
	}
}

module.exports = Coin
