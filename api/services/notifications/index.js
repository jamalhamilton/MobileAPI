/*const APN = require('apn')
const _ = require('lodash')
const fs = require('fs')
const path = require('path')

const apnOptions = {
	token: {
		key: fs.readFileSync(path.join(__dirname, './certs/apns.p8')),
		keyId: '59BNLCDV3N',
		teamId: 'NW2BQZ52HR'
	},
	production: process.env.NODE_ENV === 'production'
}

const apnProvider = new APN.Provider(apnOptions)

function createBodyAPN ({ title, body, custom, badge }) {
	return {
		title,
		topic: 'com.hroland.iludo',
		body,
		custom,
		badge
	}
}

async function sendAPN (devices, payload) {

	// support for single token and multi devices inputs
	devices = _.flattenDeep([devices])

	// collect responses throughout the sending process
	const results = { sent: [], failed: [] }

	// form the required apn notification object
	const notification = new APN.Notification(payload)

	for (const device of devices) {

		try {
			const result = await apnProvider.send(notification, device.token)
			_.merge(results, result)
		} catch (err) {
			console.warn('iOS push err', err)
		}
	}

	console.log('ios push completed', results)

	return results
}

// Universal wrapper function

async function send (devices, payload) {

	// support for single token and multi devices inputs
	devices = _.flattenDeep([devices])

	// collect responses throughout the sending process
	const results = { ios: [], android: [] }

	// sending iOS/APN

	const apnDevices = devices.filter(d => d.type === 'ios')
	const apnResults = await sendAPN(apnDevices, payload)

	results.ios.push(apnResults)

	// sending Android/FCM

	return results
}

module.exports = { send, sendAPN }
*/