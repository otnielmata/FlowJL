import { randomUUID } from "node:crypto";

import mongoose from "mongoose";

const reportMetricsSchema = new mongoose.Schema(
  {
    impressions: {
      type: Number,
      default: 0,
      min: 0
    },
    clicks: {
      type: Number,
      default: 0,
      min: 0
    },
    conversions: {
      type: Number,
      default: 0,
      min: 0
    },
    spend: {
      type: Number,
      default: 0,
      min: 0
    },
    revenue: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  {
    _id: false
  }
);

const trafficReportSnapshotSchema = new mongoose.Schema(
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
    campaignId: {
      type: String,
      default: null,
      index: true
    },
    source: {
      type: String,
      required: true,
      trim: true,
      enum: ["META", "GOOGLE", "YOUTUBE", "TIKTOK", "LINKEDIN", "INTERNAL", "OTHER"]
    },
    periodStart: {
      type: Date,
      required: true
    },
    periodEnd: {
      type: Date,
      required: true
    },
    metrics: {
      type: reportMetricsSchema,
      default: () => ({})
    },
    syncedAt: {
      type: Date,
      required: true
    },
    active: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

trafficReportSnapshotSchema.index({ launchId: 1, campaignId: 1, periodStart: 1, periodEnd: 1, active: 1 });
trafficReportSnapshotSchema.index({ launchId: 1, source: 1, syncedAt: -1 });

export const TrafficReportSnapshot = mongoose.model("TrafficReportSnapshot", trafficReportSnapshotSchema);
