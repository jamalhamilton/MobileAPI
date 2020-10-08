const {BaseModel, AdvancedQueryBuilder} = require('./Base')
const {Model} = require('objection')

class MatchQueryBuilder extends AdvancedQueryBuilder {

    checkBetween(me, other) {

        const meId = me.id ? me.id : me
        const otherId = other.id ? other.id : other

        return this.where({matchedId: meId, matcherId: otherId}).orWhere({matchedId: otherId, matcherId: meId}).first()
    }
}

class Match extends BaseModel {

    static get tableName() {
        return 'matches'
    }

    static get hidden() {
        return []
    }

    static get QueryBuilder() {
        return MatchQueryBuilder
    }

    static get visible() {
        return ['matchedPlate', 'matchedUser', 'matcherUser', 'mutual', 'matchesPreference', 'id', 'sentMessage', 'searchId', 'plateId', 'status', 'created', 'chat', 'search']
    }

    static get virtualAttributes() {
        return ['mutual', 'matchesPreference']
    }

    static get defaultEager() {
        // return '[matchedUser]'
    }

    mutual() {
        if (this.complementaryMatches === undefined) {
            return undefined
        }

        const mutualMatch = this.complementaryMatches.filter(match => match.matchedId === this.matcherId)

        if (mutualMatch && mutualMatch.length > 0) {
            return true
        }

        return false
    }
    
    getOther (me) {
            return [this.matcherUser, this.matchedUser].find(person => person && person.id !== me.id)
    }
    
    otherUser() {
        const me = this.reqUser
        return [this.matcherUser, this.matchedUser].filter(user => user.id !== me.id)[0] || null
    }

    matchesPreferences() {
        const me = this.reqUser
        return me.matchesPreference(this.otherUser(me))
    }

    static get relationMappings() {
        return {
            matchedPlate: {
                relation: Model.HasOneRelation,
                modelClass: this.models.Plate,
                join: {
                    from: 'matches.plateId',
                    to: 'plates.id'
                }
            },
            matchedUser: {
                relation: Model.HasOneRelation,
                modelClass: this.models.User,
                join: {
                    from: 'matches.matchedId',
                    to: 'users.id'
                }
            },
            matcherUser: {
                relation: Model.HasOneRelation,
                modelClass: this.models.User,
                join: {
                    from: 'matches.matcherId',
                    to: 'users.id'
                }
            },
            complementaryMatches: {
                relation: Model.HasManyRelation,
                modelClass: this,
                join: {
                    from: 'matches.matchedId',
                    to: 'matches.matcherId'
                },
                modify: (builder) => {
                    builder.where('matches.matchedId', this.reqUser.id)
                }
            },
            chat: {
                relation: Model.BelongsToOneRelation,
                modelClass: this.models.Chat,
                join: {
                    from: 'matches.id',
                    to: 'chats.matchId'
                }
            },
            search: {
                relation: Model.HasOneRelation,
                modelClass: this.models.Search,
                join: {
                    from: 'matches.searchId',
                    to: 'searches.id'
                }
            },
        }
    }

    // static get modifiers () {
    // 	return {
    // 		mutual (builder) {
    // 			builder.where('species', 'dog')
    // 		}
    // 	}
    // }
}

module.exports = Match
