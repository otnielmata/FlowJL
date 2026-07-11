import { randomUUID } from "node:crypto";

import mongoose from "mongoose";

const marketResearchListItemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    rationale: {
      type: String,
      required: true,
      trim: true
    }
  },
  {
    _id: false
  }
);

const marketResearchObjectionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    rebuttal: {
      type: String,
      required: true,
      trim: true
    }
  },
  {
    _id: false
  }
);

const marketResearchFormatSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      trim: true
    },
    angle: {
      type: String,
      required: true,
      trim: true
    }
  },
  {
    _id: false
  }
);

const marketResearchSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: randomUUID
    },
    launchId: {
      type: String,
      required: true,
      index: true
    },
    version: {
      type: Number,
      required: true,
      min: 1
    },
    briefing: {
      type: String,
      required: true,
      trim: true
    },
    objective: {
      type: String,
      required: true,
      trim: true
    },
    productContext: {
      type: String,
      required: true,
      trim: true
    },
    themes: {
      type: [marketResearchListItemSchema],
      default: []
    },
    promises: {
      type: [marketResearchListItemSchema],
      default: []
    },
    objections: {
      type: [marketResearchObjectionSchema],
      default: []
    },
    ctas: {
      type: [String],
      default: []
    },
    suggestedFormats: {
      type: [marketResearchFormatSchema],
      default: []
    },
    humanReviewRequired: {
      type: Boolean,
      default: true
    },
    createdBy: {
      type: String,
      default: null
    },
    updatedBy: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

marketResearchSchema.index({ launchId: 1, version: -1 }, { unique: true });

export const MarketResearch = mongoose.model("MarketResearch", marketResearchSchema);
