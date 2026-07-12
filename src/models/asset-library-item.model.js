import { randomUUID } from "node:crypto";

import mongoose from "mongoose";

const assetLibraryItemSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: randomUUID
    },
    launchId: {
      type: String,
      default: null,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    type: {
      type: String,
      required: true,
      trim: true
    },
    origin: {
      type: String,
      required: true,
      trim: true
    },
    tags: {
      type: [String],
      default: []
    },
    status: {
      type: String,
      required: true,
      trim: true,
      enum: ["AVAILABLE", "ARCHIVED"],
      default: "AVAILABLE"
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

assetLibraryItemSchema.index({ launchId: 1, type: 1, status: 1, active: 1 });
assetLibraryItemSchema.index({ tags: 1 });

export const AssetLibraryItem = mongoose.model("AssetLibraryItem", assetLibraryItemSchema);
