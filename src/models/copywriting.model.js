import { randomUUID } from "node:crypto";

import mongoose from "mongoose";

const copywritingBodySectionSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      required: true,
      trim: true
    },
    content: {
      type: String,
      required: true,
      trim: true
    }
  },
  {
    _id: false
  }
);

const sourceContextSchema = new mongoose.Schema(
  {
    launchId: {
      type: String,
      required: true
    },
    launchName: {
      type: String,
      required: true,
      trim: true
    },
    product: {
      type: String,
      required: true,
      trim: true
    },
    expert: {
      type: String,
      required: true,
      trim: true
    },
    offerVersion: {
      type: Number,
      default: null
    },
    positioningVersion: {
      type: Number,
      default: null
    },
    editorialLineVersion: {
      type: Number,
      default: null
    },
    avatarVersion: {
      type: Number,
      default: null
    },
    editorialPillars: {
      type: [String],
      default: []
    },
    languageCues: {
      type: [String],
      default: []
    }
  },
  {
    _id: false
  }
);

const copywritingSchema = new mongoose.Schema(
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
    format: {
      type: String,
      required: true,
      trim: true,
      enum: ["REEL", "CAROUSEL", "STORIES", "EMAIL", "YOUTUBE", "ADS", "LANDING_PAGE"]
    },
    objective: {
      type: String,
      required: true,
      trim: true
    },
    briefing: {
      type: String,
      required: true,
      trim: true
    },
    headline: {
      type: String,
      required: true,
      trim: true
    },
    hook: {
      type: String,
      required: true,
      trim: true
    },
    bodySections: {
      type: [copywritingBodySectionSchema],
      default: []
    },
    cta: {
      type: String,
      required: true,
      trim: true
    },
    reviewNotes: {
      type: [String],
      default: []
    },
    sourceContext: {
      type: sourceContextSchema,
      required: true
    },
    generatedByAI: {
      type: Boolean,
      default: true
    },
    humanReviewRequired: {
      type: Boolean,
      default: true
    },
    active: {
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

copywritingSchema.index({ launchId: 1, format: 1, active: 1, createdAt: -1 });

export const Copywriting = mongoose.model("Copywriting", copywritingSchema);
