// ILUDO API <3
// by Ankit

const http = require('http')
const express = require('express')
const morgan = require('morgan')
const bodyParser = require('body-parser')
const cors = require('cors')
const chalk = require('chalk')

require('dotenv').config()

const ErrorHandling = require('./api/modules/errors')

const Sentry = ErrorHandling.initSentry()

// Initializing database (don't remove, even if not used)
// eslint-disable-next-line no-unused-vars
const knex = require('./api/config/database')

// Sockets
const ChatSocket = require('./api/services/sockets/chat')

// Middlewares
const { verifyToken, parseToken: parseTokenMiddleware } = require('./api/middleware/auth')
const { requireAdmin } = require('./api/middleware/protect')
const { assignModelsMiddleware } = require('./api/middleware/models')
const { preventEmptyResponsesMiddleware } = ErrorHandling

// Express setup
const app = express()
require('express-async-errors')
const router = express.Router()
const appPrefix = '/api/v1'

app.disable('etag')
app.use(appPrefix, router)
app.use(Sentry.Handlers.requestHandler())

router.use(morgan('dev'))
router.use(cors())
router.use(bodyParser.urlencoded({ extended: false }))
router.use(bodyParser.json())
router.use(parseTokenMiddleware)
router.use(preventEmptyResponsesMiddleware)
router.use(assignModelsMiddleware)
// Routes

router.use('/auth', require('./api/routes/auth'))
router.use('/users', verifyToken, require('./api/routes/users'))
router.use('/config', verifyToken, require('./api/routes/config'))
router.use('/coins', verifyToken, requireAdmin, require('./api/routes/coins'))
router.use('/searches', verifyToken, require('./api/routes/searches'))
router.use('/matches', verifyToken, require('./api/routes/matches'))
router.use('/plates', verifyToken, require('./api/routes/plates'))
router.use('/chat', verifyToken, require('./api/routes/chat'))
router.use('/reports', verifyToken, require('./api/routes/reports'))

ErrorHandling.handle(app)

// Server initialization

const port = process.env.PORT || 5101
const server = http.createServer(app)

server.listen(port, function () {

	const env = process.env.NODE_ENV
	const version = require('./package.json').version

	const appName = `ILUDO API`

	console.log('\n' + chalk.bold(`${appName} v${version}`) + chalk.default(`\n(${env}, port ${port})\n`))
})

ChatSocket.setup(server, appPrefix + '/chat')
