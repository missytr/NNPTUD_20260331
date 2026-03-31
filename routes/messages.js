var express = require("express");
var router = express.Router();
let messageModel = require('../schemas/message');
let { CheckLogin } = require('../utils/authHandler');
let mongoose = require('mongoose');

// Lấy toàn bộ tin nhắn giữa user hiện tại và userID (cả chiều gửi và nhận)
router.get('/:userID', CheckLogin, async function (req, res, next) {
    try {
        let currentUser = req.user._id;
        let otherUser = req.params.userID;

        let messages = await messageModel.find({
            $or: [
                { from: currentUser, to: otherUser },
                { from: otherUser, to: currentUser }
            ]
        })
        .populate('from', 'username email') // Lấy thêm thông tin user gửi
        .populate('to', 'username email')   // Lấy thêm thông tin user nhận
        .sort({ createAt: 1 }); // Sắp xếp theo chiều thời gian tăng dần (cũ đến mới)

        res.status(200).send({
            success: true,
            data: messages
        });
    } catch (error) {
        res.status(500).send({
            success: false,
            message: error.message
        });
    }
});

// Lấy tin nhắn cuối cùng của mỗi cuộc hội thoại (Inbox list)
router.get('/', CheckLogin, async function (req, res, next) {
    try {
        let currentUser = req.user._id;

        // Dùng aggregation để gom nhóm tin nhắn theo đối tác chat (otherUser)
        let conversations = await messageModel.aggregate([
            {
                $match: {
                    $or: [
                        { from: new mongoose.Types.ObjectId(currentUser) },
                        { to: new mongoose.Types.ObjectId(currentUser) }
                    ]
                }
            },
            {
                // Sắp xếp mới nhất đưa lên đầu tiên trước khi gom nhóm
                $sort: { createAt: -1, createdAt: -1 } 
            },
            {
                $group: {
                    // Xác định đối tác chat là ai (tức là không phải currentUser)
                    _id: {
                       $cond: [
                           { $eq: ["$from", new mongoose.Types.ObjectId(currentUser)] },
                           "$to",
                           "$from"
                       ]
                    },
                    latestMessage: { $first: "$$ROOT" }
                }
            },
            {
                // Join với bảng users để tính kèm luôn cả thông tin người mà mình chat cùng
                $lookup: {
                    from: "users", 
                    localField: "_id",
                    foreignField: "_id",
                    as: "otherUser"
                }
            },
            {
                $unwind: "$otherUser" // Dàn mảng thành JSON object
            },
            {
                // Loại bỏ bớt các thông tin dư thừa của user đối tác (bảo mật)
                $project: {
                    "otherUser.password": 0,
                    "otherUser.forgotPasswordToken": 0,
                    "otherUser.forgotPasswordTokenExp": 0
                }
            },
            {
                // Sắp xếp Danh sách hội thoại theo tin nhắn vừa nhận gần nhất
                $sort: { "latestMessage.createAt": -1, "latestMessage.createdAt": -1 } 
            }
        ]);

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

// Gửi tin nhắn mới
router.post('/', CheckLogin, async function (req, res, next) {
    try {
        let { to, type, text } = req.body;
        // Kiểm tra format đầu vào
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

        let populatedMessage = await messageModel.findById(newMessage._id)
            .populate('from', 'username email')
            .populate('to', 'username email');

        res.status(200).send({
            success: true,
            data: populatedMessage
        });
    } catch (error) {
        res.status(500).send({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;
