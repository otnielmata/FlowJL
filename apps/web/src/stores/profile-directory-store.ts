"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { AccessProfile } from "@/types/flow";

export const initialAccessProfiles: AccessProfile[] = [
  {
    id: "profile-admin",
    name: "Administrador Flow JL",
    focus: "Controle total da operação e da segurança",
    approvals: "Sem limite",
    role: "admin",
    roleLabel: "Administrador",
    modules: [
      { name: "Dashboard", permission: "Total" },
      { name: "Operações", permission: "Total" },
      { name: "Usuários", permission: "Total" },
      { name: "Perfis", permission: "Total" },
      { name: "Configurações", permission: "Total" },
    ],
  },
  {
    id: "profile-ops",
    name: "Coordenador Operacional",
    focus: "Execução, filas críticas e dependências",
    approvals: "Até R$ 25 mil",
    role: "operations",
    roleLabel: "Operações",
    modules: [
      { name: "Dashboard", permission: "Leitura" },
      { name: "Cronogramas", permission: "Edicao" },
      { name: "Operações", permission: "Total" },
      { name: "Aprovações", permission: "Edicao" },
      { name: "Relatórios", permission: "Leitura" },
    ],
  },
  {
    id: "profile-approval",
    name: "Aprovador Executivo",
    focus: "Governança de verba, criativos e marcos",
    approvals: "Até R$ 80 mil",
    role: "approver",
    roleLabel: "Aprovações",
    modules: [
      { name: "Dashboard", permission: "Leitura" },
      { name: "Aprovações", permission: "Total" },
      { name: "Relatórios", permission: "Leitura" },
      { name: "Operações", permission: "Leitura" },
      { name: "Cronogramas", permission: "Leitura" },
    ],
  },
];

type ProfileDirectoryState = {
  profiles: AccessProfile[];
  addProfile: (profile: AccessProfile) => void;
  updateProfile: (profileId: string, updates: Partial<AccessProfile>) => void;
};

export const useProfileDirectoryStore = create<ProfileDirectoryState>()(
  persist(
    (set) => ({
      profiles: initialAccessProfiles,
      addProfile: (profile) => set((state) => ({ profiles: [...state.profiles, profile] })),
      updateProfile: (profileId, updates) =>
        set((state) => ({
          profiles: state.profiles.map((profile) =>
            profile.id === profileId ? { ...profile, ...updates } : profile,
          ),
        })),
    }),
    {
      name: "flow-jl-profile-directory",
      version: 1,
    },
  ),
);
