import { randomUUID } from "node:crypto";

import mongoose from "mongoose";

const roleSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: () => randomUUID()
    },
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      unique: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    permissionIds: {
      type: [String],
      ref: "Permission",
      default: []
    },
    active: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

export const Role = mongoose.model("Role", roleSchema);
