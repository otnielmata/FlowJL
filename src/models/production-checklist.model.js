import { randomUUID } from "node:crypto";

import mongoose from "mongoose";

const checklistItemSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: () => randomUUID()
    },
    label: {
      type: String,
      required: true,
      trim: true
    },
    required: {
      type: Boolean,
      default: true
    },
    completed: {
      type: Boolean,
      default: false
    },
    completedBy: {
      type: String,
      default: null
    },
    completedAt: {
      type: Date,
      default: null
    },
    notes: {
      type: String,
      default: null,
      trim: true
    }
  },
  {
    _id: false
  }
);

const checklistHistorySchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: () => randomUUID()
    },
    action: {
      type: String,
      required: true,
      enum: ["CREATED", "UPDATED", "COMPLETED", "REOPENED"]
    },
    fromStatus: {
      type: String,
      default: null,
      enum: ["OPEN", "PARTIAL", "COMPLETED", "REOPENED", null]
    },
    toStatus: {
      type: String,
      required: true,
      enum: ["OPEN", "PARTIAL", "COMPLETED", "REOPENED"]
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
    },
    itemsSnapshot: {
      type: [checklistItemSchema],
      default: []
    }
  },
  {
    _id: false
  }
);

const productionChecklistSchema = new mongoose.Schema(
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
    contentType: {
      type: String,
      required: true,
      trim: true,
      enum: ["REEL", "CAROUSEL", "STORY_SEQUENCE", "EMAIL_CAMPAIGN", "YOUTUBE_CONTENT"]
    },
    contentId: {
      type: String,
      required: true,
      index: true
    },
    status: {
      type: String,
      required: true,
      trim: true,
      enum: ["OPEN", "PARTIAL", "COMPLETED", "REOPENED"],
      default: "OPEN"
    },
    items: {
      type: [checklistItemSchema],
      default: []
    },
    history: {
      type: [checklistHistorySchema],
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

productionChecklistSchema.index({ contentType: 1, contentId: 1, active: 1 }, { unique: true });
productionChecklistSchema.index({ launchId: 1, status: 1, active: 1 });

export const ProductionChecklist = mongoose.model("ProductionChecklist", productionChecklistSchema);
