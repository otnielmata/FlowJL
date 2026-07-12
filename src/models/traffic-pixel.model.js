import { randomUUID } from "node:crypto";

import mongoose from "mongoose";

const pixelSecretSchema = new mongoose.Schema(
  {
    accessTokenHash: {
      type: String,
      default: null
    },
    secretHash: {
      type: String,
      default: null
    },
    tokenExpiresAt: {
      type: Date,
      default: null
    }
  },
  {
    _id: false
  }
);

const pixelHistorySchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: () => randomUUID()
    },
    action: {
      type: String,
      required: true,
      enum: ["CREATED", "UPDATED", "LINKS_UPDATED", "DEACTIVATED"]
    },
    fromStatus: {
      type: String,
      default: null,
      enum: ["DRAFT", "ACTIVE", "PAUSED", "ERROR", "ARCHIVED", null]
    },
    toStatus: {
      type: String,
      default: null,
      enum: ["DRAFT", "ACTIVE", "PAUSED", "ERROR", "ARCHIVED", null]
    },
    campaignIdsSnapshot: {
      type: [String],
      default: []
    },
    conversionEventIdsSnapshot: {
      type: [String],
      default: []
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

const trafficPixelSchema = new mongoose.Schema(
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
    platform: {
      type: String,
      required: true,
      trim: true,
      enum: ["META", "GOOGLE", "YOUTUBE", "TIKTOK", "LINKEDIN", "OTHER"]
    },
    externalPixelId: {
      type: String,
      required: true,
      trim: true
    },
    purpose: {
      type: String,
      required: true,
      trim: true
    },
    status: {
      type: String,
      required: true,
      trim: true,
      enum: ["DRAFT", "ACTIVE", "PAUSED", "ERROR", "ARCHIVED"],
      default: "DRAFT"
    },
    campaignIds: {
      type: [String],
      default: []
    },
    conversionEventIds: {
      type: [String],
      default: []
    },
    secrets: {
      type: pixelSecretSchema,
      default: () => ({})
    },
    active: {
      type: Boolean,
      default: true
    },
    deactivatedAt: {
      type: Date,
      default: null
    },
    history: {
      type: [pixelHistorySchema],
      default: []
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

trafficPixelSchema.index({ launchId: 1, platform: 1, active: 1 });
trafficPixelSchema.index({ platform: 1, externalPixelId: 1 }, { unique: true });
trafficPixelSchema.index({ campaignIds: 1 });
trafficPixelSchema.index({ conversionEventIds: 1 });

export const TrafficPixel = mongoose.model("TrafficPixel", trafficPixelSchema);
