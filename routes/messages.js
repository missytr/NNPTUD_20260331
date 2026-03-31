var express = require("express");
var router = express.Router();
let messageController = require('../controllers/messages');
let { CheckLogin } = require('../utils/authHandler');

router.get('/:userID', CheckLogin, async function (req, res, next) {
    try {
        let currentUser = req.user._id.toString();
        let otherUser = req.params.userID;

        let resultData = await messageController.GetConversation(currentUser, otherUser);

        res.status(200).send({
            success: true,
            data: resultData
        });
    } catch (error) {
        res.status(500).send({
            success: false,
            message: error.message
        });
    }
});

router.get('/', CheckLogin, async function (req, res, next) {
    try {
        let currentUser = req.user._id.toString();

        let conversations = await messageController.GetInboxList(currentUser);

        res.status(200).send({
            success: true,
            data: conversations
        });
    } catch (error) {
        res.status(500).send({
            success: false,
            message: error.message
        });
    }
});

router.post('/', CheckLogin, async function (req, res, next) {
    try {
        let { to, type, text } = req.body;
        let currentUser = req.user._id;

        let newMessage = await messageController.SendMessage(currentUser, to, type, text);

        res.status(200).send({
            success: true,
            data: newMessage
        });
    } catch (error) {
        res.status(400).send({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;
