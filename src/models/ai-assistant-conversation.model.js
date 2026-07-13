import { randomUUID } from "node:crypto";

import mongoose from "mongoose";

export const aiAssistantMessageRoles = ["USER", "ASSISTANT"];
export const aiAssistantQuickActionTypes = ["COPY", "SAVE_AS_CONTENT", "SEND_FOR_APPROVAL", "CREATE_TASK"];

const attachmentSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: randomUUID
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    url: {
      type: String,
      default: null,
      trim: true
    },
    mediaType: {
      type: String,
      default: null,
      trim: true
    },
    sizeInBytes: {
      type: Number,
      default: null,
      min: 0
    }
  },
  {
    _id: false,
    versionKey: false
  }
);

const sourceSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: randomUUID
    },
    sourceType: {
      type: String,
      required: true,
      trim: true
    },
    sourceId: {
      type: String,
      default: null
    },
    label: {
      type: String,
      required: true,
      trim: true
    },
    detail: {
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

const generatedArtifactSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: randomUUID
    },
    actionType: {
      type: String,
      required: true,
      enum: aiAssistantQuickActionTypes
    },
    resourceType: {
      type: String,
      required: true,
      trim: true
    },
    resourceId: {
      type: String,
      default: null
    },
    summary: {
      type: String,
      required: true,
      trim: true
    },
    createdAt: {
      type: Date,
      default: () => new Date()
    }
  },
  {
    _id: false,
    versionKey: false
  }
);

const contextSchema = new mongoose.Schema(
  {
    launchId: {
      type: String,
      default: null
    },
    launchName: {
      type: String,
      default: null,
      trim: true
    },
    product: {
      type: String,
      default: null,
      trim: true
    },
    contentType: {
      type: String,
      default: null,
      trim: true
    },
    channel: {
      type: String,
      default: null,
      trim: true
    },
    reportType: {
      type: String,
      default: null,
      trim: true
    },
    workflowStage: {
      type: String,
      default: null,
      trim: true
    },
    objective: {
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

const messageSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: randomUUID
    },
    role: {
      type: String,
      required: true,
      enum: aiAssistantMessageRoles
    },
    content: {
      type: String,
      required: true,
      trim: true
    },
    attachments: {
      type: [attachmentSchema],
      default: []
    },
    sources: {
      type: [sourceSchema],
      default: []
    },
    availableQuickActions: {
      type: [String],
      default: [],
      enum: aiAssistantQuickActionTypes
    },
    generatedArtifacts: {
      type: [generatedArtifactSchema],
      default: []
    },
    contextSnapshot: {
      type: contextSchema,
      required: true
    },
    humanReviewWarning: {
      type: String,
      default: null,
      trim: true
    },
    createdAt: {
      type: Date,
      default: () => new Date()
    }
  },
  {
    _id: false,
    versionKey: false
  }
);

const aiAssistantConversationSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: randomUUID
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    context: {
      type: contextSchema,
      required: true
    },
    suggestedPrompts: {
      type: [String],
      default: []
    },
    messages: {
      type: [messageSchema],
      default: []
    },
    lastInteractionAt: {
      type: Date,
      default: () => new Date()
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

aiAssistantConversationSchema.index({ "context.launchId": 1, active: 1, updatedAt: -1 });
aiAssistantConversationSchema.index({ createdBy: 1, active: 1, updatedAt: -1 });
aiAssistantConversationSchema.index({ "messages.id": 1 });

export const AiAssistantConversation = mongoose.model("AiAssistantConversation", aiAssistantConversationSchema);
