import { randomUUID } from "node:crypto";

import mongoose from "mongoose";

const contentIdeaSchema = new mongoose.Schema(
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
    suggestedFormat: {
      type: String,
      required: true,
      trim: true
    },
    observations: {
      type: String,
      required: true,
      trim: true
    },
    status: {
      type: String,
      required: true,
      trim: true,
      enum: ["BACKLOG", "SELECTED", "PRODUCED", "DISCARDED"],
      default: "BACKLOG"
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

contentIdeaSchema.index({ launchId: 1, objective: 1, status: 1, active: 1 });

export const ContentIdea = mongoose.model("ContentIdea", contentIdeaSchema);
