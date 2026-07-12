import { randomUUID } from "node:crypto";

import mongoose from "mongoose";

const storyBlockSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: () => randomUUID()
    },
    order: {
      type: Number,
      required: true,
      min: 1
    },
    text: {
      type: String,
      required: true,
      trim: true
    }
  },
  {
    _id: false
  }
);

const storySequenceSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: () => randomUUID()
    },
    launchId: {
      type: String,
      default: null,
      index: true
    },
    smartScheduleId: {
      type: String,
      default: null,
      index: true
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
    cta: {
      type: String,
      required: true,
      trim: true
    },
    blocksCount: {
      type: Number,
      required: true,
      min: 1,
      max: 20
    },
    blocks: {
      type: [storyBlockSchema],
      default: []
    },
    operationalStatus: {
      type: String,
      required: true,
      trim: true,
      enum: ["DRAFT", "IN_REVIEW", "APPROVED", "SCHEDULED", "PUBLISHED"]
    },
    ownerRole: {
      type: String,
      default: null,
      trim: true
    },
    publishAt: {
      type: Date,
      default: null
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

storySequenceSchema.index({ launchId: 1, operationalStatus: 1, active: 1 });

export const StorySequence = mongoose.model("StorySequence", storySequenceSchema);
