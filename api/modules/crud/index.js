class CRUDRouter {

	constructor (model, eager) {
		this._model = model
		this._eager = eager
	}

	// Functions

	getModel (req) {
		if (typeof this._model === 'string') {
			return req.models[this._model]
		} else {
			return this._model
		}
	}

	getEager (route) {

		if (typeof this._eager === 'string') {
			return this._eager
		} else if (this._eager && this._eager[route]) {
			return this._eager[route]
		} else {
			return this._eager
		}
	}

	// Routes

	get findById () {
		return async (req, res, next) => {

			const model = this.getModel(req)

			const result = await model.query().findById(req.params.id).eager(this.getEager('findById'))

			return res.json(result)
		}
	}

	get findAll () {
		return async (req, res, next) => {

			const { buildFilter } = require('objection-filter')
			const model = this.getModel(req)

			const filter = req.query.filter ? JSON.parse(req.query.filter) : {}

			const results = await buildFilter(model).build(filter).eager(this.getEager('findAll'))

			return res.json(results)
		}
	}

	get create () {
		return async (req, res, next) => {

			const model = this.getModel(req)

			const results = await model.query().insertAndFetch(req.body).eager(this.getEager('create'))

			return res.status(201).json(results)
		}
	}

	get patch () {
		return async (req, res, next) => {

			const model = this.getModel(req)

			const results = await model.query().patchAndFetch(req.params.id, req.body).eager(this.getEager('patch'))

			return res.json(results)
		}
	}

	get deleteById () {
		return async (req, res, next) => {

			const model = this.getModel(req)

			const results = await model.query().deleteById(req.params.id).eager(this.getEager('deleteById'))

			return res.json(results)
		}
	}
}

module.exports = CRUDRouter
