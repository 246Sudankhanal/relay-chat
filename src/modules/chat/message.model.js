import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    room: { type: String, required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    username: { type: String, required: true },
    text: { type: String, required: true, maxlength: 2000 },
  },
  { timestamps: true }
);

export const Message = mongoose.model('Message', messageSchema);
