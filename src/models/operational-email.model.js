import { randomUUID } from "node:crypto";

import mongoose from "mongoose";

export const operationalEmailStatuses = ["TODO", "IN_PROGRESS", "SCHEDULED", "SENT", "DONE", "BLOCKED", "CANCELED"];

const operationalEmailSchema = new mongoose.Schema(
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
    objective: {
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
      enum: operationalEmailStatuses,
      trim: true
    },
    audience: {
      type: String,
      default: null,
      trim: true
    },
    subject: {
      type: String,
      default: null,
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

operationalEmailSchema.index({ launchId: 1, dueAt: 1, status: 1, active: 1 });
operationalEmailSchema.index({ responsible: 1, dueAt: 1, active: 1 });

export const OperationalEmail = mongoose.model("OperationalEmail", operationalEmailSchema);
