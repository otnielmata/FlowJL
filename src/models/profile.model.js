import mongoose from "mongoose";

const profileSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true
    },
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      unique: true
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    permissions: {
      type: [String],
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

export const Profile = mongoose.model("Profile", profileSchema);
