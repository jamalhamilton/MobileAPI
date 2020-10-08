const { Model } = require('objection')

const knex = require('knex')

const connection = knex({
	client: 'mysql2',
	connection: {
		host: process.env.DB_HOST,
		user: process.env.DB_USER,
		password: process.env.DB_PASS,
		database: process.env.DB_NAME,		
		charset: 'utf8mb4',
		timezone: 'UTC',
		typeCast (field, next) {
                    // Convert 1 to true, 0 to false, and leave null alone
                    if (field.type === 'TINY' && field.length === 1) {
                        const value = field.string()
                        return value ? value === '1' : null
                    }
                    return next()
		}
	},
	debug: false,
	acquireConnectionTimeout: 843600000,
	pool: {
		min: 5,
		max: 10
	}
})

Model.knex(connection)

module.exports = connection
