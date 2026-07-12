import { randomUUID } from "node:crypto";

import mongoose from "mongoose";

const positioningSchema = new mongoose.Schema(
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
    thesis: {
      type: String,
      required: true,
      trim: true
    },
    centralPromise: {
      type: String,
      required: true,
      trim: true
    },
    differentiators: {
      type: [String],
      default: []
    },
    references: {
      type: [String],
      default: []
    },
    offerVersion: {
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

positioningSchema.index({ launchId: 1, version: -1 }, { unique: true });

export const Positioning = mongoose.model("Positioning", positioningSchema);
