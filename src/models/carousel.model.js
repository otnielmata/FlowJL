import { randomUUID } from "node:crypto";

import mongoose from "mongoose";

const carouselCardSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: randomUUID
    },
    order: {
      type: Number,
      required: true,
      min: 1
    },
    message: {
      type: String,
      required: true,
      trim: true
    }
  },
  {
    _id: false
  }
);

const carouselSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: randomUUID
    },
    launchId: {
      type: String,
      default: null,
      index: true
    },
    contentPlanId: {
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
    cardsCount: {
      type: Number,
      required: true,
      min: 1,
      max: 20
    },
    cards: {
      type: [carouselCardSchema],
      default: []
    },
    operationalStatus: {
      type: String,
      required: true,
      trim: true,
      enum: ["DRAFT", "IN_REVIEW", "APPROVED", "SCHEDULED", "PUBLISHED"]
    },
    reviewStatus: {
      type: String,
      required: true,
      trim: true,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING"
    },
    ownerRole: {
      type: String,
      default: null,
      trim: true
    },
    active: {
      type: Boolean,
      default: true
    },
    deactivatedAt: {
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

carouselSchema.index({ launchId: 1, operationalStatus: 1, active: 1 });

export const Carousel = mongoose.model("Carousel", carouselSchema);
