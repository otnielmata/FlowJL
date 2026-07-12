import { randomUUID } from "node:crypto";

import mongoose from "mongoose";

const externalPublicationLinkSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: () => randomUUID()
    },
    publicationId: {
      type: String,
      required: true,
      index: true
    },
    provider: {
      type: String,
      required: true,
      trim: true,
      enum: ["META", "YOUTUBE"]
    },
    integrationId: {
      type: String,
      default: null,
      index: true
    },
    externalPublicationId: {
      type: String,
      required: true,
      trim: true
    },
    externalPermalink: {
      type: String,
      default: null,
      trim: true
    },
    syncState: {
      type: String,
      required: true,
      trim: true,
      enum: ["PENDING", "SYNCED", "ERROR"],
      default: "PENDING"
    },
    lastSyncAt: {
      type: Date,
      default: null
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
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

externalPublicationLinkSchema.index({ publicationId: 1, provider: 1, active: 1 }, { unique: true });
externalPublicationLinkSchema.index({ provider: 1, externalPublicationId: 1 }, { unique: true });

export const ExternalPublicationLink = mongoose.model("ExternalPublicationLink", externalPublicationLinkSchema);
