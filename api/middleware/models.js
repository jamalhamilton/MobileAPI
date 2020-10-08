const { mixin } = require('objection')

const { limitModelMixin } = require('../models/Base')

const coreModels = {
	User: require('../models/User').User,
	UserMe: require('../models/User').UserMe,
	Device: require('../models/Device'),
	Coin: require('../models/Coin'),
	Search: require('../models/Search'),
	Match: require('../models/Match'),
	Plate: require('../models/Plate').Plate,
	PlateMe: require('../models/Plate').PlateMe,
	Chat: require('../models/Chat'),
	Verification: require('../models/Verification'),
	Invite: require('../models/Invite'),
	Report: require('../models/Report')
}

function cloneCoreModels () {
	return Object.assign({}, coreModels)
}

function assignModelsMiddleware (req, res, next) {

	const models = cloneCoreModels()

	// Mixing the classes with the Limited model
	Object.keys(models).forEach(key => {
		models[key] = limitModel(req, models[key])
	})
	// Giving each model a reference of each processed model
	// (to use in relation mapping)
	Object.keys(models).forEach(key => {
		models[key].models = models
		models[key].reqUser = req.user
	})

	req.models = models

	next()
}

function limitModel (req, model) {

	if (req.user && req.user.admin) {
		return model
	}

	return mixin(model, [limitModelMixin])
}

module.exports = { assignModelsMiddleware, coreModels, cloneCoreModels }
