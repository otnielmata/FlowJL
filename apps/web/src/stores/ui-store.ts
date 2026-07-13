"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { ExperienceState } from "@/types/flow";

type UiState = {
  commandOpen: boolean;
  notificationsOpen: boolean;
  sidebarCollapsed: boolean;
  experienceState: ExperienceState;
  setCommandOpen: (open: boolean) => void;
  setNotificationsOpen: (open: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setExperienceState: (state: ExperienceState) => void;
};

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      commandOpen: false,
      notificationsOpen: false,
      sidebarCollapsed: false,
      experienceState: "ready",
      setCommandOpen: (commandOpen) => set({ commandOpen }),
      setNotificationsOpen: (notificationsOpen) => set({ notificationsOpen }),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      setExperienceState: (experienceState) => set({ experienceState }),
    }),
    {
      name: "flow-jl-ui",
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        experienceState: state.experienceState,
      }),
    },
  ),
);
