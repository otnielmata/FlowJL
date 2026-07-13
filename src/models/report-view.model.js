import { randomUUID } from "node:crypto";

import mongoose from "mongoose";

export const reportViewTypes = ["FILTER_VIEW", "CUSTOM_DASHBOARD"];

const reportViewFiltersSchema = new mongoose.Schema(
  {
    launchId: {
      type: String,
      default: null
    },
    periodStart: {
      type: Date,
      default: null
    },
    periodEnd: {
      type: Date,
      default: null
    },
    comparePeriodStart: {
      type: Date,
      default: null
    },
    comparePeriodEnd: {
      type: Date,
      default: null
    },
    responsible: {
      type: String,
      default: null,
      trim: true
    },
    channel: {
      type: String,
      default: null,
      trim: true
    },
    campaignId: {
      type: String,
      default: null
    },
    status: {
      type: String,
      default: null,
      trim: true
    },
    approvalStatus: {
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

const reportViewLayoutSchema = new mongoose.Schema(
  {
    widgets: {
      type: [String],
      default: []
    },
    shared: {
      type: Boolean,
      default: false
    }
  },
  {
    _id: false,
    versionKey: false
  }
);

const reportViewSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: randomUUID
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      default: null,
      trim: true
    },
    type: {
      type: String,
      required: true,
      enum: reportViewTypes
    },
    ownerUserId: {
      type: String,
      required: true,
      index: true
    },
    filters: {
      type: reportViewFiltersSchema,
      required: true
    },
    layout: {
      type: reportViewLayoutSchema,
      default: () => ({})
    },
    lastExportedAt: {
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

reportViewSchema.index({ ownerUserId: 1, type: 1, active: 1, updatedAt: -1 });
reportViewSchema.index({ name: 1, ownerUserId: 1, active: 1 });

export const ReportView = mongoose.model("ReportView", reportViewSchema);
