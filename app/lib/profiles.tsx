import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { apiBase, fetchJSON } from "./api";

type Profile = {
  id: string;
  name: string;
  srs_config: { base_interval_days: number; ease_multiplier: number };
};

type ProfileContextValue = {
  profiles: Profile[];
  currentProfileId: string | null;
  currentProfile: Profile | null;
  setCurrentProfileId: (id: string) => void;
  refreshProfiles: () => Promise<void>;
  createProfile: (name: string) => Promise<Profile>;
  updateProfileSRS: (id: string, cfg: Profile["srs_config"]) => Promise<Profile>;
};

const ProfileContext = createContext<ProfileContextValue | undefined>(undefined);

const STORAGE_KEY = "perennial.profileId";

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(null);

  useEffect(() => {
    void refreshProfiles();
  }, []);

  useEffect(() => {
    if (!profiles.length) return;
    const stored = localStorage.getItem(STORAGE_KEY);
    const exists = stored && profiles.find((p) => p.id === stored);
    if (exists) {
      setCurrentProfileId(exists.id);
      return;
    }
    setCurrentProfileId(profiles[0]?.id ?? null);
  }, [profiles]);

  useEffect(() => {
    if (currentProfileId) {
      localStorage.setItem(STORAGE_KEY, currentProfileId);
    }
  }, [currentProfileId]);

  const [bootstrapping, setBootstrapping] = useState(false);

  async function refreshProfiles() {
    try {
      const list = await fetchJSON<Profile[]>(`${apiBase()}/profiles`);
      if (Array.isArray(list) && list.length > 0) {
        setProfiles(list);
        return;
      }

      if (bootstrapping) return;
      setBootstrapping(true);

      const created = await fetchJSON<Profile>(`${apiBase()}/profiles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "My Profile" }),
      });
      setProfiles([created]);
      setCurrentProfileId(created.id);
    } catch {
      setProfiles([]);
    } finally {
      setBootstrapping(false);
    }
  }

  async function createProfile(name: string) {
    const created = await fetchJSON<Profile>(`${apiBase()}/profiles`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    await refreshProfiles();
    setCurrentProfileId(created.id);
    return created;
  }

  async function updateProfileSRS(id: string, cfg: Profile["srs_config"]) {
    const updated = await fetchJSON<Profile>(`${apiBase()}/profiles/${id}/srs`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cfg),
    });
    await refreshProfiles();
    setCurrentProfileId(updated.id);
    return updated;
  }

  const value = useMemo<ProfileContextValue>(() => {
    const currentProfile = profiles.find((p) => p.id === currentProfileId) ?? null;
    return {
      profiles,
      currentProfileId,
      currentProfile,
      setCurrentProfileId,
      refreshProfiles,
      createProfile,
      updateProfileSRS,
    };
  }, [profiles, currentProfileId]);

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfiles(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) {
    throw new Error("useProfiles must be used within ProfileProvider");
  }
  return ctx;
}
