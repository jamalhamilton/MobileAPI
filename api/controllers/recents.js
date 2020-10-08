const express = require('express')
const router = express.Router()
const keysetPagination = require('objection-keyset-pagination')({ limit: 100, countTotal: true })

module.exports.get = async (req) => {

	const { Search } = req.models
	const myUser = req.user
	const { first, last } = req.query

	var recentSearches = await Search
            .query()
            .unscoped()
            .eager('[match, matchedUser, matchedPlate]')
            .first()
            .where({
                userId: myUser.id,
                //duplicate: false
            })
            .orderBy('searchdate', 'desc')
       
	/*const recentSearches = await keysetPagination(Search)
            .query()
            .unscoped()
            .eager('[match.[complementaryMatches, matchedUser]]')
            .where({
                userId: myUser.id,
                duplicate: false
            })
            .orderBy('id', 'desc')
            .keysetPage({ first, last })*/
    
        //console.log(recentSearches)
        if(recentSearches){
        
            if(recentSearches.match){
                if(recentSearches.match.status == 1 || recentSearches.match.status == 2){
                    recentSearches.sentRequest = 1
                }else{
                    recentSearches.sentRequest = 0
                }

            }else{
                recentSearches.sentRequest = 0
            }
        }else{
            recentSearches = null;
        }
        
        return {results: recentSearches}
}

// TODO: Maybe do it in one query? with checking mutual() == false in the second one? haven't tested it though

module.exports.unknownMatches = async (req) => {

	const { Match } = req.models
	const me = req.user

	// Get all my matches
	const myMatches = await Match.query().eager('[matchedUser, complementaryMatches]').where({ matcherId: me.id }).whereNull('unmatchDate')
	const mutualMatchedUserIds = [...(new Set(myMatches.filter(m => m.mutual()).map(m => m.matchedId)))]

	const matchedMe = await Match.query().eager('[matchedUser]').where({ matchedId: me.id }).orderBy('id', 'desc').groupBy('matcherId')
	const nonMutualMatches = matchedMe.filter(m => !mutualMatchedUserIds.includes(m.matcherId))
	const nonMutualMatcherIds = nonMutualMatches.map(m => m.matcherId)

	return {
		count: nonMutualMatcherIds.length,
		...(me.premium ? { matches: nonMutualMatches } : {})
	}
}

// module.exports = router
