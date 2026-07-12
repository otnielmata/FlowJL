import { randomUUID } from "node:crypto";

import mongoose from "mongoose";

const smartScheduleActivitySchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: () => randomUUID()
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
    stage: {
      type: String,
      required: true,
      trim: true
    },
    deliveryType: {
      type: String,
      required: true,
      trim: true
    },
    area: {
      type: String,
      required: true,
      trim: true
    },
    suggestedResponsibleRole: {
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
      trim: true
    }
  },
  {
    _id: false
  }
);

const smartScheduleSchema = new mongoose.Schema(
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
    objective: {
      type: String,
      required: true,
      trim: true
    },
    periodStart: {
      type: Date,
      required: true
    },
    periodEnd: {
      type: Date,
      required: true
    },
    operationalCadenceDays: {
      type: Number,
      required: true,
      min: 1
    },
    contentPlanVersion: {
      type: Number,
      default: null
    },
    activities: {
      type: [smartScheduleActivitySchema],
      default: []
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

smartScheduleSchema.index({ launchId: 1, version: -1 }, { unique: true });

export const SmartSchedule = mongoose.model("SmartSchedule", smartScheduleSchema);
