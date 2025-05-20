const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    totalMessages: {
        type: Number,
        default: 0
    },
    successfulMessages: {
        type: Number,
        default: 0
    },
    failedMessages: {
        type: Number,
        default: 0
    },
    successRate: {
        type: String,
        default: '0%'
    },
    status: {
        type: String,
        enum: ['pending', 'running', 'completed', 'failed'],
        default: 'pending'
    },
    results: [{
        to: String,
        status: String,
        response: mongoose.Schema.Types.Mixed,
        error: mongoose.Schema.Types.Mixed
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

// Add indexes for frequently queried fields
campaignSchema.index({ createdAt: -1 }); // For sorting by date
campaignSchema.index({ status: 1 }); // For filtering by status
campaignSchema.index({ name: 1 }); // For searching by name

const Campaign = mongoose.model('Campaign', campaignSchema);

module.exports = Campaign; 