import { randomUUID } from "node:crypto";

import mongoose from "mongoose";

export const classScheduleStatuses = ["PLANNED", "CONFIRMED", "COMPLETED", "CANCELED", "RESCHEDULED"];

const classScheduleSchema = new mongoose.Schema(
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
    title: {
      type: String,
      required: true,
      trim: true
    },
    scheduledAt: {
      type: Date,
      required: true
    },
    responsible: {
      type: String,
      required: true,
      trim: true
    },
    status: {
      type: String,
      required: true,
      enum: classScheduleStatuses,
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

classScheduleSchema.index({ launchId: 1, scheduledAt: 1, status: 1, active: 1 });
classScheduleSchema.index({ responsible: 1, scheduledAt: 1, active: 1 });

export const ClassSchedule = mongoose.model("ClassSchedule", classScheduleSchema);
