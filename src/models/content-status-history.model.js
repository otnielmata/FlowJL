import { randomUUID } from "node:crypto";

import mongoose from "mongoose";

const contentStatusHistorySchema = new mongoose.Schema(
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
    fromStatus: {
      type: String,
      required: true,
      trim: true
    },
    toStatus: {
      type: String,
      required: true,
      trim: true
    },
    reason: {
      type: String,
      default: null,
      trim: true
    },
    changedBy: {
      type: String,
      required: true
    },
    changedAt: {
      type: Date,
      required: true
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

contentStatusHistorySchema.index({ contentType: 1, contentId: 1, changedAt: 1 });
contentStatusHistorySchema.index({ launchId: 1, changedAt: 1 });

export const ContentStatusHistory = mongoose.model("ContentStatusHistory", contentStatusHistorySchema);
