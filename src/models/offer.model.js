import { randomUUID } from "node:crypto";

import mongoose from "mongoose";

const offerSchema = new mongoose.Schema(
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
    version: {
      type: Number,
      required: true,
      min: 1
    },
    product: {
      type: String,
      required: true,
      trim: true
    },
    transformation: {
      type: String,
      required: true,
      trim: true
    },
    promise: {
      type: String,
      required: true,
      trim: true
    },
    benefits: {
      type: [String],
      default: []
    },
    differentials: {
      type: [String],
      default: []
    },
    avatarVersion: {
      type: Number,
      default: null
    },
    positioningContext: {
      type: String,
      default: null,
      trim: true
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

offerSchema.index({ launchId: 1, version: -1 }, { unique: true });

export const Offer = mongoose.model("Offer", offerSchema);
