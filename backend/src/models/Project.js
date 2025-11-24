import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema(
  {
    projectName: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    materials: [
      {
        name: {
          type: String,
          required: true,
        },
        quantity: {
          type: String,
          default: '',
        },
      },
    ],
    // Normalized material keywords for search
    normalizedMaterials: [String],
    // Embedding vector (384 dimensions for MiniLM)
    embedding: [Number],
    steps: [
      {
        title: String,
        action: String,
        details: String,
        purpose: String,
        tools: [String],
        warnings: [String],
      },
    ],
    referenceVideo: {
      type: String,
      default: '',
    },
    // Original user input that generated this project
    inputPrompt: {
      type: String,
      default: '',
    },
    // Generation status: 'generating', 'completed', 'failed'
    status: {
      type: String,
      enum: ['generating', 'completed', 'failed'],
      default: 'completed',
    },
    // Lock to prevent duplicate generation jobs (background vs stream)
    generationLock: {
      type: Boolean,
      default: false,
    },
    // Optional metadata about who/what started generation
    generationBy: {
      type: String,
      default: '',
    },
    generationStartedAt: {
      type: Date,
    },
    // User rating (0-5 scale)
    userRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    // Ranking votes and computed score for future ranking features
    ranks: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        value: { type: Number },
      },
    ],
    rankScore: {
      type: Number,
      default: 0,
    },
    // Similarity score from search (not stored, computed on-the-fly)
    similarityScore: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Update vector index when a project is saved or updated
projectSchema.post('save', async function(doc) {
  try {
    if (doc.embedding && doc.embedding.length > 0) {
      await vectorDB.initialize();
      await vectorDB.addVectors([doc.embedding], [doc._id.toString()]);
    }
  } catch (error) {
    console.error('Error updating vector index:', error);
  }
});

// Remove from vector index when a project is deleted
projectSchema.post('remove', async function(doc) {
  try {
    await vectorDB.initialize();
    await vectorDB.removeVectors([doc._id.toString()]);
  } catch (error) {
    console.error('Error removing from vector index:', error);
  }
});

// Index for faster similarity searches
projectSchema.index({ normalizedMaterials: 1 });
projectSchema.index({ status: 1 });
projectSchema.index({ createdAt: -1 });

export default mongoose.model('Project', projectSchema);

