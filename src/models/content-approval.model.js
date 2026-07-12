import { randomUUID } from "node:crypto";

import mongoose from "mongoose";

const approvalHistoryEntrySchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: () => randomUUID()
    },
    fromStatus: {
      type: String,
      required: true,
      enum: ["CREATED", "REVIEW", "EXPERT", "APPROVED", "PUBLISHED"]
    },
    toStatus: {
      type: String,
      required: true,
      enum: ["CREATED", "REVIEW", "EXPERT", "APPROVED", "PUBLISHED"]
    },
    observations: {
      type: String,
      default: null,
      trim: true
    },
    actorPermission: {
      type: String,
      required: true,
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

const contentApprovalSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: () => randomUUID()
    },
    contentType: {
      type: String,
      required: true,
      trim: true,
      enum: ["REEL", "CAROUSEL", "STORY_SEQUENCE", "EMAIL_CAMPAIGN", "YOUTUBE_CONTENT"]
    },
    contentId: {
      type: String,
      required: true
    },
    launchId: {
      type: String,
      default: null,
      index: true
    },
    currentStatus: {
      type: String,
      required: true,
      trim: true,
      enum: ["CREATED", "REVIEW", "EXPERT", "APPROVED", "PUBLISHED"],
      default: "CREATED"
    },
    history: {
      type: [approvalHistoryEntrySchema],
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

contentApprovalSchema.index({ contentType: 1, contentId: 1 }, { unique: true });

export const ContentApproval = mongoose.model("ContentApproval", contentApprovalSchema);
