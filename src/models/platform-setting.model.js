import { randomUUID } from "node:crypto";

import mongoose from "mongoose";

export const platformSettingValueTypes = ["STRING", "NUMBER", "BOOLEAN", "JSON"];

const platformSettingSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: () => randomUUID()
    },
    key: {
      type: String,
      required: true,
      trim: true,
      unique: true
    },
    label: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    module: {
      type: String,
      required: true,
      trim: true
    },
    valueType: {
      type: String,
      required: true,
      enum: platformSettingValueTypes
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    },
    editable: {
      type: Boolean,
      default: true
    },
    sensitive: {
      type: Boolean,
      default: false
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

platformSettingSchema.index({ module: 1, key: 1 });
platformSettingSchema.index({ editable: 1, sensitive: 1 });

export const PlatformSetting = mongoose.model("PlatformSetting", platformSettingSchema);
