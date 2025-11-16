import mongoose from 'mongoose';

const garbageCollectorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Collector name is required'],
    },
    address: {
      type: String,
      required: [true, 'Address is required'],
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        required: true,
      },
    },
    contact: {
      phone: String,
      email: String,
    },
    services: [
      {
        type: String,
      },
    ],
    operatingHours: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Create geospatial index for location-based queries
garbageCollectorSchema.index({ location: '2dsphere' });

export default mongoose.model('GarbageCollector', garbageCollectorSchema);

