import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { createIdentityApplication } from "../../modules/identity/application/identity-application.ts";
import { createDemoEntryLimiter } from "../../modules/identity/infrastructure/demo-entry-limiter.ts";
import {
  decryptOpenAIKey,
  encryptOpenAIKey,
} from "../../modules/assistant/infrastructure/openai-credential-crypto.ts";
import type { Database } from "../../shared/db/client.ts";
import { schema } from "../../shared/db/schema.ts";
import { getTestDatabaseUrl } from "../../shared/config/environment.ts";
import {
  createAuthenticatedAccount,
  identityTestAuthRuntime,
  identityTestClock,
} from "./support/identity-test-fixture.ts";

const dependencies = vi.hoisted(() => ({ get: vi.fn<() => unknown>() }));
vi.mock("../../modules/identity/infrastructure/production-dependencies.ts", () => ({
  getProductionIdentityDependencies: dependencies.get,
}));

const databaseName = `continuity_${process.pid}_${randomUUID().replaceAll("-", "").slice(0, 12)}`;
const admin = new Pool({ connectionString: getTestDatabaseUrl(), max: 1 });
let pool: Pool | undefined;
let database: Database;
let application: ReturnType<typeof createIdentityApplication>;

describe("nondestructive workspace bootstrap compatibility", () => {
  beforeAll(async () => {
    await admin.query(`create database "${databaseName}"`);
    const url = new URL(getTestDatabaseUrl());
    url.pathname = `/${databaseName}`;
    pool = new Pool({ connectionString: url.toString(), max: 8 });
    database = drizzle(pool, { schema });
    await migrate(database, { migrationsFolder: "drizzle" });
    dependencies.get.mockReturnValue({
      database,
      clock: identityTestClock,
      authRuntime: identityTestAuthRuntime,
    });
    application = createIdentityApplication({
      database,
      clock: identityTestClock,
      authRuntime: identityTestAuthRuntime,
    });
  });

  afterAll(async () => {
    await pool?.end();
    await admin.query(`drop database if exists "${databaseName}"`);
    await admin.end();
  });

  it("preserves actor, tasks, preferences, proposals, Companion, and credentials through legacy retry", async () => {
    const created = await request("203.0.113.101");
    const cookie = cookiesFrom(created);
    const actor = await application.resolveActor(new Headers({ cookie }));
    const [task] = await database
      .select()
      .from(schema.tasks)
      .where(eq(schema.tasks.userId, actor.userId))
      .limit(1);
    await database
      .update(schema.tasks)
      .set({ title: "Keep my real task", descriptionMd: "User edits survive launch" })
      .where(eq(schema.tasks.id, task!.id));
    const preferences = await application.getUserPreferences(actor);
    await application.updateUserPreferences(actor, preferences.version, {
      timezone: "Asia/Kuching",
      theme: "dark",
    });
    await database
      .insert(schema.companionProfiles)
      .values({ userId: actor.userId, totalXp: 125, communicationStyle: "direct" });
    await database
      .insert(schema.companionMemories)
      .values({ userId: actor.userId, id: randomUUID(), text: "Keep approved memory" });
    await database.insert(schema.openaiCredentials).values({
      userId: actor.userId,
      ...encryptOpenAIKey("synthetic-provider-key", "synthetic-encryption-secret-over-32-characters"),
    });
    await database.insert(schema.plannerProposals).values({
      userId: actor.userId,
      id: randomUUID(),
      planningDate: "2026-07-18",
      schemaVersion: 1,
      proposal: {},
      contextVersions: {},
      status: "pending",
      model: "fixture",
      promptVersion: "continuity",
      idempotencyKey: randomUUID(),
      createdAt: identityTestClock.now(),
      expiresAt: new Date("2026-07-18T01:00:00Z"),
    });
    const before = await snapshot(actor.userId);
    expect(() =>
      decryptOpenAIKey(before.credential[0]!, "different-encryption-secret-over-32-characters"),
    ).toThrow();
    // Simulate a failed GET or lost bootstrap response body: retry with the accepted browser cookie.
    for (let retry = 0; retry < 3; retry += 1) {
      const resumed = await request("203.0.113.101", cookie);
      expect(resumed.status).toBe(200);
      expect(await snapshot(actor.userId)).toEqual(before);
      expect(await resumed.json()).toMatchObject({ mode: "resumed" });
      expect(await application.resolveActor(new Headers({ cookie }))).toEqual(actor);
    }
  });

  it("does not charge allocation limits for an authenticated resume", async () => {
    const created = await request("203.0.113.102");
    const cookie = cookiesFrom(created);
    const limiter = createDemoEntryLimiter(database, identityTestClock);
    for (let index = 0; index < 4; index += 1) expect(await limiter.consume("203.0.113.102")).toBe(true);
    expect(await limiter.consume("203.0.113.102")).toBe(false);
    const resumed = await request("203.0.113.102", cookie);
    expect(resumed.status).toBe(200);
    expect(await resumed.json()).toMatchObject({ mode: "resumed" });
    expect(await limiter.consume("203.0.113.102")).toBe(false);
  });

  it("requires an authenticated deliberate reset and rejects forged ownership", async () => {
    const created = await request("203.0.113.103");
    const cookie = cookiesFrom(created);
    const actor = await application.resolveActor(new Headers({ cookie }));
    const before = await snapshot(actor.userId);
    expect((await request("203.0.113.104", undefined, { intent: "reset-demo", confirm: true })).status).toBe(
      401,
    );
    expect((await request("203.0.113.103", cookie, { intent: "reset-demo" })).status).toBe(400);
    expect(
      (await request("203.0.113.103", cookie, { intent: "reset-demo", confirm: true, userId: randomUUID() }))
        .status,
    ).toBe(400);
    expect(await snapshot(actor.userId)).toEqual(before);
  });

  it("resumes a valid non-demo session without allocating another actor", async () => {
    const account = await createAuthenticatedAccount(application, "retained-legacy-profile@example.test");
    const response = await request("203.0.113.105", account.cookie);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ mode: "resumed" });
    expect((await application.resolveActor(new Headers({ cookie: account.cookie }))).userId).toBe(
      account.userId,
    );
  });

  it("preserves the actor across a local port change with a valid cookie", async () => {
    const created = await request("203.0.113.106");
    const cookie = cookiesFrom(created);
    const actor = await application.resolveActor(new Headers({ cookie }));
    const before = await snapshot(actor.userId);
    const changedPort = createIdentityApplication({
      database,
      clock: identityTestClock,
      authRuntime: { ...identityTestAuthRuntime, baseUrl: "http://localhost:3999" },
    });
    expect(
      await changedPort.enterDemo(new Headers({ cookie, origin: "http://localhost:3999" })),
    ).toMatchObject({ actor, mode: "resumed" });
    expect(await snapshot(actor.userId)).toEqual(before);
  });

  it("retains inaccessible data when an anonymous first response including its cookie is lost", async () => {
    const first = await request("203.0.113.107");
    const oldActor = await application.resolveActor(new Headers({ cookie: cookiesFrom(first) }));
    const before = await snapshot(oldActor.userId);
    const retry = await request("203.0.113.107");
    const newActor = await application.resolveActor(new Headers({ cookie: cookiesFrom(retry) }));
    expect(newActor.userId).not.toBe(oldActor.userId);
    expect(await snapshot(oldActor.userId)).toEqual(before);
  });

  it("treats a legacy request with no body as nondestructive resume", async () => {
    const created = await request("203.0.113.108");
    const cookie = cookiesFrom(created);
    const { POST } = await import("../../app/api/v1/demo/route.ts");
    const response = await POST(
      new Request(`${identityTestAuthRuntime.baseUrl}/api/v1/demo`, {
        method: "POST",
        headers: { "content-type": "application/json", origin: identityTestAuthRuntime.baseUrl, cookie },
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ mode: "resumed" });
  });
});

