const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    from: {
        type: mongoose.Types.ObjectId,
        ref: 'user',
        required: true
    },
    to: {
        type: mongoose.Types.ObjectId,
        ref: 'user',
        required: true
    },
    messageContent: {
        type: {
            type: String,
            enum: ['text', 'file'],
            required: true
        },
        text: {
            type: String,
            default: ""
        }
    },
    createAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});
module.exports = new mongoose.model('message', messageSchema);
