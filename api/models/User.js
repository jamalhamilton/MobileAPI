const { BaseModel } = require('./Base')
const { Model, QueryBuilder } = require('objection')
const moment = require('moment')
const _ = require('lodash')
const { APIError } = require('../modules/errors')

class User extends BaseModel {

	static get tableName () {
		return 'users'
	}

	static get defaultEager () {
		// return '[coinSum]'
		return null
	}

	// static get hidden () {
	// 	return ['type', 'social', 'email', 'birthYear', 'lastWatch', 'phone', 'hidden', 'created', 'updated']
	// }

	static get visible () {

		return ['id', 'name', 'photo', 'gender', 'age']
	}

	$formatDatabaseJson (json) {
		json = super.$formatDatabaseJson(json)

		json.preference = JSON.stringify(json.preference)

		return json
	}

	$formatJson (json) {

		json = super.$formatJson(json)

		delete json.coinSum
		// delete json.preferenceAge
		// delete json.preferenceGender

		return json
	}

	generateInviteCode () {

		const normalized = `${this.firstName}${this.lastName}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').match(/\b(\w+)\b/g).join('').toUpperCase().substring(0, 8)
		const numbers = _.random(1000, 9999, false)
		const code = `${normalized}${numbers}`
		return code
	}

	// get photo () {
	// 	if (!this.social) {
	// 		return null
	// 	}
	// 	return 'https://twitter.com/' + this.social + '/profile_image?size=original'
	// }

	get name () {
		if (!this.firstName) {
			return null
		}
		return `${this.firstName} ${(this.lastName || '')}`.trim()
	}

	get relationship () {
		return UserRelationship.NOTHING
	}

	get age () {
		if (!this.birthday) {
			return undefined
		}
		return moment().diff(moment(this.birthday), 'years')
	}

	get coins () {
		if (!this.coinSum) {
			return undefined
		}
		return parseInt(Object.values(this.coinSum)[0])

		// return this.coinList.reduce((sum, coin) => sum + coin.value, 0)
	}

	get profileReady () {
		return !(!this.preference || !this.gender)
	}

	get verified () {
		return this.verification && this.verification.verified
	}

	static get virtualAttributes () {
		return ['name', 'photo', 'age', 'coins', 'preference', 'plate', 'verified', 'verification']
	}

	static get relationMappings () {
		return {

			coinSum: {
				relation: Model.HasOneRelation,
				modelClass: this.models.Coin,
				join: {
					from: 'coins.userId',
					to: 'users.id'
				},
				modify: builder => {
					builder.sum('value')
				}
			},
			coins: {
				relation: Model.HasManyRelation,
				modelClass: this.models.Coin,
				join: {
					from: 'coins.userId',
					to: 'users.id'
				}
			},
			plate: {
				relation: Model.HasOneRelation,
				modelClass: this.models.Plate,
				join: {
					from: 'users.id',
					to: 'plates.userId'
				},
				modify: (query) => {
					query.orderBy('id', 'desc').whereNull('inactive')
				}
			},
			verification: {
				relation: Model.HasOneRelation,
				modelClass: this.models.Verification,
				join: {
					from: 'users.id',
					to: 'verifications.userId'
				}
			},
			invite: {
				relation: Model.HasOneRelation,
				modelClass: this.models.Invite,
				join: {
					from: 'users.id',
					to: 'invites.userId'
				}
			}
		}
	}

	/* get preference () {

		const ageBase =
		this.preferenceAge && parseInt(this.preferenceAge)
			? Math.floor(parseInt(this.preferenceAge) / 10) * 10
			: null

		return {
			age: !ageBase ? null : [
				Math.max(ageBase, 18),
				Math.min(ageBase + 10, 99)
			],
			gender: this.preferenceGender
		}
	} */

	matchesPreference (userModel) {

		if (!userModel) {
			return false
		}

		const preference = this.preference

		if (preference.age && (preference.age[0] < userModel.age || preference.age[1] > userModel.age)) {
			return false
		}

		if (preference.gender && preference.gender !== userModel.gender) {
			return false
		}

		return true
	}

	isMe (userModel) {
		if (!userModel) {
			return null
		}
		return userModel.id === this.id
	}
}

class UserMe extends User {

	static get visible () {
		return ['id', 'name', 'firstName', 'lastName', 'photo', 'gender', 'birthday', 'age', 'limited', 'coins', 'preference', 'plate', 'verified', 'invite']
	}

	static get defaultEager () {
		return '[coinSum, plate, verification, invite]'
	}

	$parseDatabaseJson (json) {
		json = super.$parseDatabaseJson(json)

		json.birthday = json.birthday && moment(json.birthday).format('YYYY-MM-DD')

		return json
	}
}

const UserRelationship = {
	ME: 0,
	MATCHED: 1,
	NOTHING: 2
}

module.exports = { User, UserMe, UserRelationship }
