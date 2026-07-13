"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { mockUsers } from "@/mocks/flow-data";

type AuthState = {
  currentUserId: string;
  setCurrentUserId: (userId: string) => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      currentUserId: mockUsers[0].id,
      setCurrentUserId: (currentUserId) => set({ currentUserId }),
    }),
    {
      name: "flow-jl-auth",
    },
  ),
);
