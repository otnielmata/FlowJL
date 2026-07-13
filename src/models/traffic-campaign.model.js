import { randomUUID } from "node:crypto";

import mongoose from "mongoose";

const trafficCampaignHistorySchema = new mongoose.Schema(
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
      enum: ["DRAFT", "PLANNED", "ACTIVE", "PAUSED", "FINISHED", "CANCELED", null]
    },
    toStatus: {
      type: String,
      default: null,
      enum: ["DRAFT", "PLANNED", "ACTIVE", "PAUSED", "FINISHED", "CANCELED", null]
    },
    fromPeriodStart: {
      type: Date,
      default: null
    },
    toPeriodStart: {
      type: Date,
      default: null
    },
    fromPeriodEnd: {
      type: Date,
      default: null
    },
    toPeriodEnd: {
      type: Date,
      default: null
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

const trafficCampaignSchema = new mongoose.Schema(
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
    name: {
      type: String,
      required: true,
      trim: true
    },
    objective: {
      type: String,
      required: true,
      trim: true
    },
    channel: {
      type: String,
      required: true,
      trim: true,
      enum: ["META", "GOOGLE", "YOUTUBE", "TIKTOK", "LINKEDIN", "OTHER"]
    },
    periodStart: {
      type: Date,
      required: true
    },
    periodEnd: {
      type: Date,
      required: true
    },
    status: {
      type: String,
      required: true,
      trim: true,
      enum: ["DRAFT", "PLANNED", "ACTIVE", "PAUSED", "FINISHED", "CANCELED"]
    },
    budget: {
      type: Number,
      default: null,
      min: 0
    },
    externalCampaignId: {
      type: String,
      default: null,
      trim: true
    },
    creativeIds: {
      type: [String],
      default: []
    },
    audienceIds: {
      type: [String],
      default: []
    },
    pixelIds: {
      type: [String],
      default: []
    },
    conversionEventIds: {
      type: [String],
      default: []
    },
    history: {
      type: [trafficCampaignHistorySchema],
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

trafficCampaignSchema.index({ launchId: 1, status: 1, active: 1 });
trafficCampaignSchema.index({ launchId: 1, name: 1, active: 1 }, { unique: true });
trafficCampaignSchema.index({ periodStart: 1, periodEnd: 1 });

export const TrafficCampaign = mongoose.model("TrafficCampaign", trafficCampaignSchema);
