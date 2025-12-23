// lib/auth-store.ts
import { create } from "zustand";
import { authClient } from "@/utils/auth-client";

export type LoggedInUser = {
  id: string;
  name: string;
  email: string;
};

interface AuthState {
  user: LoggedInUser | null;
  isAuthChecking: boolean;

  fetchUser: () => Promise<void>;
  clearUser: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthChecking: true,

  fetchUser: async () => {
    try {
      const { data } = await authClient.getSession();
      if (data?.user) {
        set({
          user: {
            id: data.user.id,
            name: data.user.name,
            email: data.user.email,
          },
          isAuthChecking: false,
        });
      } else {
        set({ user: null, isAuthChecking: false });
      }
    } catch {
      set({ user: null, isAuthChecking: false });
    }
  },

  clearUser: () => set({ user: null, isAuthChecking: false }),
}));
