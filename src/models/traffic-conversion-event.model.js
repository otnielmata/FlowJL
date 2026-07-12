import { randomUUID } from "node:crypto";

import mongoose from "mongoose";

const conversionEventHistorySchema = new mongoose.Schema(
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
      enum: ["DRAFT", "ACTIVE", "PAUSED", "ARCHIVED", null]
    },
    toStatus: {
      type: String,
      default: null,
      enum: ["DRAFT", "ACTIVE", "PAUSED", "ARCHIVED", null]
    },
    campaignIdsSnapshot: {
      type: [String],
      default: []
    },
    pixelIdsSnapshot: {
      type: [String],
      default: []
    },
    eventAtSnapshot: {
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

const trafficConversionEventSchema = new mongoose.Schema(
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
    campaignIds: {
      type: [String],
      default: []
    },
    pixelIds: {
      type: [String],
      default: []
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
    origin: {
      type: String,
      required: true,
      trim: true,
      enum: ["WEB", "CHECKOUT", "FORM", "WHATSAPP", "CRM", "ADS_PLATFORM", "MANUAL", "OTHER"]
    },
    status: {
      type: String,
      required: true,
      trim: true,
      enum: ["DRAFT", "ACTIVE", "PAUSED", "ARCHIVED"],
      default: "DRAFT"
    },
    eventAt: {
      type: Date,
      default: null
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
      type: [conversionEventHistorySchema],
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

trafficConversionEventSchema.index({ launchId: 1, status: 1, active: 1 });
trafficConversionEventSchema.index({ campaignIds: 1 });
trafficConversionEventSchema.index({ pixelIds: 1 });
trafficConversionEventSchema.index({ launchId: 1, name: 1, origin: 1, active: 1 }, { unique: true });

export const TrafficConversionEvent = mongoose.model("TrafficConversionEvent", trafficConversionEventSchema);
