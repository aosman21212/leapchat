const mongoose = require('mongoose');

// Define the schema for the Message model
const messageSchema = new mongoose.Schema({
    id: String,
    from_me: Boolean,
    type: String,
    chat_id: String,
    timestamp: Number,
    source: String,
    text: {
        type: {
            body: String
        },
        default: {}
    },
    from: String
});

// Create and export the Message model
module.exports = mongoose.model('Message', messageSchema);