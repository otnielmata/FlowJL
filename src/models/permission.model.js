import { randomUUID } from "node:crypto";

import mongoose from "mongoose";

const permissionSchema = new mongoose.Schema(
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
    module: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
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

export const Permission = mongoose.model("Permission", permissionSchema);
