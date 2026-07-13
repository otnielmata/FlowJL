import { randomUUID } from "node:crypto";

import mongoose from "mongoose";

export const aiBrandMaterialTypes = ["SCRIPT", "COPY", "EMAIL"];
export const aiBrandMaterialReviewStatuses = ["PENDING_REVIEW", "APPROVED", "REJECTED"];

const materialSectionSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      required: true,
      trim: true
    },
    content: {
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

const brandMaterialSourceContextSchema = new mongoose.Schema(
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
    avatarVersion: {
      type: Number,
      default: null
    },
    editorialLineVersion: {
      type: Number,
      default: null
    },
    positioningVersion: {
      type: Number,
      default: null
    },
    offerVersion: {
      type: Number,
      default: null
    },
    editorialPillars: {
      type: [String],
      default: []
    },
    languageCues: {
      type: [String],
      default: []
    },
    brandSignals: {
      type: [String],
      default: []
    }
  },
  {
    _id: false,
    versionKey: false
  }
);

const aiBrandMaterialSchema = new mongoose.Schema(
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
    version: {
      type: Number,
      required: true,
      min: 1
    },
    materialType: {
      type: String,
      required: true,
      enum: aiBrandMaterialTypes,
      trim: true
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
    title: {
      type: String,
      required: true,
      trim: true
    },
    hook: {
      type: String,
      required: true,
      trim: true
    },
    sections: {
      type: [materialSectionSchema],
      default: []
    },
    cta: {
      type: String,
      required: true,
      trim: true
    },
    reviewNotes: {
      type: [String],
      default: []
    },
    sourceContext: {
      type: brandMaterialSourceContextSchema,
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
      enum: aiBrandMaterialReviewStatuses,
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

aiBrandMaterialSchema.index({ launchId: 1, materialType: 1, version: -1 }, { unique: true });
aiBrandMaterialSchema.index({ launchId: 1, reviewStatus: 1, active: 1, createdAt: -1 });

export const AiBrandMaterial = mongoose.model("AiBrandMaterial", aiBrandMaterialSchema);
