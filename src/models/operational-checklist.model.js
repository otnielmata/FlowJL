import { randomUUID } from "node:crypto";

import mongoose from "mongoose";

export const operationalChecklistOperationTypes = [
  "LAUNCH",
  "CLASS_SCHEDULE",
  "LIVE_EVENT",
  "DISCORD_OPERATION",
  "OPERATIONAL_EMAIL",
  "STUDENT",
  "SUPPORT_TICKET"
];
export const operationalChecklistStatuses = ["OPEN", "PARTIAL", "COMPLETED"];

const operationalChecklistItemSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: randomUUID
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
    _id: false,
    versionKey: false
  }
);

const operationalChecklistHistorySchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: randomUUID
    },
    action: {
      type: String,
      required: true,
      enum: ["CREATED", "UPDATED", "COMPLETED", "DEACTIVATED"]
    },
    fromStatus: {
      type: String,
      default: null,
      enum: ["OPEN", "PARTIAL", "COMPLETED", null]
    },
    toStatus: {
      type: String,
      required: true,
      enum: ["OPEN", "PARTIAL", "COMPLETED"]
    },
    actedBy: {
      type: String,
      required: true
    },
    actedAt: {
      type: Date,
      required: true
    },
    reason: {
      type: String,
      default: null,
      trim: true
    },
    itemsSnapshot: {
      type: [operationalChecklistItemSchema],
      default: []
    }
  },
  {
    _id: false,
    versionKey: false
  }
);

const operationalChecklistSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: randomUUID
    },
    operationType: {
      type: String,
      required: true,
      enum: operationalChecklistOperationTypes,
      trim: true
    },
    contextId: {
      type: String,
      required: true,
      index: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    status: {
      type: String,
      required: true,
      enum: operationalChecklistStatuses,
      default: "OPEN",
      trim: true
    },
    items: {
      type: [operationalChecklistItemSchema],
      default: []
    },
    history: {
      type: [operationalChecklistHistorySchema],
      default: []
    },
    completedAt: {
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

operationalChecklistSchema.index({ operationType: 1, contextId: 1, active: 1 });
operationalChecklistSchema.index({ operationType: 1, status: 1, active: 1 });
operationalChecklistSchema.index({ status: 1, active: 1 });

export const OperationalChecklist = mongoose.model("OperationalChecklist", operationalChecklistSchema);
