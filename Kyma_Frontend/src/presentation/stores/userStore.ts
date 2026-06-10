import { create } from "zustand";

interface UserStore {
  displayName: string;
  username: string;
  hasCompletedOnboarding: boolean;
  setUser: (displayName: string, username: string) => void;
}

export const useUserStore = create<UserStore>((set) => {
  // Load from localStorage on init
  const stored = localStorage.getItem("kyma_user");
  const defaults = stored
    ? JSON.parse(stored)
    : { displayName: "", username: "", hasCompletedOnboarding: false };

  return {
    ...defaults,
    setUser: (displayName: string, username: string) => {
      const data = { displayName, username, hasCompletedOnboarding: true };
      localStorage.setItem("kyma_user", JSON.stringify(data));
      set(data);
    },
  };
});
