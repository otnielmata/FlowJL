import { randomUUID } from "node:crypto";

import mongoose from "mongoose";

const competitorEvidenceSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: () => randomUUID()
    },
    channel: {
      type: String,
      required: true,
      trim: true
    },
    headline: {
      type: String,
      required: true,
      trim: true
    },
    promise: {
      type: String,
      required: true,
      trim: true
    },
    trigger: {
      type: String,
      required: true,
      trim: true
    },
    observations: {
      type: String,
      required: true,
      trim: true
    },
    capturedAt: {
      type: Date,
      required: true
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
    _id: false
  }
);

const competitorResearchSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: () => randomUUID()
    },
    launchId: {
      type: String,
      required: true,
      index: true
    },
    competitorName: {
      type: String,
      required: true,
      trim: true
    },
    evidences: {
      type: [competitorEvidenceSchema],
      default: []
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

competitorResearchSchema.index({ launchId: 1, competitorName: 1 }, { unique: true });

export const CompetitorResearch = mongoose.model("CompetitorResearch", competitorResearchSchema);
