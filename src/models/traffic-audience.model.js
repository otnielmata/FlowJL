import { randomUUID } from "node:crypto";

import mongoose from "mongoose";

const segmentationCriteriaSchema = new mongoose.Schema(
  {
    demographics: {
      type: [String],
      default: []
    },
    interests: {
      type: [String],
      default: []
    },
    behaviors: {
      type: [String],
      default: []
    },
    locations: {
      type: [String],
      default: []
    },
    exclusions: {
      type: [String],
      default: []
    },
    lookalikeSource: {
      type: String,
      default: null,
      trim: true
    },
    customRules: {
      type: [String],
      default: []
    }
  },
  {
    _id: false
  }
);

const audienceHistorySchema = new mongoose.Schema(
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
    strategySnapshot: {
      type: String,
      default: null
    },
    criteriaSnapshot: {
      type: segmentationCriteriaSchema,
      default: () => ({})
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

const trafficAudienceSchema = new mongoose.Schema(
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
    strategy: {
      type: String,
      required: true,
      trim: true
    },
    segmentationCriteria: {
      type: segmentationCriteriaSchema,
      required: true,
      default: () => ({})
    },
    status: {
      type: String,
      required: true,
      trim: true,
      enum: ["DRAFT", "ACTIVE", "PAUSED", "ARCHIVED"],
      default: "DRAFT"
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
      type: [audienceHistorySchema],
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

trafficAudienceSchema.index({ launchId: 1, status: 1, active: 1 });
trafficAudienceSchema.index({ campaignIds: 1 });
trafficAudienceSchema.index({ launchId: 1, name: 1, active: 1 }, { unique: true });

export const TrafficAudience = mongoose.model("TrafficAudience", trafficAudienceSchema);
