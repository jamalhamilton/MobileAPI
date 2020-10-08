const express = require('express')
const router = express.Router()

const {requireAdmin} = require('../middleware/protect')

const CRUDRouter = require('../modules/crud')
const crud = new CRUDRouter('Match')

router.get('/', requireAdmin, crud.findAll)
router.put('/', requireAdmin, crud.create)
router.get('/:id(\\d+)', requireAdmin, crud.findById)
router.patch('/:id(\\d+)', requireAdmin, crud.patch)
router.delete('/:id(\\d+)', requireAdmin, crud.deleteById)

router.post('/sendrequest', async (req, res, next) => {

    const {Match, Search, Chat, Coin} = req.models
    const myUser = req.user
    const matchedUserId = req.body.matchedUserId
    const plateId = req.body.plateId
    const searchId = req.body.searchId

    const matchingIds = {matcherId: myUser.id, matchedId: matchedUserId}

    // Use that match or make new one
    match = await Match.query().eager('[matchedUser]').insertAndFetch({...matchingIds, plateId: plateId, searchId: searchId, sentMessage:1})

    if (match) {
        await Search.query().update({matchId: match.id}).where({id: searchId})
        console.log('updated saved match with search id:', match.id)
    }

    const messageCount = await Chat.query().participants(myUser.id, matchedUserId).where({matchId: match.id}).count('* as count').first()
    const isFirstMessage = messageCount.count === 0

    console.log(messageCount)

    if (isFirstMessage) {
        const transaction = await Coin.spendCoins(myUser, process.env.COINS_FIRST_MESSAGE, 'first-message') // TODO: Replace with Product class
        console.log('transaction', transaction)
        //console.log(req.match)
        //await match.$query().updateAndFetch({ sentMessage: true })
        //console.log(req.match)
    }

    const savedChat = await Chat.query().insertAndFetch({matchId: match.id, fromId: myUser.id, toId: matchedUserId, text: req.body.message})

    return res.json({match, chat: savedChat})
})

router.get('/pending_request', async (req, res, next) => {

    const {Match} = req.models
    const myUser = req.user

    const pendingRequest = await Match
            .query()
            .eager('[matcherUser]')
            .where({
                matchedId: myUser.id
            })
            .orderBy('id', 'desc')

    return res.json({pendingRequest})
})

router.patch('/change_match_status/:id(\\d+)', async (req, res, next) => {

    const {Match} = req.models
    const myUser = req.user
    const status = req.body.status

    const match = await Match.query().where({id: req.params.id}).first()

    if (!match) {
        throw new APIError(404, 'Match request not found')
    }
    const updateData = await match.$query().update({status: status})

    //const updateData = await Match.query().where({ id: match.id }).update({ status: status })
    if (!updateData) {
        throw new APIError(503, 'Something went wrong on updating data!')
    }

    return res.json({match})
})

router.get('/view_all/:id(\\d+)', async (req, res, next) => {
    //{ 0 = notfound, 1= requested,2 = all searches,3 = platch with you}
    const {Match, Search, Plate} = req.models
    const myUser = req.user

    let getID = req.params.id;

    if (getID == 0) {
        
        const notFound = await Search.query().eager('[matchedUser]').where({userId: myUser.id, status: 0}).orderBy('id', 'desc')
        if (!notFound) {
            throw new APIError(503, 'Something went wrong on getting data!')
        }
        return res.json({searches: notFound})
        
    } else if (getID == 1) {
        
        const requested = await Match.query().eager('[matchedUser, matchedPlate, search]').where({matcherId: myUser.id, status: 1}).orderBy('id', 'desc')
        if (!requested) {
            throw new APIError(503, 'Something went wrong on getting data!')
        }
        return res.json({searches: requested})
        
    } else if (getID == 2) {
        
        const allSearches = await Search.query().eager('[match, matchedUser, matchedPlate]').where({userId: myUser.id}).orderBy('id', 'desc')
        if (!allSearches) {
            throw new APIError(503, 'Something went wrong on getting data!')
        }
        return res.json({searches: allSearches})
        
    } else if (getID == 3) {
        var matchedPlatch = [];
        var platch = await Match.query()
            .eager('[matchedUser, matcherUser, matchedPlate, search]')
            //.where(query => query.where('matcherId', myUser.id).orWhere('matchedId', myUser.id))
            .where(query => query.where('matcherId', myUser.id).orWhere('matchedId', myUser.id))
            .where({status: 2})
            .orderBy('id', 'desc')
            for (const pl of platch) {
                if(pl.matchedUser.id == myUser.id){
                    delete pl.matchedUser;
                    pl.matchedUser = pl.matcherUser;
                    delete pl.matcherUser;
                    delete pl.matchedPlate;
                    var mPlate = await Plate.query().where({userId: pl.matchedUser.id}).first().orderBy('id', 'desc');
                    pl.matchedPlate = mPlate;
                } else{
                    delete pl.matcherUser;
                }
                matchedPlatch.push(pl)
            }
                
        return res.json({searches: matchedPlatch})
        
    }else if (getID == 4) {
        let notReq = []
        const notRequested = await Search.query().eager('[match, matchedUser, matchedPlate]').where({userId: myUser.id, status: 1}).orderBy('id', 'desc')
        if (!notRequested) {
            throw new APIError(503, 'Something went wrong on getting data!')
        }
        
        notRequested.forEach(nr => { 
            if(nr.match == null){
                notReq.push(nr);
            } 
        })
        
        return res.json({searches: notReq})
        
    } else {        
        return res.json(null);
    }

})

module.exports = router
