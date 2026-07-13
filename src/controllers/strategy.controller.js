import { z } from "zod";

import { strategyService } from "../services/strategy.service.js";

const strategyIdSchema = z.object({
  strategyId: z.string().uuid()
});

const listQuerySchema = z.object({
  status: z.enum(["DRAFT", "IN_PROGRESS", "READY_FOR_APPROVAL", "IN_REVIEW", "APPROVED", "ARCHIVED"]).optional(),
  launchId: z.string().uuid().optional(),
  responsibleUserId: z.string().uuid().optional(),
  search: z.string().trim().min(1).max(160).optional(),
  active: z.coerce.boolean().optional()
});

const createStrategySchema = z.object({
  launchId: z.string().uuid(),
  title: z.string().trim().min(3).max(160),
  responsibleUserId: z.string().uuid().optional(),
  draft: z.object({
    overview: z.object({
      objective: z.string().trim().min(3).max(500),
      briefing: z.string().trim().min(3).max(1500),
      promise: z.string().trim().min(3).max(280).optional()
    }).optional(),
    persona: z.object({
      segment: z.string().trim().min(3).max(200),
      pains: z.array(z.string().trim().min(2).max(220)).max(12).optional(),
      desires: z.array(z.string().trim().min(2).max(220)).max(12).optional(),
      objections: z.array(z.string().trim().min(2).max(220)).max(12).optional()
    }).optional(),
    offer: z.object({
      productName: z.string().trim().min(3).max(160).optional(),
      transformation: z.string().trim().min(3).max(280).optional(),
      promise: z.string().trim().min(3).max(280).optional(),
      benefits: z.array(z.string().trim().min(2).max(220)).max(12).optional(),
      differentials: z.array(z.string().trim().min(2).max(220)).max(12).optional()
    }).optional(),
    positioning: z.object({
      thesis: z.string().trim().min(3).max(500).optional(),
      centralPromise: z.string().trim().min(3).max(280).optional(),
      differentiators: z.array(z.string().trim().min(2).max(220)).max(12).optional()
    }).optional(),
    editorialLine: z.object({
      pillars: z.array(z.object({
        name: z.string().trim().min(2).max(160),
        angle: z.string().trim().min(2).max(280).optional(),
        active: z.boolean().optional()
      })).max(12).optional()
    }).optional(),
    references: z.array(z.object({
      id: z.string().uuid().optional(),
      title: z.string().trim().min(2).max(200),
      type: z.string().trim().min(2).max(120),
      url: z.string().trim().url().optional(),
      notes: z.string().trim().max(500).optional()
    })).max(20).optional(),
    contents: z.object({
      keyFormats: z.array(z.string().trim().min(2).max(160)).max(12).optional(),
      priorityThemes: z.array(z.string().trim().min(2).max(200)).max(20).optional(),
      ctas: z.array(z.string().trim().min(2).max(200)).max(20).optional()
    }).optional(),
    schedule: z.object({
      timelineSummary: z.string().trim().min(3).max(500).optional(),
      deliveryCadence: z.string().trim().min(3).max(280).optional(),
      checkpoints: z.array(z.string().trim().min(2).max(220)).max(20).optional()
    }).optional()
  }).default({})
});

