import { randomUUID } from "node:crypto";

import mongoose from "mongoose";

export const aiScheduleReviewStatuses = ["PENDING_REVIEW", "APPROVED", "REJECTED"];

const aiScheduleActivitySchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: randomUUID
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    stage: {
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
    dependencies: {
      type: [String],
      default: []
    },
    reviewNotes: {
      type: [String],
      default: []
    }
  },
  {
    _id: false,
    versionKey: false
  }
);

const aiSchedulePhaseSchema = new mongoose.Schema(
  {
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
    startsAt: {
      type: Date,
      required: true
    },
    endsAt: {
      type: Date,
      required: true
    },
    activities: {
      type: [aiScheduleActivitySchema],
      default: []
    }
  },
  {
    _id: false,
    versionKey: false
  }
);

const aiScheduleSourceContextSchema = new mongoose.Schema(
  {
    launchId: {
      type: String,
      required: true
    },
    launchName: {
      type: String,
      required: true,
      trim: true
    },
    product: {
      type: String,
      required: true,
      trim: true
    },
    expert: {
      type: String,
      required: true,
      trim: true
    },
    contentPlanVersion: {
      type: Number,
      default: null
    },
    smartScheduleVersion: {
      type: Number,
      default: null
    },
    internalSignals: {
      type: Map,
      of: Number,
      default: {}
    }
  },
  {
    _id: false,
    versionKey: false
  }
);

const aiScheduleSchema = new mongoose.Schema(
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
    briefing: {
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
    phases: {
      type: [aiSchedulePhaseSchema],
      default: []
    },
    reviewNotes: {
      type: [String],
      default: []
    },
    sourceContext: {
      type: aiScheduleSourceContextSchema,
      required: true
    },
    generatedByAI: {
      type: Boolean,
      default: true
    },
    humanReviewRequired: {
      type: Boolean,
      default: true
    },
    reviewStatus: {
      type: String,
      required: true,
      enum: aiScheduleReviewStatuses,
      default: "PENDING_REVIEW"
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

aiScheduleSchema.index({ launchId: 1, reviewStatus: 1, active: 1, createdAt: -1 });

export const AiSchedule = mongoose.model("AiSchedule", aiScheduleSchema);
