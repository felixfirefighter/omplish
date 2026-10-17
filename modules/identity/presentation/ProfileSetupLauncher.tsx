"use client";

import { BrandMark, ThemeToggle, useOnlineStatus } from "@/shared/presentation";
import type { OnboardingState } from "../application/contracts";

import { OnboardingFlow, type CompanionSettings } from "./OnboardingFlow";
import styles from "./ProfileSetupLauncher.module.css";
import { useWorkspaceBootstrap } from "./useWorkspaceBootstrap";

type Navigate = (destination: string) => void;

export function ProfileSetupLauncher({
  navigate = (destination) => window.location.replace(destination),
  resumeTo,
}: {
  navigate?: Navigate | undefined;
  resumeTo?: string | null | undefined;
}) {
  const online = useOnlineStatus();
  const { activeUsername, workspace, setWorkspace, launchError, providerUnavailable, openWorkspace, retry } =
    useWorkspaceBootstrap(online);

  return (
    <div className={styles.page}>
      <a className="skip-link" href="#onboarding-content">
        Skip to onboarding
      </a>
      <div className={styles.brand}>
        <BrandMark />
      </div>
      <div className={styles.theme}>
        <ThemeToggle />
      </div>

      {launchError && !workspace ? (
        <main className={styles.launchError} id="onboarding-content">
          <p className="eyebrow">Omplish</p>
          <h1>We couldn’t open your workspace.</h1>
          <p>{launchError}</p>
          <button className="primary-button" type="button" disabled={!online} onClick={retry}>
            Try again
          </button>
        </main>
      ) : (
        <main id="onboarding-content">
          <OnboardingFlow
            workspace={workspace}
            online={online}
            providerUnavailable={providerUnavailable}
            initialName={activeUsername}
            onNameReady={openWorkspace}
            onComplete={async (goals) => {
              const next = await requestJson<OnboardingState>("/api/v1/onboarding", "POST", { goals });
              setWorkspace((current) => (current ? { ...current, onboarding: next } : current));
            }}
            onConnectKey={async (apiKey) => {
              const response = await fetch("/api/v1/assistant/settings", {
                method: "PATCH",
                headers: { "content-type": "application/json" },
                credentials: "same-origin",
                body: JSON.stringify({ apiKey }),
              });
              const payload = (await response.json()) as {
                ok?: boolean;
                reason?: string;
              } & CompanionSettings;
              if (!response.ok)
                return { ok: false, reason: payload.reason === "invalid" ? "invalid" : "network" } as const;
              setWorkspace((current) =>
                current ? { ...current, companionConfigured: payload.configured } : current,
              );
              return { ok: true } as const;
            }}
            onCheckin={async (mood, note) => {
              const next = await requestJson<OnboardingState>("/api/v1/onboarding", "PATCH", { mood, note });
              setWorkspace((current) => (current ? { ...current, onboarding: next } : current));
            }}
            onCompanionChat={async (name) => {
              try {
                const result = await requestJson<{ ok: boolean; text?: string }>(
                  "/api/v1/assistant/companion",
                  "POST",
                  { name },
                );
                return result.ok && result.text ? result.text : null;
              } catch {
                return null;
              }
            }}
            onNavigate={(destination) => navigate(resumeTo ?? destination)}
          />
        </main>
      )}
    </div>
  );
}

async function requestJson<T>(url: string, method: "POST" | "PATCH", body: unknown): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: { "content-type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error("That change was not saved. Try again.");
  return (await response.json()) as T;
}
