import mongoose from 'mongoose';

const campaignSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Campaign title is required'],
    },
    description: {
      type: String,
      required: [true, 'Campaign description is required'],
    },
    date: {
      type: Date,
      required: [true, 'Campaign date is required'],
    },
    location: {
      type: String,
      required: [true, 'Location is required'],
    },
    type: {
      type: String,
      enum: ['workshop', 'seminar', 'event', 'campaign'],
      default: 'workshop',
    },
    imageUrl: {
      type: String,
      default: null,
    },
    registrationLink: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('Campaign', campaignSchema);

