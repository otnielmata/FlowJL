import { randomUUID } from "node:crypto";

import mongoose from "mongoose";

const publicationSchema = new mongoose.Schema(
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
    channel: {
      type: String,
      required: true,
      trim: true
    },
    publishAt: {
      type: Date,
      required: true
    },
    responsible: {
      type: String,
      required: true,
      trim: true
    },
    status: {
      type: String,
      required: true,
      trim: true,
      enum: ["PLANNED", "SCHEDULED", "PUBLISHED", "ISSUE"],
      default: "PLANNED"
    },
    issueReason: {
      type: String,
      default: null,
      trim: true
    },
    publishedAt: {
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

publicationSchema.index({ contentType: 1, contentId: 1 }, { unique: true });
publicationSchema.index({ launchId: 1, status: 1, publishAt: 1, active: 1 });

export const Publication = mongoose.model("Publication", publicationSchema);
