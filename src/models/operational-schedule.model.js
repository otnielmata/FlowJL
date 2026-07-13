import { randomUUID } from "node:crypto";

import mongoose from "mongoose";

export const operationalScheduleViews = ["MONTH", "WEEK", "DAY", "LIST", "KANBAN", "TIMELINE"];
export const operationalScheduleAreas = ["OPERATIONS", "CONTENT", "SOCIAL_MEDIA", "TRAFFIC", "DESIGN", "COPY", "SALES", "LAUNCH"];
export const operationalSchedulePriorities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
export const operationalScheduleStatuses = ["BACKLOG", "PLANNED", "IN_PROGRESS", "IN_REVIEW", "BLOCKED", "DONE", "CANCELED"];
export const operationalScheduleTypes = ["TASK", "MEETING", "APPROVAL", "DELIVERY", "PUBLISHING", "AUTOMATION"];
export const operationalScheduleRecurrenceFrequencies = ["NONE", "DAILY", "WEEKLY", "MONTHLY"];

const recurrenceSchema = new mongoose.Schema(
  {
    frequency: {
      type: String,
      enum: operationalScheduleRecurrenceFrequencies,
      default: "NONE"
    },
    interval: {
      type: Number,
      default: 1,
      min: 1
    },
    count: {
      type: Number,
      default: null,
      min: 1
    },
    until: {
      type: Date,
      default: null
    }
  },
  {
    _id: false,
    versionKey: false
  }
);

const reminderSchema = new mongoose.Schema(
  {
    enabled: {
      type: Boolean,
      default: false
    },
    remindAt: {
      type: Date,
      default: null
    },
    channel: {
      type: String,
      default: null,
      trim: true
    }
  },
  {
    _id: false,
    versionKey: false
  }
);

const relationshipsSchema = new mongoose.Schema(
  {
    checklistId: {
      type: String,
      default: null
    },
    classScheduleId: {
      type: String,
      default: null
    },
    liveEventId: {
      type: String,
      default: null
    },
    relatedLink: {
      type: String,
      default: null,
      trim: true
    }
  },
  {
    _id: false,
    versionKey: false
  }
);

const attendanceSchema = new mongoose.Schema(
  {
    present: {
      type: Boolean,
      default: false
    },
    checkedBy: {
      type: String,
      default: null
    },
    checkedAt: {
      type: Date,
      default: null
    }
  },
  {
    _id: false,
    versionKey: false
  }
);

const executionHistorySchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: randomUUID
    },
    actionType: {
      type: String,
      required: true,
      trim: true
    },
    fromStatus: {
      type: String,
      default: null,
      trim: true
    },
    toStatus: {
      type: String,
      default: null,
      trim: true
    },
    actorUserId: {
      type: String,
      default: null
    },
    message: {
      type: String,
      required: true,
      trim: true
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    createdAt: {
      type: Date,
      default: () => new Date()
    }
  },
  {
    _id: false,
    versionKey: false
  }
);

const checklistItemSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: randomUUID
    },
    label: {
      type: String,
      required: true,
      trim: true
    },
    required: {
      type: Boolean,
      default: true
    },
    completed: {
      type: Boolean,
      default: false
    },
    completedBy: {
      type: String,
      default: null
    },
    completedAt: {
      type: Date,
      default: null
    }
  },
  {
    _id: false,
    versionKey: false
  }
);

const attachmentSchema = new mongoose.Schema(
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
    url: {
      type: String,
      required: true,
      trim: true
    },
    mediaType: {
      type: String,
      default: null,
      trim: true
    }
  },
  {
    _id: false,
    versionKey: false
  }
);

const commentSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: randomUUID
    },
    authorUserId: {
      type: String,
      required: true,
      trim: true
    },
    authorName: {
      type: String,
      required: true,
      trim: true
    },
    message: {
      type: String,
      required: true,
      trim: true
    },
    createdAt: {
      type: Date,
      required: true
    }
  },
  {
    _id: false,
    versionKey: false
  }
);

const operationalScheduleSchema = new mongoose.Schema(
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
    description: {
      type: String,
      default: null,
      trim: true
    },
    area: {
      type: String,
      required: true,
      enum: operationalScheduleAreas,
      trim: true
    },
    priority: {
      type: String,
      required: true,
      enum: operationalSchedulePriorities,
      trim: true
    },
    status: {
      type: String,
      required: true,
      enum: operationalScheduleStatuses,
      trim: true
    },
    type: {
      type: String,
      required: true,
      enum: operationalScheduleTypes,
      trim: true
    },
    responsible: {
      type: String,
      required: true,
      trim: true
    },
    startsAt: {
      type: Date,
      required: true
    },
    dueAt: {
      type: Date,
      required: true
    },
    timelinePosition: {
      type: Number,
      default: 0
    },
    dependencyIds: {
      type: [String],
      default: []
    },
    checklist: {
      type: [checklistItemSchema],
      default: []
    },
    attachments: {
      type: [attachmentSchema],
      default: []
    },
    comments: {
      type: [commentSchema],
      default: []
    },
    tags: {
      type: [String],
      default: []
    },
    recurrence: {
      type: recurrenceSchema,
      default: () => ({})
    },
    reminder: {
      type: reminderSchema,
      default: () => ({})
    },
    relationships: {
      type: relationshipsSchema,
      default: () => ({})
    },
    attendance: {
      type: attendanceSchema,
      default: () => ({})
    },
    executionHistory: {
      type: [executionHistorySchema],
      default: []
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

operationalScheduleSchema.index({ launchId: 1, startsAt: 1, dueAt: 1, active: 1 });
operationalScheduleSchema.index({ launchId: 1, status: 1, active: 1 });
operationalScheduleSchema.index({ launchId: 1, area: 1, priority: 1, active: 1 });
operationalScheduleSchema.index({ responsible: 1, startsAt: 1, status: 1, active: 1 });

export const OperationalSchedule = mongoose.model("OperationalSchedule", operationalScheduleSchema);
