"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { OnboardingState } from "../application/contracts";
import type { CompanionSettings, WorkspaceBootstrap } from "./OnboardingFlow";
import { readProfileUsername, saveProfileUsername } from "./profile-storage";

export function useWorkspaceBootstrap(online: boolean) {
  const [activeUsername, setActiveUsername] = useState<string | null>(() =>
    typeof window === "undefined" ? null : readProfileUsername(),
  );
  const [workspace, setWorkspace] = useState<WorkspaceBootstrap | null>(null);
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [providerUnavailable, setProviderUnavailable] = useState(false);
  const attemptedUsername = useRef(activeUsername);
  const opening = useRef(false);

  const loadWorkspace = useCallback(async (username: string) => {
    const [onboarding, companion] = await Promise.all([
      getJson<OnboardingState>("/api/v1/onboarding"),
      optionalCompanionSettings(),
    ]);
    saveProfileUsername(username);
    setActiveUsername(username);
    setProviderUnavailable(companion === null);
    setWorkspace({ username, onboarding, companionConfigured: companion?.configured ?? false });
  }, []);

  const openWorkspace = useCallback(
    async (username: string, existingProfile = false) => {
      if (opening.current) return;
      attemptedUsername.current = username;
      opening.current = true;
      setLaunchError(null);
      try {
        if (!online) throw new Error("Connect to the workspace to finish setup.");
        if (existingProfile) {
          try {
            await loadWorkspace(username);
            return;
          } catch (error) {
            if (!(error instanceof WorkspaceReadError) || (error.status !== 401 && error.status !== 403))
              throw error;
          }
        }
        const response = await fetch("/api/v1/demo", {
          method: "POST",
          headers: { "content-type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({}),
        });
        if (!response.ok) {
          if (response.status === 429)
            throw new Error("Setup has been tried too many times. Please wait and retry.");
          if (response.status === 403)
            throw new Error(
              "Workspace setup was blocked. Omplish must be opened from its configured local URL.",
            );
          throw new Error("Your workspace could not be opened. Check your connection and try again.");
        }
        const result = (await response.json()) as { redirectTo?: unknown };
        if (result.redirectTo !== "/inbox") throw new Error("Your workspace could not be opened. Try again.");
        await loadWorkspace(username);
      } catch (error) {
        setLaunchError(
          error instanceof Error ? error.message : "Your workspace could not be opened. Try again.",
        );
        throw error;
      } finally {
        opening.current = false;
      }
    },
    [loadWorkspace, online],
  );

  useEffect(() => {
    if (!activeUsername || workspace || launchError || opening.current) return;
    void openWorkspace(activeUsername, true).catch(() => undefined);
  }, [activeUsername, launchError, openWorkspace, workspace]);

  function retry() {
    const username = attemptedUsername.current;
    if (username) void openWorkspace(username, true).catch(() => undefined);
  }

  return { activeUsername, workspace, setWorkspace, launchError, providerUnavailable, openWorkspace, retry };
}

async function getJson<T>(url: string, signal: AbortSignal | null = null): Promise<T> {
  const response = await fetch(url, { cache: "no-store", credentials: "same-origin", signal });
  if (!response.ok) throw new WorkspaceReadError(response.status);
  return (await response.json()) as T;
}

async function optionalCompanionSettings(): Promise<CompanionSettings | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3_000);
  try {
    return await getJson<CompanionSettings>("/api/v1/assistant/settings", controller.signal);
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

class WorkspaceReadError extends Error {
  readonly status: number;

  constructor(status: number) {
    super("Your workspace could not be opened. Try again.");
    this.status = status;
  }
}
