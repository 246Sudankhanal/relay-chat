import mongoose from 'mongoose';

const chatMessageSchema = new mongoose.Schema({
    user: { type: String, required: true },
    text: { type: String, required: true },
    time: { type: String, required: true }, // Stores your formatted string like "12:42 PM"
    timestamp: { type: Date, default: Date.now } // Good for sorting logs later
});

export const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema)