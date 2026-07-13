import { randomUUID } from "node:crypto";

import mongoose from "mongoose";

const strategyReferenceSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: () => randomUUID()
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    type: {
      type: String,
      required: true,
      trim: true
    },
    url: {
      type: String,
      default: null,
      trim: true
    },
    notes: {
      type: String,
      default: null,
      trim: true
    }
  },
  {
    _id: false
  }
);

const strategyCommentSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: () => randomUUID()
    },
    authorUserId: {
      type: String,
      required: true
    },
    message: {
      type: String,
      required: true,
      trim: true
    },
    createdAt: {
      type: Date,
      default: () => new Date()
    }
  },
  {
    _id: false
  }
);

const strategyHistoryEntrySchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: () => randomUUID()
    },
    action: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    actorUserId: {
      type: String,
      default: null
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    occurredAt: {
      type: Date,
      default: () => new Date()
    }
  },
  {
    _id: false
  }
);

const strategyStepSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      trim: true
    },
    label: {
      type: String,
      required: true,
      trim: true
    },
    status: {
      type: String,
      required: true,
      enum: ["PENDING", "IN_PROGRESS", "COMPLETED"]
    },
    completion: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    lastSavedAt: {
      type: Date,
      default: null
    },
    completedAt: {
      type: Date,
      default: null
    }
  },
  {
    _id: false
  }
);

const strategySchema = new mongoose.Schema(
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
    title: {
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
    responsibleUserId: {
      type: String,
      required: true,
      index: true
    },
    status: {
      type: String,
      required: true,
      enum: ["DRAFT", "IN_PROGRESS", "READY_FOR_APPROVAL", "IN_REVIEW", "APPROVED", "ARCHIVED"]
    },
    completionPercentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    pendingChanges: {
      type: Boolean,
      default: false
    },
    lastAutoSavedAt: {
      type: Date,
      default: null
    },
    steps: {
      type: [strategyStepSchema],
      default: []
    },
    draft: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    references: {
      type: [strategyReferenceSchema],
      default: []
    },
    comments: {
      type: [strategyCommentSchema],
      default: []
    },
    history: {
      type: [strategyHistoryEntrySchema],
      default: []
    },
    approval: {
      status: {
        type: String,
        enum: ["NOT_SUBMITTED", "IN_REVIEW", "APPROVED", "REJECTED"],
        default: "NOT_SUBMITTED"
      },
      submittedAt: {
        type: Date,
        default: null
      },
      submittedBy: {
        type: String,
        default: null
      },
      decidedAt: {
        type: Date,
        default: null
      },
      decidedBy: {
        type: String,
        default: null
      }
    },
    active: {
      type: Boolean,
      default: true
    },
    archivedAt: {
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

strategySchema.index({ launchId: 1, active: 1, updatedAt: -1 });
strategySchema.index({ responsibleUserId: 1, active: 1, updatedAt: -1 });

export const Strategy = mongoose.model("Strategy", strategySchema);
