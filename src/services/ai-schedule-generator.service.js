import { randomUUID } from "node:crypto";

function addDays(date, days) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function clampDate(date, periodStart, periodEnd) {
  if (date < periodStart) {
    return periodStart;
  }

  if (date > periodEnd) {
    return periodEnd;
  }

  return date;
}

function splitPeriod(periodStart, periodEnd) {
  const durationMs = periodEnd.getTime() - periodStart.getTime();
  const third = Math.max(Math.floor(durationMs / 3), 24 * 60 * 60 * 1000);

  return [
    {
      name: "Preparacao estrategica",
      startsAt: periodStart,
      endsAt: clampDate(new Date(periodStart.getTime() + third - 1), periodStart, periodEnd)
    },
    {
      name: "Aquecimento e captacao",
      startsAt: clampDate(new Date(periodStart.getTime() + third), periodStart, periodEnd),
      endsAt: clampDate(new Date(periodStart.getTime() + third * 2 - 1), periodStart, periodEnd)
    },
    {
      name: "Conversao e operacao",
      startsAt: clampDate(new Date(periodStart.getTime() + third * 2), periodStart, periodEnd),
      endsAt: periodEnd
    }
  ];
}

function buildActivity(title, stage, area, role, dueAt, dependencies = [], reviewNotes = []) {
  return {
    id: randomUUID(),
    title,
    stage,
    area,
    suggestedResponsibleRole: role,
    dueAt,
    dependencies,
    reviewNotes
  };
}

function extractContentThemes(contentPlan) {
  const items = contentPlan?.items?.filter((item) => item.active) ?? [];
  return [...new Set(items.map((item) => item.theme).filter(Boolean))].slice(0, 4);
}

class AiScheduleGeneratorService {
  generate({ launch, objective, briefing, sourceContext, contentPlan, smartSchedule }) {
    const periodStart = new Date(launch.periodStart);
    const periodEnd = new Date(launch.periodEnd);
    const phases = splitPeriod(periodStart, periodEnd);
    const contentThemes = extractContentThemes(contentPlan);
    const milestoneNames = launch.milestones.map((milestone) => milestone.name);
    const previousActivities = smartSchedule?.activities?.slice(0, 3).map((activity) => activity.theme) ?? [];

    const [strategyPhase, warmupPhase, conversionPhase] = phases;
    const strategyActivities = [
      buildActivity(
        `Consolidar briefing do ${launch.product}`,
        strategyPhase.name,
        "Estrategia",
        "DIGITAL_STRATEGIST",
        strategyPhase.startsAt,
        [],
        ["Validar promessa e oferta antes de ativar producao."]
      ),
      buildActivity(
        `Mapear marcos criticos: ${milestoneNames.slice(0, 2).join(" + ") || "lancamento"}`,
        strategyPhase.name,
        "Operacoes",
        "OPERATIONS",
        clampDate(addDays(strategyPhase.startsAt, 2), strategyPhase.startsAt, strategyPhase.endsAt),
        ["Briefing consolidado"],
        ["Confirmar datas finais com lideranca."]
      )
    ];
    const warmupActivities = [
      buildActivity(
        `Sequencia de conteudo para ${contentThemes[0] ?? launch.product}`,
        warmupPhase.name,
        "Social Media",
        "SOCIAL_MEDIA",
        warmupPhase.startsAt,
        ["Marcos criticos mapeados"],
        ["Revisar aderencia ao tom do expert."]
      ),
      buildActivity(
        `Ativar captacao com angulo ${contentThemes[1] ?? objective}`,
        warmupPhase.name,
        "Trafego",
        "TRAFFIC_MANAGER",
        clampDate(addDays(warmupPhase.startsAt, 2), warmupPhase.startsAt, warmupPhase.endsAt),
        ["Sequencia de conteudo aprovada"],
        ["Checar verba e tracking antes da publicacao."]
      )
    ];
    const conversionActivities = [
      buildActivity(
        `Operar janela de conversao de ${launch.name}`,
        conversionPhase.name,
        "Operacoes",
        "OPERATIONS",
        conversionPhase.startsAt,
        ["Captacao ativa"],
        ["Acompanhar suporte, aulas e e-mails operacionais."]
      ),
      buildActivity(
        `Revisar aprendizados e proximas acoes`,
        conversionPhase.name,
        "Lideranca",
        "ADMIN",
        conversionPhase.endsAt,
        ["Janela de conversao encerrada"],
        ["Usar metricas reais antes de aprovar execucao futura."]
      )
    ];

    return {
      periodStart,
      periodEnd,
      phases: [
        {
          ...strategyPhase,
          objective: `Organizar contexto, oferta e metodo para ${objective.toLowerCase()}.`,
          activities: strategyActivities
        },
        {
          ...warmupPhase,
          objective: "Aquecer audiencia e testar angulos com base no historico disponivel.",
          activities: warmupActivities
        },
        {
          ...conversionPhase,
          objective: "Executar operacao comercial com acompanhamento humano e suporte ativo.",
          activities: conversionActivities
        }
      ],
      reviewNotes: [
        "Cronograma gerado para revisao humana antes de execucao.",
        "Ajustar datas com base em agenda real da equipe e disponibilidade do expert.",
        `Contexto interno utilizado como sinais agregados: ${Object.keys(sourceContext.internalSignals).join(", ")}.`,
        previousActivities.length > 0 ? `Comparar com atividades historicas similares: ${previousActivities.join(", ")}.` : "Sem smart schedule anterior identificado para comparacao direta.",
        `Briefing considerado: ${briefing.slice(0, 140)}${briefing.length > 140 ? "..." : ""}`
      ]
    };
  }
}

export const aiScheduleGeneratorService = new AiScheduleGeneratorService();
