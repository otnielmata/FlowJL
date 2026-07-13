import { randomUUID } from "node:crypto";

import mongoose from "mongoose";

export const userPreferenceThemes = ["LIGHT", "DARK", "SYSTEM"];

const personalProfileSchema = new mongoose.Schema(
  {
    displayName: {
      type: String,
      default: null,
      trim: true
    },
    jobTitle: {
      type: String,
      default: null,
      trim: true
    },
    phone: {
      type: String,
      default: null,
      trim: true
    },
    avatarUrl: {
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

const notificationPreferenceSchema = new mongoose.Schema(
  {
    email: {
      type: Boolean,
      default: true
    },
    push: {
      type: Boolean,
      default: true
    },
    approvals: {
      type: Boolean,
      default: true
    },
    operations: {
      type: Boolean,
      default: true
    },
    reports: {
      type: Boolean,
      default: false
    }
  },
  {
    _id: false,
    versionKey: false
  }
);

const userPreferenceSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: randomUUID
    },
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    theme: {
      type: String,
      enum: userPreferenceThemes,
      default: "SYSTEM"
    },
    locale: {
      type: String,
      default: "pt-BR",
      trim: true
    },
    timezone: {
      type: String,
      default: "America/Sao_Paulo",
      trim: true
    },
    compactSidebar: {
      type: Boolean,
      default: false
    },
    personalProfile: {
      type: personalProfileSchema,
      default: () => ({})
    },
    notifications: {
      type: notificationPreferenceSchema,
      default: () => ({})
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

export const UserPreference = mongoose.model("UserPreference", userPreferenceSchema);
