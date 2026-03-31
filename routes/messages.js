var express = require("express");
var router = express.Router();
let messageModel = require('../schemas/message');
let userModel = require('../schemas/users');
let { CheckLogin } = require('../utils/authHandler');

router.get('/:userID', CheckLogin, async function (req, res, next) {
    try {
        let currentUser = req.user._id.toString();
        let otherUser = req.params.userID;

        let messages = await messageModel.find({
            $or: [
                { from: currentUser, to: otherUser },
                { from: otherUser, to: currentUser }
            ]
        });


        messages.sort(function (a, b) {
            let timeA = new Date(a.createAt || a.createdAt).getTime();
            let timeB = new Date(b.createAt || b.createdAt).getTime();
            return timeA - timeB;
        });


        let me = await userModel.findById(currentUser);
        let you = await userModel.findById(otherUser);
        let myInfo = { _id: me._id, username: me.username, email: me.email };
        let yourInfo = { _id: you._id, username: you.username, email: you.email };

        let resultData = messages.map(msg => {
            let fromInfo = (msg.from.toString() === currentUser) ? myInfo : yourInfo;
            let toInfo = (msg.to.toString() === currentUser) ? myInfo : yourInfo;

            return {
                ...msg.toObject(),
                from: fromInfo,
                to: toInfo
            };
        });

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

        let allMessages = await messageModel.find({
            $or: [
                { from: req.user._id },
                { to: req.user._id }
            ]
        });


        allMessages.sort(function (a, b) {
            let timeA = new Date(a.createAt || a.createdAt).getTime();
            let timeB = new Date(b.createAt || b.createdAt).getTime();
            return timeB - timeA;
        });

        let conversationsMap = new Map();


        for (let msg of allMessages) {
            let fromId = msg.from.toString();
            let toId = msg.to.toString();

            let partnerId = (fromId === currentUser) ? toId : fromId;

            if (!conversationsMap.has(partnerId)) {
                let rawPartner = await userModel.findById(partnerId);
                let partnerUser = null;
                if (rawPartner) {
                    partnerUser = {
                        _id: rawPartner._id,
                        username: rawPartner.username,
                        email: rawPartner.email
                    };
                }

                conversationsMap.set(partnerId, {
                    _id: partnerId,
                    otherUser: partnerUser,
                    latestMessage: msg
                });
            }
        }

        let conversations = Array.from(conversationsMap.values());

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
        if (!['text', 'file'].includes(type) || !to) {
            return res.status(400).send({
                success: false,
                message: "Truyền thiếu tham số: to, type (text/file), text (hoặc đường dẫn)"
            });
        }

        let currentUser = req.user._id;

        let newMessage = new messageModel({
            from: currentUser,
            to: to,
            messageContent: {
                type: type,
                text: text
            }
        });

        await newMessage.save();

        res.status(200).send({
            success: true,
            data: newMessage
        });
    } catch (error) {
        res.status(500).send({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;
