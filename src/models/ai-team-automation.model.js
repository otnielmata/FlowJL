import { randomUUID } from "node:crypto";

import mongoose from "mongoose";

export const aiTeamAutomationTriggerTypes = ["SCHEDULED", "EVENT", "MANUAL"];
export const aiTeamAutomationContextTypes = ["LAUNCH", "GLOBAL", "OPERATION"];
export const aiTeamAutomationActionTypes = ["CREATE_OPERATIONAL_CHECKLIST", "CREATE_SUPPORT_TICKET", "SEND_OPERATIONAL_REMINDER", "REGISTER_OPERATION_LOG"];
export const aiTeamAutomationExecutionStatuses = ["SUCCEEDED", "FAILED", "SKIPPED"];

const triggerSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: aiTeamAutomationTriggerTypes
    },
    eventName: {
      type: String,
      default: null,
      trim: true
    },
    scheduleExpression: {
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

const ruleSchema = new mongoose.Schema(
  {
    contextType: {
      type: String,
      required: true,
      enum: aiTeamAutomationContextTypes
    },
    contextId: {
      type: String,
      default: null
    },
    requiredPermission: {
      type: String,
      required: true,
      trim: true
    },
    allowGlobalContext: {
      type: Boolean,
      default: false
    },
    conditions: {
      type: [String],
      default: []
    }
  },
  {
    _id: false,
    versionKey: false
  }
);

const actionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: aiTeamAutomationActionTypes
    },
    targetModule: {
      type: String,
      required: true,
      trim: true
    },
    payloadTemplate: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    secretConfig: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    }
  },
  {
    _id: false,
    versionKey: false
  }
);

const executionSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: randomUUID
    },
    status: {
      type: String,
      required: true,
      enum: aiTeamAutomationExecutionStatuses
    },
    triggeredBy: {
      type: String,
      required: true
    },
    triggeredAt: {
      type: Date,
      required: true
    },
    triggerPayload: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    result: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    errorMessage: {
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

const aiTeamAutomationSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: randomUUID
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
    trigger: {
      type: triggerSchema,
      required: true
    },
    rule: {
      type: ruleSchema,
      required: true
    },
    action: {
      type: actionSchema,
      required: true
    },
    active: {
      type: Boolean,
      default: false
    },
    executions: {
      type: [executionSchema],
      default: []
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

aiTeamAutomationSchema.index({ active: 1, "trigger.type": 1 });
aiTeamAutomationSchema.index({ "rule.contextType": 1, "rule.contextId": 1, active: 1 });

export const AiTeamAutomation = mongoose.model("AiTeamAutomation", aiTeamAutomationSchema);
