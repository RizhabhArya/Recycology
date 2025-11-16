import mongoose from 'mongoose';

const productIdeaSchema = new mongoose.Schema(
  {
    material: {
      type: String,
      required: [true, 'Material is required'],
    },
    idea: {
      type: String,
      required: [true, 'Idea is required'],
    },
    description: {
      type: String,
      default: '',
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    isSaved: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('ProductIdea', productIdeaSchema);

