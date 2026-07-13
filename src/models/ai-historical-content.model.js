import { randomUUID } from "node:crypto";

import mongoose from "mongoose";

export const historicalContentFormats = ["REEL", "CAROUSEL", "STORY_SEQUENCE", "EMAIL", "YOUTUBE", "AD", "LANDING_PAGE", "SCRIPT", "COPY"];
export const historicalContentOrigins = ["ORIGINAL", "REUSED"];

const performanceMetricsSchema = new mongoose.Schema(
  {
    views: { type: Number, default: 0, min: 0 },
    clicks: { type: Number, default: 0, min: 0 },
    conversions: { type: Number, default: 0, min: 0 },
    revenue: { type: Number, default: 0, min: 0 },
    engagementRate: { type: Number, default: 0, min: 0 },
    score: { type: Number, required: true, min: 0 }
  },
  {
    _id: false,
    versionKey: false
  }
);

const aiHistoricalContentSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: randomUUID
    },
    launchId: {
      type: String,
      default: null,
      index: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    format: {
      type: String,
      required: true,
      enum: historicalContentFormats,
      trim: true
    },
    objective: {
      type: String,
      required: true,
      trim: true
    },
    summary: {
      type: String,
      required: true,
      trim: true
    },
    tags: {
      type: [String],
      default: []
    },
    origin: {
      type: String,
      required: true,
      enum: historicalContentOrigins,
      default: "ORIGINAL",
      trim: true
    },
    reusedFromContentId: {
      type: String,
      default: null
    },
    performance: {
      type: performanceMetricsSchema,
      required: true
    },
    sensitiveNotes: {
      type: String,
      default: null,
      trim: true
    },
    active: {
      type: Boolean,
      default: true
    },
    deactivatedAt: {
      type: Date,
      default: null
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

aiHistoricalContentSchema.index({ format: 1, "performance.score": -1, active: 1 });
aiHistoricalContentSchema.index({ objective: "text", title: "text", summary: "text", tags: "text" });
aiHistoricalContentSchema.index({ launchId: 1, format: 1, active: 1 });

export const AiHistoricalContent = mongoose.model("AiHistoricalContent", aiHistoricalContentSchema);
