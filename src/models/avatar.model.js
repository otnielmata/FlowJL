import { randomUUID } from "node:crypto";

import mongoose from "mongoose";

const avatarSuggestionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    rationale: {
      type: String,
      required: true,
      trim: true
    }
  },
  {
    _id: false
  }
);

const avatarSchema = new mongoose.Schema(
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
    profile: {
      type: String,
      required: true,
      trim: true
    },
    pains: {
      type: [String],
      default: []
    },
    dreams: {
      type: [String],
      default: []
    },
    objections: {
      type: [String],
      default: []
    },
    language: {
      type: [String],
      default: []
    },
    isPrimary: {
      type: Boolean,
      default: true
    },
    isCurrent: {
      type: Boolean,
      default: true
    },
    humanReviewRequired: {
      type: Boolean,
      default: true
    },
    aiSuggestions: {
      profileAngles: {
        type: [avatarSuggestionSchema],
        default: []
      },
      painAmplifiers: {
        type: [avatarSuggestionSchema],
        default: []
      },
      dreamDrivers: {
        type: [avatarSuggestionSchema],
        default: []
      },
      languageCues: {
        type: [avatarSuggestionSchema],
        default: []
      }
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

avatarSchema.index({ launchId: 1, version: -1 }, { unique: true });

export const Avatar = mongoose.model("Avatar", avatarSchema);
