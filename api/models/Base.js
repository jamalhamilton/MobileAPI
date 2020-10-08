const { mixin, Model, QueryBuilder } = require('objection')
const _ = require('lodash')
const moment = require('moment')

class AdvancedQueryBuilder extends QueryBuilder {

	execute () {
		const { unscoped } = this.context()
		if (!unscoped) {
			const { defaultEager } = this.modelClass()
			if (defaultEager) {
				this.mergeContext({ unscoped: false })
				this.mergeEager(defaultEager)
			}
		}
		return super.execute()
	}

	unscoped () {
		return this.mergeContext({ unscoped: true })
	}
/*
	modifyFields (key, fields, clear) {

		console.log(this.modelClass().constructor.virtualAttributes)

		if (clear) {
			this[key] = null
		}
		this[key] = [ ...(this[key] || []), ...(fields || []) ]
		return this
	}

	exposeFields (fields, clear) {
		return this.modifyFields('visible', fields, clear)
	}

	hideFields (fields, clear) {
		return this.modifyFields('hidden', fields, clear)
	}

	virtualAttributeFields (fields, clear) {
		return this.modifyFields('virtualAttributes', fields, clear)
	}
*/
}

class BaseModel extends Model {

	static get defaultEager () {
		return null
	}

	static get useLimitInFirst () {
		return true
	}

	static get QueryBuilder () {
		return AdvancedQueryBuilder
	}

	$parseDatabaseJson (json) {
		json = super.$parseDatabaseJson(json)

		Object.keys(json).forEach(prop => {
			const value = json[prop]

			if (value instanceof Date) {
				json[prop] = moment(value).toISOString(true)
			}
		})

		return json
	}
}

function limitModelMixin (model) {

	// return class extends mixin(model, [visibilityPlugin]) { }

	return class extends model {
		$formatJson (json) {
			let superJson = super.$formatJson(json)

			const conf = this.constructor

			if (!conf.hidden && !conf.visible) {
				return superJson
			}
			if (conf.visible) {
				superJson = _.pick(superJson, conf.visible)
			}
			if (conf.hidden) {
				superJson = _.omit(superJson, conf.hidden)
			}
			return superJson
		}
	}

}

module.exports = { BaseModel, limitModelMixin, AdvancedQueryBuilder }
