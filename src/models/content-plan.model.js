import { randomUUID } from "node:crypto";

import mongoose from "mongoose";

const contentPlanItemSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: () => randomUUID()
    },
    theme: {
      type: String,
      required: true,
      trim: true
    },
    format: {
      type: String,
      required: true,
      trim: true
    },
    objective: {
      type: String,
      required: true,
      trim: true
    },
    cta: {
      type: String,
      required: true,
      trim: true
    },
    stage: {
      type: String,
      required: true,
      trim: true
    },
    periodLabel: {
      type: String,
      required: true,
      trim: true
    },
    active: {
      type: Boolean,
      default: true
    }
  },
  {
    _id: false
  }
);

const contentPlanSchema = new mongoose.Schema(
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
    version: {
      type: Number,
      required: true,
      min: 1
    },
    items: {
      type: [contentPlanItemSchema],
      default: []
    },
    editorialLineVersion: {
      type: Number,
      default: null
    },
    isCurrent: {
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

contentPlanSchema.index({ launchId: 1, version: -1 }, { unique: true });

export const ContentPlan = mongoose.model("ContentPlan", contentPlanSchema);
