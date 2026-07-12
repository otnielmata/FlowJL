import { randomUUID } from "node:crypto";

import mongoose from "mongoose";

const authSessionSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: () => randomUUID()
    },
    userId: {
      type: String,
      ref: "User",
      required: true,
      index: true
    },
    refreshTokenHash: {
      type: String,
      required: true
    },
    expiresAt: {
      type: Date,
      required: true
    },
    revokedAt: {
      type: Date,
      default: null
    },
    lastUsedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

export const AuthSession = mongoose.model("AuthSession", authSessionSchema);
