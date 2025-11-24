import mongoose from 'mongoose';

const promptHistorySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    prompt: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index to fetch recent prompts per user quickly
promptHistorySchema.index({ user: 1, createdAt: -1 });
// Unique per-user prompt to avoid duplicates
promptHistorySchema.index({ user: 1, prompt: 1 }, { unique: true });

export default mongoose.model('PromptHistory', promptHistorySchema);
