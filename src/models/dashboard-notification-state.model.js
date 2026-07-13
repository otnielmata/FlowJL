import { randomUUID } from "node:crypto";

import mongoose from "mongoose";

const dashboardNotificationStateSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: () => randomUUID()
    },
    userId: {
      type: String,
      required: true,
      index: true
    },
    notificationId: {
      type: String,
      required: true,
      index: true
    },
    readAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

dashboardNotificationStateSchema.index({ userId: 1, notificationId: 1 }, { unique: true });

export const DashboardNotificationState = mongoose.model(
  "DashboardNotificationState",
  dashboardNotificationStateSchema
);
