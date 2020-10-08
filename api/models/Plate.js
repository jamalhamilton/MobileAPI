const {BaseModel} = require('./Base')
const {Model, QueryBuilder} = require('objection')

class Plate extends BaseModel {

    static get tableName() {
        return 'plates'
    }

    static get visible() {
        // return ['value']
    }

    static get relationMappings() {
        return {
            user: {
                relation: Model.HasOneRelation,
                modelClass: this.models.User,
                join: {
                    from: 'plates.userId',
                    to: 'users.id'
                }
            }
        }
    }
}

class PlateMe extends Plate {

    static get visible() {
        return ['value', 'temporary', 'created', 'expiration', 'country']
    }
}

module.exports = {Plate, PlateMe}
