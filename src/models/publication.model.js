import { randomUUID } from "node:crypto";

import mongoose from "mongoose";

const publicationPreviewSchema = new mongoose.Schema(
  {
    headline: {
      type: String,
      default: null,
      trim: true
    },
    caption: {
      type: String,
      default: null,
      trim: true
    },
    callToAction: {
      type: String,
      default: null,
      trim: true
    },
    visualFormat: {
      type: String,
      default: null,
      trim: true
    },
    thumbnailUrl: {
      type: String,
      default: null,
      trim: true
    },
    hashtags: {
      type: [String],
      default: []
    }
  },
  {
    _id: false
  }
);

const publicationMetricsSchema = new mongoose.Schema(
  {
    publishedUrl: {
      type: String,
      default: null,
      trim: true
    },
    reach: {
      type: Number,
      default: 0,
      min: 0
    },
    likes: {
      type: Number,
      default: 0,
      min: 0
    },
    comments: {
      type: Number,
      default: 0,
      min: 0
    },
    shares: {
      type: Number,
      default: 0,
      min: 0
    },
    saves: {
      type: Number,
      default: 0,
      min: 0
    },
    recordedAt: {
      type: Date,
      default: null
    },
    recordedBy: {
      type: String,
      default: null
    }
  },
  {
    _id: false
  }
);

const publicationHistoryEntrySchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: () => randomUUID()
    },
    actionType: {
      type: String,
      required: true,
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
    _id: false
  }
);

const publicationSchema = new mongoose.Schema(
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
    contentType: {
      type: String,
      required: true,
      trim: true,
      enum: ["REEL", "CAROUSEL", "STORY_SEQUENCE", "EMAIL_CAMPAIGN", "YOUTUBE_CONTENT"]
    },
    contentId: {
      type: String,
      required: true,
      index: true
    },
    channel: {
      type: String,
      required: true,
      trim: true
    },
    publishAt: {
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
      trim: true,
      enum: ["PLANNED", "SCHEDULED", "PUBLISHED", "ISSUE"],
      default: "PLANNED"
    },
    issueReason: {
      type: String,
      default: null,
      trim: true
    },
    publishedAt: {
      type: Date,
      default: null
    },
    approvalRequestedAt: {
      type: Date,
      default: null
    },
    preview: {
      type: publicationPreviewSchema,
      default: () => ({})
    },
    metrics: {
      type: publicationMetricsSchema,
      default: () => ({})
    },
    history: {
      type: [publicationHistoryEntrySchema],
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

publicationSchema.index({ contentType: 1, contentId: 1 }, { unique: true });
publicationSchema.index({ launchId: 1, status: 1, publishAt: 1, active: 1 });

export const Publication = mongoose.model("Publication", publicationSchema);
