const AWS = require('aws-sdk')
const multer = require('multer')
const multerS3 = require('multer-s3')

const { APIError } = require('../modules/errors')

const path = require('path')
const fs = require('fs')
const url = require('url')

/*const spacesEndpoint = new AWS.Endpoint(process.env.S3_ENDPOINT)
const s3 = new AWS.S3({
	endpoint: spacesEndpoint,
	accessKeyId: process.env.S3_ACCESS_KEY,
	secretAccessKey: process.env.S3_SECRET_KEY
})*/

/*const multerS3Storage = multerS3({
	s3: s3,
	bucket: process.env.S3_BUCKET,
	// acl: process.env.S3_ACL,
	acl: 'public-read',
	metadata: function (req, file, cb) {
		cb(null, { userId: `${req.user.id}`, originalName: file.originalname })
	},
	key: function (req, file, cb) {
		const devPrefix = process.env.NODE_ENV === 'development' ? 'dev-' : process.env.NODE_ENV === 'testing' ? 'test-' : ''
		cb(null, `photos/${devPrefix}${req.user.id}-${Date.now().toString()}${path.extname(file.originalname)}`)
	},
	contentType: multerS3.AUTO_CONTENT_TYPE
})*/

const localTestStorage = multer.diskStorage({
	destination: function (req, file, cb) {
		cb(null, './uploads/profile/')
	},
	filename: function (req, file, cb) {
		cb(null, `${req.user.id}-${Date.now().toString()}${path.extname(file.originalname)}`)
	}
})

const upload = multer({
	storage: localTestStorage,
	//storage: multerS3Storage,
	limits: {
		fileSize: 8 * 1024 * 1024
	},
	fileFilter: function (req, file, cb) {

		console.log(file)

		const ext = path.extname(file.originalname).toLowerCase()

		if (!ext.match(/\.(jpg|jpeg|png|heic|bmp)$/)) {
			return cb(new APIError(400, 'Only image files are allowed'))
		}
		cb(null, true)
	}
})

const handlePhoto = async (req, res, next) => {

	return upload.single('photo')(req, res, (err) => {

		try {

			if (err instanceof multer.MulterError) {
				// A Multer error occurred when uploading.
				console.error(err)
				throw new APIError(400, err.message, {}, err, err)
			} else if (err) {
				// An unknown error occurred when uploading.
				throw err
			}

			next()

		} catch (err) {
			next(err)
		}
	})
}

const checkPreviousUpload = async (req, res, next) => {

	if (!req.user) {
		throw new APIError(403, 'Not authorized')
	}

	if (!req.user.photo) {
		return next()
	}

	// TODO: Rate limit: Query users where id = id, and timestamp - some time <? photoUpdate

	const location = req.user.photo
	let key = url.parse(location).pathname

	if (key.charAt(0) === '/uploads/profile/') {
		key = key.substr(1)
	}

	/*var params = {
            Bucket: process.env.S3_BUCKET,
            Key: key
	}

	// Delete previous photo

	s3.deleteObject(params, function (err, data) {
		if (!err) {
			console.log('deleted ' + key) // sucessfull response
			next()
		} else {
			console.log(err) // an error ocurred
			next(err)
		}
	})*/

	/* s3.getObject(params, function (err, data) {
		if (!err) {
			console.log(data) // successful response

		} else {
			console.log(err) // an error occurred
		}
	}) */

}

//module.exports = { multer: upload, s3, handlePhoto, checkPreviousUpload }
module.exports = { multer: upload, handlePhoto, checkPreviousUpload }
