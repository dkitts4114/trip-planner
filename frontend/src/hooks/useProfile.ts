/**
 * Persistent user profile stored in localStorage.
 * Provides default values that pre-fill the flight search form.
 */
import { useState, useEffect, useCallback } from "react";
import type { CabinClass, MaxStopsOption } from "../lib/api";

export interface UserProfile {
  homeAirport: string;        // IATA, e.g. "SFO"
  defaultAdults: number;
  defaultCabin: CabinClass;
  defaultMaxStops: MaxStopsOption;
  tripDuration: "weekend" | "long_weekend" | "week";  // for calendar scanning
  lookAheadMonths: number;                             // 1 – 6
}

const STORAGE_KEY = "trip_planner_profile";

export const DEFAULT_PROFILE: UserProfile = {
  homeAirport: "SFO",
  defaultAdults: 1,
  defaultCabin: "economy",
  defaultMaxStops: "any",
  tripDuration: "weekend",
  lookAheadMonths: 3,
};

function load(): UserProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PROFILE };
    return { ...DEFAULT_PROFILE, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_PROFILE };
  }
}

export function useProfile() {
  const [profile, setProfileState] = useState<UserProfile>(load);

  // Persist on every change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    } catch {
      /* storage unavailable */
    }
  }, [profile]);

  const setProfile = useCallback((patch: Partial<UserProfile>) => {
    setProfileState((prev) => ({ ...prev, ...patch }));
  }, []);

  const resetProfile = useCallback(() => {
    setProfileState({ ...DEFAULT_PROFILE });
  }, []);

  return { profile, setProfile, resetProfile };
}
