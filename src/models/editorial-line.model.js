import { randomUUID } from "node:crypto";

import mongoose from "mongoose";

const editorialPillarSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: randomUUID
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    objective: {
      type: String,
      required: true,
      trim: true
    },
    priority: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    active: {
      type: Boolean,
      default: true
    }
  },
  {
    _id: false
  }
);

const editorialLineSchema = new mongoose.Schema(
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
    pillars: {
      type: [editorialPillarSchema],
      default: []
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

editorialLineSchema.index({ launchId: 1, version: -1 }, { unique: true });

export const EditorialLine = mongoose.model("EditorialLine", editorialLineSchema);
