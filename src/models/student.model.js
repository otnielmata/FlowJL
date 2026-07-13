import { randomUUID } from "node:crypto";

import mongoose from "mongoose";

export const studentStatuses = ["ACTIVE", "INACTIVE", "PENDING", "COMPLETED", "CANCELED"];

const studentSchema = new mongoose.Schema(
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
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    phone: {
      type: String,
      default: null,
      trim: true
    },
    product: {
      type: String,
      required: true,
      trim: true
    },
    status: {
      type: String,
      required: true,
      enum: studentStatuses,
      trim: true
    },
    supportNotes: {
      type: String,
      default: null,
      trim: true
    },
    tags: {
      type: [String],
      default: []
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

studentSchema.index({ email: 1, product: 1, active: 1 });
studentSchema.index({ launchId: 1, status: 1, active: 1 });
studentSchema.index({ product: 1, status: 1, active: 1 });

export const Student = mongoose.model("Student", studentSchema);
