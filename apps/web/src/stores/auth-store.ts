"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type AuthState = {
  currentUserId: string | null;
  isAuthenticated: boolean;
  hydrated: boolean;
  login: (userId: string) => void;
  logout: () => void;
  setCurrentUserId: (userId: string) => void;
  setHydrated: (hydrated: boolean) => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      currentUserId: null,
      isAuthenticated: false,
      hydrated: false,
      login: (currentUserId) => set({ currentUserId, isAuthenticated: true }),
      logout: () => set({ currentUserId: null, isAuthenticated: false }),
      setCurrentUserId: (currentUserId) => set({ currentUserId }),
      setHydrated: (hydrated) => set({ hydrated }),
    }),
    {
      name: "flow-jl-auth",
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    },
  ),
);
