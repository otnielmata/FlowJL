"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { JobRole } from "@/types/flow";

export const initialJobRoles: JobRole[] = [
  {
    id: "cargo-1",
    name: "Administrador do Portal",
    scope: "Gestão total de acesso e governança",
    reportsTo: "Diretoria JL",
    headcount: 2,
    responsibilities: [
      "Gerenciar usuarios, perfis e cargos",
      "Liberar acessos criticos do portal",
      "Auditar mudancas sensiveis de permissao",
    ],
  },
  {
    id: "cargo-2",
    name: "Coordenador Operacional",
    scope: "Execução e dependências entre squads",
    reportsTo: "Administrador do Portal",
    headcount: 4,
    responsibilities: [
      "Acompanhar cronogramas e filas operacionais",
      "Atualizar status criticos do lancamento",
      "Escalar bloqueios de producao e aprovacao",
    ],
  },
  {
    id: "cargo-3",
    name: "Especialista de Performance",
    scope: "Midia, investimento e indicadores",
    reportsTo: "Coordenador Operacional",
    headcount: 3,
    responsibilities: [
      "Operar campanhas e verbas",
      "Revisar indicadores de performance",
      "Sinalizar riscos de meta e janela de lancamento",
    ],
  },
];

type JobRoleDirectoryState = {
  roles: JobRole[];
  addRole: (role: JobRole) => void;
  updateRole: (roleId: string, updates: Partial<JobRole>) => void;
};

export const useJobRoleDirectoryStore = create<JobRoleDirectoryState>()(
  persist(
    (set) => ({
      roles: initialJobRoles,
      addRole: (role) => set((state) => ({ roles: [...state.roles, role] })),
      updateRole: (roleId, updates) =>
        set((state) => {
          const currentRole = state.roles.find((role) => role.id === roleId);
          const nextName = updates.name?.trim();

          return {
            roles: state.roles.map((role) => {
              if (role.id === roleId) {
                return { ...role, ...updates, ...(nextName ? { name: nextName } : {}) };
              }

              if (currentRole && nextName && role.reportsTo === currentRole.name) {
                return { ...role, reportsTo: nextName };
              }

              return role;
            }),
          };
        }),
    }),
    {
      name: "flow-jl-job-role-directory",
      version: 1,
    },
  ),
);
