import { randomUUID } from "node:crypto";

import mongoose from "mongoose";

export const aiMetricInsightFocusAreas = ["GENERAL", "TRAFFIC", "CONTENT", "CONVERSION", "REVENUE"];
export const aiMetricInsightSuggestionPriorities = ["LOW", "MEDIUM", "HIGH"];

const evidenceRefSchema = new mongoose.Schema(
  {
    sourceType: {
      type: String,
      required: true,
      enum: ["TRAFFIC_SNAPSHOT", "HISTORICAL_CONTENT", "AGGREGATED_METRIC"]
    },
    sourceId: {
      type: String,
      default: null
    },
    label: {
      type: String,
      required: true,
      trim: true
    },
    metric: {
      type: String,
      required: true,
      trim: true
    },
    value: {
      type: Number,
      required: true
    }
  },
  {
    _id: false,
    versionKey: false
  }
);

const suggestionSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: randomUUID
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: String,
      required: true,
      trim: true
    },
    priority: {
      type: String,
      required: true,
      enum: aiMetricInsightSuggestionPriorities,
      default: "MEDIUM"
    },
    recommendation: {
      type: String,
      required: true,
      trim: true
    },
    justification: {
      type: String,
      required: true,
      trim: true
    },
    humanReviewRequired: {
      type: Boolean,
      default: true
    },
    evidenceRefs: {
      type: [evidenceRefSchema],
      default: []
    }
  },
  {
    versionKey: false
  }
);

const aiMetricInsightSchema = new mongoose.Schema(
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
    objective: {
      type: String,
      required: true,
      trim: true
    },
    focusArea: {
      type: String,
      required: true,
      enum: aiMetricInsightFocusAreas,
      default: "GENERAL"
    },
    periodStart: {
      type: Date,
      default: null
    },
    periodEnd: {
      type: Date,
      default: null
    },
    suggestions: {
      type: [suggestionSchema],
      default: []
    },
    historicalBasis: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    },
    internalProcessingNotes: {
      type: String,
      default: null,
      trim: true
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

aiMetricInsightSchema.index({ launchId: 1, createdAt: -1, active: 1 });
aiMetricInsightSchema.index({ focusArea: 1, createdAt: -1, active: 1 });

export const AiMetricInsight = mongoose.model("AiMetricInsight", aiMetricInsightSchema);
