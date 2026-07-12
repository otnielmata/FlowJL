import { randomUUID } from "node:crypto";

import mongoose from "mongoose";

export const liveEventStatuses = ["PLANNED", "CONFIRMED", "LIVE", "COMPLETED", "CANCELED", "RESCHEDULED"];

const liveEventSchema = new mongoose.Schema(
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
    name: {
      type: String,
      required: true,
      trim: true
    },
    scheduledAt: {
      type: Date,
      required: true
    },
    channel: {
      type: String,
      required: true,
      trim: true
    },
    responsible: {
      type: String,
      required: true,
      trim: true
    },
    status: {
      type: String,
      required: true,
      enum: liveEventStatuses,
      trim: true
    },
    accessUrl: {
      type: String,
      default: null,
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

liveEventSchema.index({ launchId: 1, scheduledAt: 1, status: 1, active: 1 });
liveEventSchema.index({ channel: 1, scheduledAt: 1, active: 1 });
liveEventSchema.index({ responsible: 1, scheduledAt: 1, active: 1 });

export const LiveEvent = mongoose.model("LiveEvent", liveEventSchema);
