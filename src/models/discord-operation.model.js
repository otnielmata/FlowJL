import { randomUUID } from "node:crypto";

import mongoose from "mongoose";

export const discordOperationStatuses = ["TODO", "IN_PROGRESS", "DONE", "BLOCKED", "CANCELED"];

const discordOperationSchema = new mongoose.Schema(
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
    type: {
      type: String,
      required: true,
      trim: true
    },
    activity: {
      type: String,
      required: true,
      trim: true
    },
    responsible: {
      type: String,
      required: true,
      trim: true
    },
    dueAt: {
      type: Date,
      required: true
    },
    status: {
      type: String,
      required: true,
      enum: discordOperationStatuses,
      trim: true
    },
    observations: {
      type: String,
      default: null,
      trim: true
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

discordOperationSchema.index({ launchId: 1, dueAt: 1, status: 1, active: 1 });
discordOperationSchema.index({ type: 1, status: 1, active: 1 });
discordOperationSchema.index({ responsible: 1, dueAt: 1, active: 1 });

export const DiscordOperation = mongoose.model("DiscordOperation", discordOperationSchema);
