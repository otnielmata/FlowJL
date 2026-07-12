import { randomUUID } from "node:crypto";

import mongoose from "mongoose";

const emailCampaignSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: randomUUID
    },
    launchId: {
      type: String,
      required: true,
      index: true
    },
    type: {
      type: String,
      required: true,
      trim: true,
      enum: ["NURTURE", "SALES", "EVENT", "WEBINAR"]
    },
    subject: {
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
    body: {
      type: String,
      default: null,
      trim: true
    },
    status: {
      type: String,
      required: true,
      trim: true,
      enum: ["DRAFT", "IN_REVIEW", "APPROVED", "SCHEDULED", "SENT"]
    },
    reviewStatus: {
      type: String,
      required: true,
      trim: true,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING"
    },
    plannedSendAt: {
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

emailCampaignSchema.index({ launchId: 1, type: 1, status: 1, active: 1 });

export const EmailCampaign = mongoose.model("EmailCampaign", emailCampaignSchema);
