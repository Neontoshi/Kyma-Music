import { create } from "zustand";

interface UserStore {
  displayName: string;
  username: string;
  hasCompletedOnboarding: boolean;
  setUser: (displayName: string, username: string) => void;
}

export const useUserStore = create<UserStore>((set) => {
  // Load from localStorage on init
  const defaults = { displayName: "", username: "", hasCompletedOnboarding: false };
  let stored: Partial<typeof defaults> = {};
  try {
    const raw = localStorage.getItem("kyma_user");
    if (raw) stored = JSON.parse(raw);
  } catch {
    localStorage.removeItem("kyma_user");
  }

  return {
    ...defaults,
    ...stored,
    setUser: (displayName: string, username: string) => {
      const data = { displayName, username, hasCompletedOnboarding: true };
      localStorage.setItem("kyma_user", JSON.stringify(data));
      set(data);
    },
  };
});
