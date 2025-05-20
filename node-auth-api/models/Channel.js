const mongoose = require('mongoose');

const channelSchema = new mongoose.Schema({
    id: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    type: {
        type: String,
        required: true,
        enum: ['newsletter', 'whatsapp', 'telegram', 'email', 'sms']
    },
    chat_pic: {
        type: String
    },
    chat_pic_full: {
        type: String
    },
    created_at: {
        type: Number
    },
    invite_code: {
        type: String
    },
    verification: {
        type: Boolean
    },
    description_at: {
        type: String
    },
    description: {
        type: String
    },
    preview: {
        type: String
    },
    role: {
        type: String
    }
}, { timestamps: true });

// Add indexes for frequently queried fields
channelSchema.index({ type: 1 }); // For filtering by channel type
channelSchema.index({ id: 1 }, { unique: true }); // For unique id
channelSchema.index({ name: 1 }); // For searching by name
channelSchema.index({ created_at: -1 }); // For sorting by creation date

const Channel = mongoose.model('Channel', channelSchema);

module.exports = Channel;