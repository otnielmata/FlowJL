import { randomUUID } from "node:crypto";

import mongoose from "mongoose";

const passwordResetRequestSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: randomUUID
    },
    userId: {
      type: String,
      ref: "User",
      required: true,
      index: true
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    tokenDigest: {
      type: String,
      required: true,
      unique: true
    },
    tokenHash: {
      type: String,
      required: true
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true
    },
    usedAt: {
      type: Date,
      default: null
    },
    revokedAt: {
      type: Date,
      default: null
    },
    requestedAt: {
      type: Date,
      required: true
    },
    usedBy: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

passwordResetRequestSchema.index({ userId: 1, usedAt: 1, revokedAt: 1, expiresAt: 1 });
passwordResetRequestSchema.index({ tokenDigest: 1, usedAt: 1, revokedAt: 1, expiresAt: 1 });

export const PasswordResetRequest = mongoose.model("PasswordResetRequest", passwordResetRequestSchema);
