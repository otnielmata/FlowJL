import { randomUUID } from "node:crypto";

import mongoose from "mongoose";

const expertApprovalSchema = new mongoose.Schema(
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
    status: {
      type: String,
      required: true,
      trim: true,
      enum: ["IN_REVIEW", "APPROVED", "REJECTED"]
    },
    submittedAt: {
      type: Date,
      required: true
    },
    submittedBy: {
      type: String,
      required: true
    },
    decisionAt: {
      type: Date,
      default: null
    },
    decidedBy: {
      type: String,
      default: null
    },
    observations: {
      type: String,
      default: null,
      trim: true
    },
    marketResearchVersion: {
      type: Number,
      default: null
    },
    competitorResearchCount: {
      type: Number,
      default: 0
    },
    avatarVersion: {
      type: Number,
      default: null
    },
    offerVersion: {
      type: Number,
      default: null
    },
    positioningVersion: {
      type: Number,
      default: null
    },
    editorialLineVersion: {
      type: Number,
      default: null
    },
    contentPlanVersion: {
      type: Number,
      default: null
    },
    smartScheduleVersion: {
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

expertApprovalSchema.index({ launchId: 1, version: -1 }, { unique: true });

export const ExpertApproval = mongoose.model("ExpertApproval", expertApprovalSchema);
