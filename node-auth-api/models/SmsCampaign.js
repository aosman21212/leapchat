const mongoose = require('mongoose');

const smsCampaignSchema = new mongoose.Schema({
    to: {
        type: String,
        required: true
    },
    from: {
        type: String,
        required: true
    },
    channel: {
        type: String,
        required: true
    },
    content: {
        contentType: {
            type: String,
            required: true
        },
        text: String,
        media: {
            url: String
        }
    },
    messageId: String,
    status: {
        type: String,
        enum: ['sent', 'failed', 'pending'],
        default: 'pending'
    },
    sentBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('SmsCampaign', smsCampaignSchema); 