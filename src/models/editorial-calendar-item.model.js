import { randomUUID } from "node:crypto";

import mongoose from "mongoose";

const editorialCalendarItemSchema = new mongoose.Schema(
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
    notes: {
      type: String,
      default: null,
      trim: true
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

editorialCalendarItemSchema.index({ launchId: 1, publishAt: 1, channel: 1, active: 1 });

export const EditorialCalendarItem = mongoose.model("EditorialCalendarItem", editorialCalendarItemSchema);
