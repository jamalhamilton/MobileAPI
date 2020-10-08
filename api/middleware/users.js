const { APIError } = require('../modules/errors')

module.exports.checkRecipient = async (req, res, next) => {

	// OPTIMIZATION: maybe user checking is not necessary entirely, match and you checking can be enough

	const { User } = req.models
	const recipientId = req.params.id

	const recipientCheck = await User.query().findById(recipientId).count('* as count').first()
	const recipientExists = !!recipientCheck.count

	// eslint-disable-next-line eqeqeq
	const isYou = recipientId == req.user.id

	if (!recipientExists) {
		throw new APIError(404, 'User not found')
	}

	if (isYou) {
		throw new APIError(403, 'That\'s you!')
	}

	next()
}

module.exports.requireMatch = async (req, res, next) => {

	const { Match } = req.models
	const recipientId = req.params.id

	// Check our match

	const ourMatch = await Match.query().checkBetween(req.user.id, recipientId)

	if (!ourMatch) {
		throw new APIError(401, 'You\'re not matched with this person')
	}

	req.match = ourMatch

	next()
}

module.exports.requireCompleteProfile = async (req, res, next) => {

	const { user } = req

	if (!user.profileReady) {
		throw new APIError(406, 'Profile is not set up', { profile: user })
	}

	if (!user.verified) {
		// throw new APIError(401, 'Phone number is not verified')
	}

	next()
}