async function request(address: string, cookie?: string, body: unknown = {}) {
  const { POST } = await import("../../app/api/v1/demo/route.ts");
  return POST(
    new Request(`${identityTestAuthRuntime.baseUrl}/api/v1/demo`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: identityTestAuthRuntime.baseUrl,
        "sec-fetch-site": "same-origin",
        "x-real-ip": address,
        ...(cookie ? { cookie } : {}),
      },
      body: JSON.stringify(body),
    }),
  );
}

function cookiesFrom(response: Response) {
  return response.headers
    .getSetCookie()
    .map((value) => value.split(";", 1)[0])
    .join("; ");
}

async function snapshot(userId: string) {
  return {
    tasks: await database.select().from(schema.tasks).where(eq(schema.tasks.userId, userId)),
    preferences: await database
      .select()
      .from(schema.userPreferences)
      .where(eq(schema.userPreferences.userId, userId)),
    proposals: await database
      .select()
      .from(schema.plannerProposals)
      .where(eq(schema.plannerProposals.userId, userId)),
    companion: await database
      .select()
      .from(schema.companionProfiles)
      .where(eq(schema.companionProfiles.userId, userId)),
    memories: await database
      .select()
      .from(schema.companionMemories)
      .where(eq(schema.companionMemories.userId, userId)),
    credential: await database
      .select()
      .from(schema.openaiCredentials)
      .where(eq(schema.openaiCredentials.userId, userId)),
  };
}
