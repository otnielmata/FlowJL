import { randomUUID } from "node:crypto";

import mongoose from "mongoose";

export const contentProductionFormats = ["REEL", "CAROUSEL", "STORIES", "EMAIL", "YOUTUBE", "ADS", "LANDING_PAGE"];
export const contentProductionChannels = ["INSTAGRAM", "FACEBOOK", "YOUTUBE", "EMAIL", "WHATSAPP", "LINKEDIN", "BLOG", "META_ADS"];
export const contentProductionStatuses = ["DRAFT", "IN_REVIEW", "APPROVED", "REJECTED", "SCHEDULED", "PUBLISHED"];
export const contentProductionActionTypes = ["REWRITE", "SUMMARIZE", "VARIATION", "ADAPT_CHANNEL", "SEND_APPROVAL", "APPROVE", "REJECT"];

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

const referenceSchema = new mongoose.Schema(
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
    url: {
      type: String,
      required: true,
      trim: true
    }
  },
  {
    _id: false,
    versionKey: false
  }
);

const contentVersionSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: randomUUID
    },
    version: {
      type: Number,
      required: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    summary: {
      type: String,
      default: null,
      trim: true
    },
    body: {
      type: String,
      required: true,
      trim: true
    },
    channel: {
      type: String,
      required: true,
      enum: contentProductionChannels,
      trim: true
    },
    format: {
      type: String,
      required: true,
      enum: contentProductionFormats,
      trim: true
    },
    aiActionType: {
      type: String,
      default: null,
      enum: [...contentProductionActionTypes, null]
    },
    comparisonBaseVersion: {
      type: Number,
      default: null
    },
    diffSummary: {
      type: String,
      default: null,
      trim: true
    },
    createdBy: {
      type: String,
      required: true
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

const publicationSchema = new mongoose.Schema(
  {
    publishAt: {
      type: Date,
      default: null
    },
    publishedAt: {
      type: Date,
      default: null
    },
    status: {
      type: String,
      default: "NOT_SCHEDULED",
      enum: ["NOT_SCHEDULED", "SCHEDULED", "PUBLISHED"]
    }
  },
  {
    _id: false,
    versionKey: false
  }
);

const approvalSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      default: "NOT_SENT",
      enum: ["NOT_SENT", "PENDING", "APPROVED", "REJECTED"]
    },
    approverUserId: {
      type: String,
      default: null
    },
    approverName: {
      type: String,
      default: null,
      trim: true
    },
    requestedBy: {
      type: String,
      default: null
    },
    requestedAt: {
      type: Date,
      default: null
    },
    respondedBy: {
      type: String,
      default: null
    },
    respondedAt: {
      type: Date,
      default: null
    },
    rejectionReason: {
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

const historyEntrySchema = new mongoose.Schema(
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
    actorUserId: {
      type: String,
      required: true
    },
    actorName: {
      type: String,
      required: true,
      trim: true
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
      required: true
    }
  },
  {
    _id: false,
    versionKey: false
  }
);

const contentProductionSchema = new mongoose.Schema(
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
    format: {
      type: String,
      required: true,
      enum: contentProductionFormats,
      trim: true
    },
    channel: {
      type: String,
      required: true,
      enum: contentProductionChannels,
      trim: true
    },
    responsible: {
      type: String,
      required: true,
      trim: true
    },
    currentStatus: {
      type: String,
      required: true,
      enum: contentProductionStatuses,
      trim: true
    },
    versions: {
      type: [contentVersionSchema],
      default: []
    },
    currentVersion: {
      type: Number,
      required: true,
      default: 1
    },
    attachments: {
      type: [attachmentSchema],
      default: []
    },
    references: {
      type: [referenceSchema],
      default: []
    },
    publication: {
      type: publicationSchema,
      default: () => ({})
    },
    approval: {
      type: approvalSchema,
      default: () => ({})
    },
    history: {
      type: [historyEntrySchema],
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

contentProductionSchema.index({ launchId: 1, format: 1, channel: 1, currentStatus: 1, active: 1 });
contentProductionSchema.index({ responsible: 1, currentStatus: 1, active: 1 });
contentProductionSchema.index({ "publication.publishAt": 1, active: 1 });

export const ContentProduction = mongoose.model("ContentProduction", contentProductionSchema);