const saveDraftSchema = z.object({
  stepKey: z.enum(["overview", "persona", "offer", "positioning", "editorialLine", "references", "contents", "schedule"]),
  saveMode: z.enum(["AUTO", "MANUAL"]).default("MANUAL"),
  hasUnsavedChanges: z.boolean().optional(),
  data: z.union([
    z.object({
      objective: z.string().trim().min(3).max(500),
      briefing: z.string().trim().min(3).max(1500),
      promise: z.string().trim().min(3).max(280).optional(),
      launchName: z.string().trim().min(3).max(160).optional(),
      product: z.string().trim().min(3).max(160).optional(),
      expert: z.string().trim().min(3).max(160).optional()
    }),
    z.object({
      segment: z.string().trim().min(3).max(200),
      pains: z.array(z.string().trim().min(2).max(220)).max(12),
      desires: z.array(z.string().trim().min(2).max(220)).max(12),
      objections: z.array(z.string().trim().min(2).max(220)).max(12)
    }),
    z.object({
      productName: z.string().trim().min(3).max(160).optional(),
      transformation: z.string().trim().min(3).max(280),
      promise: z.string().trim().min(3).max(280),
      benefits: z.array(z.string().trim().min(2).max(220)).max(12),
      differentials: z.array(z.string().trim().min(2).max(220)).max(12)
    }),
    z.object({
      thesis: z.string().trim().min(3).max(500),
      centralPromise: z.string().trim().min(3).max(280),
      differentiators: z.array(z.string().trim().min(2).max(220)).max(12)
    }),
    z.object({
      pillars: z.array(z.object({
        name: z.string().trim().min(2).max(160),
        angle: z.string().trim().min(2).max(280).optional(),
        active: z.boolean().optional()
      })).max(12)
    }),
    z.array(z.object({
      id: z.string().uuid().optional(),
      title: z.string().trim().min(2).max(200),
      type: z.string().trim().min(2).max(120),
      url: z.string().trim().url().optional(),
      notes: z.string().trim().max(500).optional()
    })).max(20),
    z.object({
      keyFormats: z.array(z.string().trim().min(2).max(160)).max(12),
      priorityThemes: z.array(z.string().trim().min(2).max(200)).max(20),
      ctas: z.array(z.string().trim().min(2).max(200)).max(20)
    }),
    z.object({
      timelineSummary: z.string().trim().min(3).max(500),
      deliveryCadence: z.string().trim().min(3).max(280),
      checkpoints: z.array(z.string().trim().min(2).max(220)).max(20)
    })
  ])
});

const addCommentSchema = z.object({
  message: z.string().trim().min(3).max(1000)
});

class StrategyController {
  async list(request, response) {
    const filters = listQuerySchema.parse(request.query);
    const strategies = await strategyService.list(filters);

    response.status(200).json(strategies);
  }

  async create(request, response) {
    const payload = createStrategySchema.parse(request.body);
    const strategy = await strategyService.create(request.auth.sub, payload);

    response.status(201).json(strategy);
  }

  async getById(request, response) {
    const { strategyId } = strategyIdSchema.parse(request.params);
    const strategy = await strategyService.getById(strategyId, request.currentRole);

    response.status(200).json(strategy);
  }

  async saveDraft(request, response) {
    const { strategyId } = strategyIdSchema.parse(request.params);
    const payload = saveDraftSchema.parse(request.body);
    const draft = await strategyService.saveDraft(request.auth.sub, strategyId, payload);

    response.status(200).json(draft);
  }

  async addComment(request, response) {
    const { strategyId } = strategyIdSchema.parse(request.params);
    const payload = addCommentSchema.parse(request.body);
    const comment = await strategyService.addComment(request.auth.sub, strategyId, payload.message);

    response.status(201).json(comment);
  }

  async duplicate(request, response) {
    const { strategyId } = strategyIdSchema.parse(request.params);
    const duplicated = await strategyService.duplicate(request.auth.sub, strategyId);

    response.status(201).json(duplicated);
  }

  async archive(request, response) {
    const { strategyId } = strategyIdSchema.parse(request.params);
    const archived = await strategyService.archive(request.auth.sub, strategyId);

    response.status(200).json(archived);
  }

  async submitForApproval(request, response) {
    const { strategyId } = strategyIdSchema.parse(request.params);
    const submission = await strategyService.submitForApproval(request.auth.sub, strategyId);

    response.status(200).json(submission);
  }

  async generateAiContent(request, response) {
    const { strategyId } = strategyIdSchema.parse(request.params);
    const suggestions = await strategyService.generateAiContent(strategyId);

    response.status(200).json(suggestions);
  }
}

export const strategyController = new StrategyController();
