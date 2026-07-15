"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { DigitalStrategy, LaunchPlan, PlanningScheduleItem } from "@/types/flow";

export const initialStrategies: DigitalStrategy[] = [
  {
    id: "strategy-flow-summer",
    name: "Flow JL Summer",
    objective: "Posicionar a operacao como referencia em lançamentos digitais previsiveis.",
    audience: "Agencias e gestores de produtos digitais com operacao em crescimento.",
    promise: "Transformar uma operacao fragmentada em um fluxo claro, mensuravel e escalavel.",
    channels: ["Instagram", "YouTube", "Email"],
    owner: "Renato Alves",
    status: "Aprovada",
  },
  {
    id: "strategy-mentoria-evergreen",
    name: "Mentoria JL Evergreen",
    objective: "Criar demanda recorrente para a mentoria ao longo do segundo semestre.",
    audience: "Profissionais de tecnologia em transicao para qualidade de software.",
    promise: "Acelerar a entrada em testes de software com acompanhamento pratico.",
    channels: ["LinkedIn", "YouTube", "WhatsApp"],
    owner: "Renato Alves",
    status: "Em validacao",
  },
];

export const initialLaunches: LaunchPlan[] = [
  {
    id: "launch-flow-summer-2026",
    name: "Flow JL Summer 2026",
    strategyId: "strategy-flow-summer",
    product: "Flow JL",
    owner: "Marina Costa",
    phase: "Aquecimento",
    status: "Em andamento",
    startDate: "2026-07-06",
    endDate: "2026-08-14",
    revenueGoal: 350000,
    budget: 65000,
  },
  {
    id: "launch-mentoria-august",
    name: "Turma Mentoria Agosto",
    strategyId: "strategy-mentoria-evergreen",
    product: "Mentoria em Testes de Software",
    owner: "Renato Alves",
    phase: "Planejamento",
    status: "Planejado",
    startDate: "2026-08-03",
    endDate: "2026-09-04",
    revenueGoal: 180000,
    budget: 28000,
  },
];

export const initialScheduleItems: PlanningScheduleItem[] = [
  {
    id: "schedule-positioning",
    title: "Validar posicionamento e promessa central",
    launchId: "launch-flow-summer-2026",
    owner: "Renato Alves",
    squad: "Estrategia",
    startDate: "2026-07-06",
    endDate: "2026-07-10",
    status: "Concluido",
    priority: "Alta",
    dependencyId: "",
    notes: "Validacao com diretoria e liderancas da operacao.",
  },
  {
    id: "schedule-content-plan",
    title: "Fechar plano editorial de aquecimento",
    launchId: "launch-flow-summer-2026",
    owner: "Clara Borges",
    squad: "Conteudo",
    startDate: "2026-07-13",
    endDate: "2026-07-20",
    status: "Em andamento",
    priority: "Alta",
    dependencyId: "schedule-positioning",
    notes: "Priorizar provas, bastidores e demonstracoes do fluxo operacional.",
  },
  {
    id: "schedule-media-plan",
    title: "Configurar plano de midia e distribuicao",
    launchId: "launch-flow-summer-2026",
    owner: "Lucas Freitas",
    squad: "Growth",
    startDate: "2026-07-20",
    endDate: "2026-07-27",
    status: "Pendente",
    priority: "Media",
    dependencyId: "schedule-content-plan",
    notes: "Distribuir verba por canal e janela de campanha.",
  },
  {
    id: "schedule-evergreen-research",
    title: "Consolidar pesquisa de audiencia",
    launchId: "launch-mentoria-august",
    owner: "Renato Alves",
    squad: "Estrategia",
    startDate: "2026-08-03",
    endDate: "2026-08-07",
    status: "Pendente",
    priority: "Alta",
    dependencyId: "",
    notes: "Revisar objeções e motivadores da nova turma.",
  },
];

type PlanningState = {
  strategies: DigitalStrategy[];
  launches: LaunchPlan[];
  scheduleItems: PlanningScheduleItem[];
  addStrategy: (strategy: DigitalStrategy) => void;
  updateStrategy: (strategyId: string, updates: Partial<DigitalStrategy>) => void;
  deleteStrategy: (strategyId: string) => void;
  addLaunch: (launch: LaunchPlan) => void;
  updateLaunch: (launchId: string, updates: Partial<LaunchPlan>) => void;
  deleteLaunch: (launchId: string) => void;
  addScheduleItem: (item: PlanningScheduleItem) => void;
  updateScheduleItem: (itemId: string, updates: Partial<PlanningScheduleItem>) => void;
  deleteScheduleItem: (itemId: string) => void;
};

export const usePlanningStore = create<PlanningState>()(
  persist(
    (set) => ({
      strategies: initialStrategies,
      launches: initialLaunches,
      scheduleItems: initialScheduleItems,
      addStrategy: (strategy) => set((state) => ({ strategies: [strategy, ...state.strategies] })),
      updateStrategy: (strategyId, updates) =>
        set((state) => ({
          strategies: state.strategies.map((strategy) =>
            strategy.id === strategyId ? { ...strategy, ...updates } : strategy,
          ),
        })),
      deleteStrategy: (strategyId) =>
        set((state) => ({ strategies: state.strategies.filter((strategy) => strategy.id !== strategyId) })),
      addLaunch: (launch) => set((state) => ({ launches: [launch, ...state.launches] })),
      updateLaunch: (launchId, updates) =>
        set((state) => ({
          launches: state.launches.map((launch) => (launch.id === launchId ? { ...launch, ...updates } : launch)),
        })),
      deleteLaunch: (launchId) =>
        set((state) => ({ launches: state.launches.filter((launch) => launch.id !== launchId) })),
      addScheduleItem: (item) => set((state) => ({ scheduleItems: [item, ...state.scheduleItems] })),
      updateScheduleItem: (itemId, updates) =>
        set((state) => ({
          scheduleItems: state.scheduleItems.map((item) => (item.id === itemId ? { ...item, ...updates } : item)),
        })),
      deleteScheduleItem: (itemId) =>
        set((state) => ({ scheduleItems: state.scheduleItems.filter((item) => item.id !== itemId) })),
    }),
    {
      name: "flow-jl-planning-directory",
      version: 1,
    },
  ),
);
