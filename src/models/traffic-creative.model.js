import { randomUUID } from "node:crypto";

import mongoose from "mongoose";

const trafficCreativeHistorySchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: () => randomUUID()
    },
    action: {
      type: String,
      required: true,
      enum: ["CREATED", "UPDATED", "DEACTIVATED"]
    },
    fromStatus: {
      type: String,
      default: null,
      enum: ["DRAFT", "IN_REVIEW", "APPROVED", "ACTIVE", "PAUSED", "ARCHIVED", null]
    },
    toStatus: {
      type: String,
      default: null,
      enum: ["DRAFT", "IN_REVIEW", "APPROVED", "ACTIVE", "PAUSED", "ARCHIVED", null]
    },
    fromClassification: {
      type: String,
      default: null,
      enum: ["UNTESTED", "CONTROL", "WINNER", "LOSER", "LEARNING", null]
    },
    toClassification: {
      type: String,
      default: null,
      enum: ["UNTESTED", "CONTROL", "WINNER", "LOSER", "LEARNING", null]
    },
    reason: {
      type: String,
      default: null,
      trim: true
    },
    actedBy: {
      type: String,
      required: true
    },
    actedAt: {
      type: Date,
      required: true
    }
  },
  {
    _id: false
  }
);

const trafficCreativeSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: () => randomUUID()
    },
    campaignId: {
      type: String,
      required: true,
      index: true
    },
    launchId: {
      type: String,
      required: true,
      index: true
    },
    assetId: {
      type: String,
      default: null,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    format: {
      type: String,
      required: true,
      trim: true,
      enum: ["IMAGE", "VIDEO", "CAROUSEL", "COPY", "STORY", "SHORTS", "OTHER"]
    },
    objective: {
      type: String,
      required: true,
      trim: true
    },
    origin: {
      type: String,
      required: true,
      trim: true,
      enum: ["ASSET_LIBRARY", "MANUAL", "AI", "EXTERNAL"]
    },
    status: {
      type: String,
      required: true,
      trim: true,
      enum: ["DRAFT", "IN_REVIEW", "APPROVED", "ACTIVE", "PAUSED", "ARCHIVED"]
    },
    classification: {
      type: String,
      required: true,
      trim: true,
      enum: ["UNTESTED", "CONTROL", "WINNER", "LOSER", "LEARNING"],
      default: "UNTESTED"
    },
    performance: {
      impressions: {
        type: Number,
        default: 0,
        min: 0
      },
      clicks: {
        type: Number,
        default: 0,
        min: 0
      },
      conversions: {
        type: Number,
        default: 0,
        min: 0
      },
      spend: {
        type: Number,
        default: 0,
        min: 0
      }
    },
    history: {
      type: [trafficCreativeHistorySchema],
      default: []
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

trafficCreativeSchema.index({ campaignId: 1, status: 1, active: 1 });
trafficCreativeSchema.index({ launchId: 1, classification: 1, active: 1 });
trafficCreativeSchema.index({ campaignId: 1, name: 1, active: 1 }, { unique: true });

export const TrafficCreative = mongoose.model("TrafficCreative", trafficCreativeSchema);
