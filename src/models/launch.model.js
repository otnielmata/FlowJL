import { randomUUID } from "node:crypto";

import mongoose from "mongoose";

const launchMilestoneSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    scheduledAt: {
      type: Date,
      required: true
    }
  },
  {
    _id: false
  }
);

const launchSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: () => randomUUID()
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    expert: {
      type: String,
      required: true,
      trim: true
    },
    product: {
      type: String,
      required: true,
      trim: true
    },
    responsibleUserId: {
      type: String,
      default: null,
      index: true
    },
    status: {
      type: String,
      required: true,
      trim: true,
      enum: ["PLANNING", "WARMUP", "PRE_LAUNCH", "OPEN_CART", "IN_PROGRESS", "COMPLETED", "PAUSED", "ARCHIVED"],
      default: "PLANNING"
    },
    baseDate: {
      type: Date,
      required: true
    },
    periodStart: {
      type: Date,
      required: true
    },
    periodEnd: {
      type: Date,
      required: true
    },
    milestones: {
      type: [launchMilestoneSchema],
      default: []
    },
    phaseDates: {
      warmupStart: {
        type: Date,
        default: null
      },
      cpl1At: {
        type: Date,
        default: null
      },
      cpl2At: {
        type: Date,
        default: null
      },
      cpl3At: {
        type: Date,
        default: null
      },
      cartOpenAt: {
        type: Date,
        default: null
      },
      cartCloseAt: {
        type: Date,
        default: null
      },
      deliveryAt: {
        type: Date,
        default: null
      }
    },
    goals: {
      leadTarget: {
        type: Number,
        default: null,
        min: 0
      },
      salesTarget: {
        type: Number,
        default: null,
        min: 0
      },
      revenueTarget: {
        type: Number,
        default: null,
        min: 0
      }
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

launchSchema.index({ status: 1, active: 1, periodStart: 1 });
launchSchema.index({ responsibleUserId: 1, active: 1, periodStart: 1 });

export const Launch = mongoose.model("Launch", launchSchema);
