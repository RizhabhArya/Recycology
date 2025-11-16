import mongoose from 'mongoose';

const materialSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    category: {
      type: String,
      enum: ['plastic', 'paper', 'metal', 'glass', 'fabric', 'wood', 'other'],
      required: true,
    },
    icon: {
      type: String,
      default: null,
    },
    description: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('Material', materialSchema);

