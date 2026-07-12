import { randomUUID } from "node:crypto";

import mongoose from "mongoose";

const auditEventSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: () => randomUUID()
    },
    actorUserId: {
      type: String,
      default: null
    },
    action: {
      type: String,
      required: true,
      trim: true
    },
    targetType: {
      type: String,
      required: true,
      trim: true
    },
    targetId: {
      type: String,
      required: true,
      trim: true
    },
    context: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    occurredAt: {
      type: Date,
      default: () => new Date()
    }
  },
  {
    versionKey: false
  }
);

export const AuditEvent = mongoose.model("AuditEvent", auditEventSchema);
