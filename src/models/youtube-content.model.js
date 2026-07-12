import { randomUUID } from "node:crypto";

import mongoose from "mongoose";

const youtubeContentSchema = new mongoose.Schema(
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
    editorialLineVersion: {
      type: Number,
      required: true,
      min: 1
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
    format: {
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
    ownerRole: {
      type: String,
      default: null,
      trim: true
    },
    operationalStatus: {
      type: String,
      required: true,
      trim: true,
      enum: ["PLANNED", "SCRIPTING", "RECORDING", "EDITING", "SCHEDULED", "PUBLISHED"],
      default: "PLANNED"
    },
    recordingAt: {
      type: Date,
      default: null
    },
    publishAt: {
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

youtubeContentSchema.index({ launchId: 1, operationalStatus: 1, active: 1 });

export const YouTubeContent = mongoose.model("YouTubeContent", youtubeContentSchema);
