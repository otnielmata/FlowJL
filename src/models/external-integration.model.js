import { randomUUID } from "node:crypto";

import mongoose from "mongoose";

const credentialStateSchema = new mongoose.Schema(
  {
    clientId: {
      type: String,
      default: null,
      trim: true
    },
    clientSecretHash: {
      type: String,
      default: null
    },
    accessTokenHash: {
      type: String,
      default: null
    },
    refreshTokenHash: {
      type: String,
      default: null
    },
    tokenExpiresAt: {
      type: Date,
      default: null
    },
    scopes: {
      type: [String],
      default: []
    }
  },
  {
    _id: false
  }
);

const externalIntegrationSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: () => randomUUID()
    },
    provider: {
      type: String,
      required: true,
      trim: true,
      enum: ["META", "YOUTUBE"]
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    externalAccountId: {
      type: String,
      default: null,
      trim: true
    },
    externalBusinessId: {
      type: String,
      default: null,
      trim: true
    },
    externalChannelId: {
      type: String,
      default: null,
      trim: true
    },
    credentials: {
      type: credentialStateSchema,
      default: () => ({})
    },
    syncState: {
      type: String,
      required: true,
      trim: true,
      enum: ["NOT_CONFIGURED", "READY", "PENDING", "SYNCED", "ERROR"],
      default: "NOT_CONFIGURED"
    },
    status: {
      type: String,
      required: true,
      trim: true,
      enum: ["INACTIVE", "READY", "ERROR"],
      default: "INACTIVE"
    },
    lastSyncAt: {
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

externalIntegrationSchema.index({ provider: 1, name: 1, active: 1 }, { unique: true });
externalIntegrationSchema.index({ provider: 1, syncState: 1, active: 1 });

export const ExternalIntegration = mongoose.model("ExternalIntegration", externalIntegrationSchema);
