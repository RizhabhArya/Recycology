import mongoose from 'mongoose';

const communityPostSchema = new mongoose.Schema(
  {
    // Project-style fields (compatible with AI output)
    projectName: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true,
    },
    // legacy title for backward compatibility
    title: {
      type: String,
      default: null,
    },
    description: {
      type: String,
      required: [true, 'Post description is required'],
    },
    // Materials can be an array of objects
    materials: [
      {
        name: { type: String },
        quantity: { type: String, default: '' },
      },
    ],
    imageUrl: {
      type: String,
      default: null,
    },
    videoUrl: {
      type: String,
      default: null,
    },
    // Original user input/prompt (if provided)
    inputPrompt: {
      type: String,
      default: '',
    },
    // Steps array to mirror AI-generated steps
    steps: [
      {
        title: String,
        action: String,
        details: String,
        tools: [String],
        warnings: [String],
      },
    ],
    // legacy single material field (optional)
    material: {
      type: String,
      default: null,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    likesCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Update likesCount before saving
communityPostSchema.pre('save', function (next) {
  this.likesCount = this.likes.length;
  next();
});

export default mongoose.model('CommunityPost', communityPostSchema);

