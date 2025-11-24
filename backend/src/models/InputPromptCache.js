import mongoose from 'mongoose';

const inputPromptCacheSchema = new mongoose.Schema(
  {
    prompt: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    // Array of project IDs that were returned for this prompt
    resultsProjectIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
      },
    ],
    // Embedding of the prompt for similarity matching
    embedding: [Number],
    // Last time this cache was used
    lastAccessed: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster lookups
// `unique: true` is already declared on the `prompt` field above.
// Remove the explicit prompt index to avoid duplicate index warnings.
inputPromptCacheSchema.index({ lastAccessed: -1 });

export default mongoose.model('InputPromptCache', inputPromptCacheSchema);

