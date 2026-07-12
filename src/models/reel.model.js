import { randomUUID } from "node:crypto";

import mongoose from "mongoose";

const reelSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: () => randomUUID()
    },
    launchId: {
      type: String,
      default: null,
      index: true
    },
    contentPlanId: {
      type: String,
      default: null,
      index: true
    },
    contentIdeaId: {
      type: String,
      default: null,
      index: true
    },
    sourceType: {
      type: String,
      required: true,
      trim: true,
      enum: ["MANUAL", "IDEA", "CONTENT_PLAN", "AI"]
    },
    theme: {
      type: String,
      required: true,
      trim: true
    },
    objective: {
      type: String,
      required: true,
      trim: true
    },
    hook: {
      type: String,
      required: true,
      trim: true
    },
    cta: {
      type: String,
      required: true,
      trim: true
    },
    script: {
      type: String,
      default: null,
      trim: true
    },
    caption: {
      type: String,
      default: null,
      trim: true
    },
    operationalStatus: {
      type: String,
      required: true,
      trim: true,
      enum: ["DRAFT", "IN_REVIEW", "APPROVED", "SCHEDULED", "PUBLISHED"]
    },
    approvalStatus: {
      type: String,
      required: true,
      trim: true,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING"
    },
    scheduledAt: {
      type: Date,
      default: null
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

reelSchema.index({ launchId: 1, operationalStatus: 1, active: 1 });

export const Reel = mongoose.model("Reel", reelSchema);
