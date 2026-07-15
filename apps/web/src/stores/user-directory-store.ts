"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { mockUsers } from "@/mocks/flow-data";
import type { ManagedUser } from "@/types/flow";

const userOrganization: Record<
  string,
  Pick<ManagedUser, "profileName" | "jobTitle" | "squad" | "status" | "lastAccess">
> = {
  "u-admin": {
    profileName: "Administrador Flow JL",
    jobTitle: "Administrador do Portal",
    squad: "Diretoria",
    status: "Ativo",
    lastAccess: "Hoje, 09:14",
  },
  "u-strategy": {
    profileName: "Coordenador Operacional",
    jobTitle: "Coordenador Operacional",
    squad: "Estratégia",
    status: "Ativo",
    lastAccess: "Hoje, 08:56",
  },
  "u-social": {
    profileName: "Coordenador Operacional",
    jobTitle: "Coordenador Operacional",
    squad: "Conteúdo",
    status: "Suspenso",
    lastAccess: "07 Jul, 16:03",
  },
  "u-traffic": {
    profileName: "Coordenador Operacional",
    jobTitle: "Especialista de Performance",
    squad: "Growth",
    status: "Pendente",
    lastAccess: "Convite enviado",
  },
  "u-ops": {
    profileName: "Coordenador Operacional",
    jobTitle: "Coordenador Operacional",
    squad: "Ops Core",
    status: "Ativo",
    lastAccess: "Hoje, 08:42",
  },
  "u-approver": {
    profileName: "Aprovador Executivo",
    jobTitle: "Coordenador Operacional",
    squad: "Governança",
    status: "Ativo",
    lastAccess: "Ontem, 18:11",
  },
};

export const initialManagedUsers: ManagedUser[] = mockUsers.map((user) => ({
  ...user,
  ...userOrganization[user.id],
}));

type UserDirectoryState = {
  users: ManagedUser[];
  addUser: (user: ManagedUser) => void;
  updateUser: (userId: string, updates: Partial<ManagedUser>) => void;
};

export const useUserDirectoryStore = create<UserDirectoryState>()(
  persist(
    (set) => ({
      users: initialManagedUsers,
      addUser: (user) => set((state) => ({ users: [user, ...state.users] })),
      updateUser: (userId, updates) =>
        set((state) => ({
          users: state.users.map((user) => (user.id === userId ? { ...user, ...updates } : user)),
        })),
    }),
    {
      name: "flow-jl-user-directory",
      version: 1,
    },
  ),
);
