const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt-nodejs')
const moment = require('moment')
const express = require('express')
const router = express.Router()

const authValidator = require('../validation/authentication')

const { APIError, ServerError } = require('../modules/errors')
const { requireAdmin } = require('../middleware/protect')
const { verifyToken } = require('../middleware/auth')

const authResponse = (user, extra) => {

	const userJson = user.toJSON()

	const token = signToken(user)

	const ready = user.profileReady

	return { token, user: userJson, profileReady: ready ? undefined : false, ...extra }
}

const signToken = (user) => {

	if (!user) {
		throw new APIError(401, 'Forbidden', {}, 'signToken called without user. Possible breach?')
	}

	const issuer = 'iludoapi-' + require('../../package.json').version || '1.0.0'

	user.iss = issuer

	const token = jwt.sign(JSON.stringify(user), process.env.JWT_KEY)

	return token
}

const createAccount = async (req, data) => {

	const { UserMe, Coin } = req.models

	const savedUser = await UserMe.query().insertAndFetch(data)

	const giftCoinAmount = process.env.COINS_WELCOME_GIFT

	if (giftCoinAmount && giftCoinAmount > 0) {
		await Coin.query().insertAndFetch({ userId: savedUser.id, type: 'signup-gift', value: giftCoinAmount })
	}

	return authResponse(savedUser, { signup: true, gift: true })
}

router.post('/email', authValidator.email, async (req, res, next) => {

	const { UserMe } = req.models
	const { email, password } = req.body

	const user = await UserMe.query().where({ email }).first()

	if (!user) {
		throw new APIError(404, 'Email not registered')
	}

	if (!user.password/* || user.type !== 'email' */) {
		throw new APIError(403, 'Try a different login method', { alert: { title: 'Try a different login method', message: 'You signed up using Facebook or Google' } })
	}

	const granted = await new Promise((resolve, reject) => {
		bcrypt.compare(password, user.password, (err, granted) => {
			if (err) return reject(new ServerError(`bcrypt error: ${err}`, err))
			return resolve(granted)
		})
	})

	if (!granted) {
		throw new APIError(401, 'Password doesn\'t match')
	}

	return res.json(authResponse(user))
})

// TODO: Validation, sanitation
router.post('/signup', authValidator.email, async (req, res, next) => {

	const { User } = req.models
	const { email, password } = req.body

	const existingUser = await User.query().where({ email }).first().count('* as count')
	const alreadyRegistered = !!existingUser.count

	if (alreadyRegistered) {
		throw new APIError(409, 'This email is already registered')
	}

	const pwdHash = await new Promise((resolve, reject) => {
		bcrypt.hash(password, null, null, (err, hash) => {
			if (err) return reject(new ServerError(`bcrypt error: ${err}`, err, {}))
			else return resolve(hash)
		})
	})

	return res.json(await createAccount(req, { ...req.body, email, password: pwdHash, location: null }))
})

// Mark: - Facebook login

const { FB } = require('fb')

router.post('/facebook', async (req, res, next) => {

	const { UserMe } = req.models
	const { accessToken } = req.body

	if (!accessToken) {
		throw new APIError(400, 'Bad Request')
	}

	const fbProfile = await FB.api('me', { fields: 'id,first_name,last_name,picture,email' /* + ',birthday,gender' */, access_token: accessToken })

	if (!fbProfile) {
		throw new APIError(400, 'Bad Request')
	}

	const existingUser = await UserMe.query().where({ facebookId: fbProfile.id }).orWhere({ email: fbProfile.email }).first()

	const alreadyRegistered = !!existingUser

	const photo = `https://graph.facebook.com/${fbProfile.id}/picture?type=large`
	// const { gender } = fbProfile
	// const birthday = moment(fbProfile.birthday, 'MM/DD/YYYY').format('YYYY-MM-DD')

	if (alreadyRegistered) {

		const update = { facebookId: fbProfile.id }

		if (!existingUser.photoUpdate) {
			update.photo = photo
		}

		await existingUser.$query().updateAndFetch(update)

		// existingUser.birthday = birthday
		// existingUser.gender = gender

		return res.json(authResponse(existingUser))

	} else {
		return res.json(await createAccount(req, { facebookId: fbProfile.id, firstName: fbProfile.first_name, lastName: fbProfile.last_name, photo, /* birthday, gender, */ location: null }))
	}

})

// Mark: - Google login

const { google } = require('googleapis')

const oauth2Client = new google.auth.OAuth2({
	clientId: process.env.GOOGLE_CLIENT_ID,
	clientSecret: process.env.GOOGLE_CLIENT_SECRET
})

router.post('/google', async (req, res, next) => {

	const { UserMe } = req.models
	const { code } = req.body

	if (!code) {
		throw new APIError(400, 'Bad Request')
	}

	const { tokens } = await oauth2Client.getToken(code)
	oauth2Client.setCredentials(tokens)

	const peopleAPI = google.people({
		version: 'v1',
		auth: oauth2Client
	})

	const response = (await peopleAPI.people.get({
		resourceName: 'people/me',
		personFields: 'emailAddresses,names,photos,genders,birthdays'
	})).data

	if (!response) {
		throw new APIError(500, 'Couldn\'t get Google profile. Try another login method')
	}

	const tokenData = jwt.decode(tokens.id_token)

	const profile = {
		googleId: tokenData.sub,
		firstName: (tokenData.given_name || (response.names.find(n => n.metadata.primary) || response.names[0]).givenName),
		lastName: (tokenData.family_name || (response.names.find(n => n.metadata.primary) || response.names[0]).familyName),
		photo: (tokenData.picture || (response.photos.find(n => n.metadata.primary) || response.photos[0]).url).replace('/s96-c/', '/s500/').replace('/s100/', '/s500/').replace('?sz=50', ''),
		email: (tokenData.email || (response.emailAddresses.find(n => n.metadata.primary) || response.emailAddresses[0]).value)
	}

	try {
		profile.birthday = response.birthdays && response.birthdays.find(n => n.date.year && n.date.month && n.date.day).date
		profile.birthday = profile.birthday && moment(`${profile.birthday.year}-${profile.birthday.month}-${profile.birthday.day}`, 'YYYY-M-D').format('YYYY-MM-DD')
	} catch (e) { console.log('birthday parse err', e) }

	try {
		profile.gender = response.genders && (response.genders.find(n => n.metadata.primary) || response.genders[0]).value
	} catch (e) { console.log('gender parse err', e) }

	const existingUser = await UserMe.query().where({ googleId: profile.googleId }).orWhere({ email: profile.email }).first()

	const alreadyRegistered = !!existingUser

	if (alreadyRegistered) {

		const update = { googleId: profile.googleId }

		if (!existingUser.photoUpdate) {
			update.photo = profile.photo
		}

		await existingUser.$query().updateAndFetch(update)

		existingUser.birthday = existingUser.birthday || profile.birthday
		existingUser.gender = existingUser.gender || profile.gender

		return res.json(authResponse(existingUser))

	} else {
		return res.json(await createAccount(req, { ...profile, location: null }))
	}

})

// MARK: - Admin only

router.get('/token/:id(\\d+)/', verifyToken, requireAdmin, async (req, res, next) => {

	const { User } = req.models

	const user = await User.query().where({ id: req.params.id }).first()

	if (!user) {
		throw new APIError(404, 'User not found')
	}

	return res.json({ user, token: signToken(user) })
})

module.exports = router
