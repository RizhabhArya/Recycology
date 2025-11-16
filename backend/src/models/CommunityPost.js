import mongoose from 'mongoose';

const communityPostSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Post title is required'],
    },
    description: {
      type: String,
      required: [true, 'Post description is required'],
    },
    material: {
      type: String,
      required: [true, 'Material is required'],
    },
    imageUrl: {
      type: String,
      default: null,
    },
    videoUrl: {
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

