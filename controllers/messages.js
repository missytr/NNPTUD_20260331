let messageModel = require('../schemas/message');
let userModel = require('../schemas/users');

module.exports = {
    // Tách riêng logic xử lý lấy tin nhắn giữa 2 người vào controller
    GetConversation: async function (currentUser, otherUser) {
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

        return resultData;
    },

    // Tách riêng logic lấy list cuộc hội thoại
    GetInboxList: async function (currentUser) {
        let allMessages = await messageModel.find({
            $or: [
                { from: currentUser },
                { to: currentUser }
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

        return Array.from(conversationsMap.values());
    },

    // Tách riêng logic gửi tin nhắn
    SendMessage: async function (currentUser, to, type, text) {
        if (!['text', 'file'].includes(type) || !to) {
            throw new Error("Truyền thiếu tham số: to, type (text/file), text (hoặc đường dẫn)");
        }

        let newMessage = new messageModel({
            from: currentUser,
            to: to,
            messageContent: {
                type: type,
                text: text
            }
        });

        await newMessage.save();
        return newMessage;
    }
};
