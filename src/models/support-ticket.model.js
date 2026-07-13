import { randomUUID } from "node:crypto";

import mongoose from "mongoose";

export const supportTicketStatuses = ["OPEN", "IN_PROGRESS", "WAITING_CUSTOMER", "RESOLVED", "CLOSED", "CANCELED"];
export const supportTicketPriorities = ["LOW", "MEDIUM", "HIGH", "URGENT"];

const interactionSchema = new mongoose.Schema(
  {
    occurredAt: {
      type: Date,
      required: true
    },
    actorUserId: {
      type: String,
      default: null
    },
    type: {
      type: String,
      required: true,
      trim: true
    },
    note: {
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

const supportTicketSchema = new mongoose.Schema(
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
    studentId: {
      type: String,
      default: null,
      index: true
    },
    requester: {
      type: String,
      required: true,
      trim: true
    },
    demandType: {
      type: String,
      required: true,
      trim: true
    },
    responsibleUserId: {
      type: String,
      required: true,
      trim: true
    },
    status: {
      type: String,
      required: true,
      enum: supportTicketStatuses,
      trim: true
    },
    priority: {
      type: String,
      required: true,
      enum: supportTicketPriorities,
      default: "MEDIUM",
      trim: true
    },
    observations: {
      type: String,
      default: null,
      trim: true
    },
    interactionHistory: {
      type: [interactionSchema],
      default: []
    },
    closedAt: {
      type: Date,
      default: null
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

supportTicketSchema.index({ launchId: 1, status: 1, active: 1 });
supportTicketSchema.index({ studentId: 1, status: 1, active: 1 });
supportTicketSchema.index({ responsibleUserId: 1, status: 1, active: 1 });
supportTicketSchema.index({ priority: 1, status: 1, active: 1 });

export const SupportTicket = mongoose.model("SupportTicket", supportTicketSchema);
