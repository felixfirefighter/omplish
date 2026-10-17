import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, rename, rm, stat, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "omplish-stage-test-"));
  temporaryDirectories.push(root);
  await mkdir(join(root, "scripts"));
  await cp("scripts/stage-desktop-runtime.mjs", join(root, "scripts/stage-desktop-runtime.mjs"));
  for (const name of ["desktop-runtime-staging-paths.ts"]) {
    try {
      await cp(join("scripts", name), join(root, "scripts", name));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
  const runtime = join(root, "desktop/runtime");
  const nodeSource = join(root, "source/node");
  const postgresSource = join(root, "source/postgres");
  await mkdir(nodeSource, { recursive: true });
  await mkdir(join(postgresSource, "bin"), { recursive: true });
  await mkdir(join(postgresSource, "lib"));
  await mkdir(join(postgresSource, "share/extension"), { recursive: true });
  await writeFile(join(nodeSource, "node"), "synthetic node executable");
  for (const file of ["postgres", "initdb", "createdb", "pg_ctl", "psql"]) {
    await writeFile(join(postgresSource, "bin", file), `synthetic ${file}`);
  }
  const nodeArchive = join(root, "node.tar.gz");
  const postgresArchive = join(root, "postgres.zip");
  await writeFile(nodeArchive, "synthetic node archive");
  await writeFile(postgresArchive, "synthetic postgres archive");
  const pin = (body: string, name: string, license: string) => ({
    version: "fixture-1",
    sourceUrl: `https://example.invalid/${name}`,
    archiveSha256: createHash("sha256").update(body).digest("hex"),
    license,
  });
  const manifest = JSON.stringify({
    schemaVersion: 1,
    targets: {
      "macos-arm64": {
        node: pin("synthetic node archive", "node.tar.gz", "MIT license"),
        postgres: pin("synthetic postgres archive", "postgres.zip", "PostgreSQL License"),
      },
    },
  });
  const target = join(runtime, "node/macos-arm64");
  await mkdir(target, { recursive: true });
  await writeFile(join(target, "sentinel"), "preserved old target");
  const postgresTarget = join(runtime, "postgres/macos-arm64");
  await mkdir(postgresTarget, { recursive: true });
  await writeFile(join(postgresTarget, "sentinel"), "preserved old postgres target");
  const manifestPath = join(runtime, "manifest.json");
  await writeFile(manifestPath, manifest);
  const options = new Map([
    ["target", "macos-arm64"],
    ["node", nodeSource],
    ["node-archive", nodeArchive],
    ["node-version", "fixture-1"],
    ["node-source-url", "https://example.invalid/node.tar.gz"],
    ["postgres", postgresSource],
    ["postgres-archive", postgresArchive],
    ["postgres-version", "fixture-1"],
    ["postgres-source-url", "https://example.invalid/postgres.zip"],
  ]);
  return {
    root,
    runtime,
    target,
    postgresTarget,
    nodeSource,
    nodeArchive,
    postgresSource,
    manifestPath,
    manifest,
    options,
    run(delimiter = false) {
      const result = spawnSync(
        process.execPath,
        [
          join(root, "scripts/stage-desktop-runtime.mjs"),
          ...(delimiter ? ["--"] : []),
          ...Array.from(options).flatMap(([name, value]) => [`--${name}`, value]),
        ],
        { encoding: "utf8", timeout: 10_000 },
      );
      return { status: result.status, output: result.stdout + result.stderr };
    },
  };
}

describe("pinned desktop runtime staging", () => {
  it.each([false, true])(
    "stages without rewriting the reviewed manifest (delimiter: %s)",
    async (delimiter) => {
      const current = await fixture();
      expect(current.run(delimiter)).toMatchObject({ status: 0 });
      expect(await readFile(current.manifestPath, "utf8")).toBe(current.manifest);
      expect(await readFile(join(current.target, "node"), "utf8")).toBe("synthetic node executable");
    },
  );

  it.each(["checksum", "version", "source", "license", "invalid JSON"])(
    "rejects %s before replacing either target",
    async (problem) => {
      const current = await fixture();
      if (problem === "checksum") await writeFile(current.nodeArchive, "unreviewed archive");
      if (problem === "version") current.options.set("node-version", "different-version");
      if (problem === "source") current.options.set("node-source-url", "https://example.invalid/other");
      if (problem === "license") current.options.set("node-license", "unreviewed license");
      if (problem === "invalid JSON") await writeFile(current.manifestPath, "{invalid");
      const before = await readFile(current.manifestPath, "utf8");
      expect(current.run().status).not.toBe(0);
      expect(await readFile(join(current.target, "sentinel"), "utf8")).toBe("preserved old target");
      expect(await readFile(join(current.postgresTarget, "sentinel"), "utf8")).toBe(
        "preserved old postgres target",
      );
      expect(await readFile(current.manifestPath, "utf8")).toBe(before);
    },
  );

  it("rejects an ancestor symlink without modifying its external target", async () => {
    const current = await fixture();
    const outside = join(current.root, "outside");
    await mkdir(outside);
    await cp(join(current.runtime, "node"), outside, { recursive: true });
    await rm(join(current.runtime, "node"), { recursive: true });
    await symlink(outside, join(current.runtime, "node"), "dir");
    expect(current.run().status).not.toBe(0);
    expect(await readFile(join(outside, "macos-arm64/sentinel"), "utf8")).toBe("preserved old target");
  });

  it("rejects a manifest symlink before any generated target is replaced", async () => {
    const current = await fixture();
    const outside = join(current.root, "outside-manifest.json");
    await writeFile(outside, current.manifest);
    await rm(current.manifestPath);
    await symlink(outside, current.manifestPath);
    expect(current.run().status).not.toBe(0);
    expect(await readFile(outside, "utf8")).toBe(current.manifest);
    expect(await readFile(join(current.target, "sentinel"), "utf8")).toBe("preserved old target");
  });

  it("rejects source data inside a deletion target", async () => {
    const current = await fixture();
    const nestedSource = join(current.target, "input");
    await mkdir(nestedSource);
    await cp(join(current.nodeSource, "node"), join(nestedSource, "node"));
    current.options.set("node", nestedSource);
    expect(current.run().status).not.toBe(0);
    expect(await readFile(join(current.target, "sentinel"), "utf8")).toBe("preserved old target");
    expect(await readFile(join(nestedSource, "node"), "utf8")).toBe("synthetic node executable");
  });

  it("rejects an archive inside either deletion target", async () => {
    const current = await fixture();
    const nestedArchive = join(current.postgresTarget, "node.tar.gz");
    await cp(current.nodeArchive, nestedArchive);
    current.options.set("node-archive", nestedArchive);
    expect(current.run().status).not.toBe(0);
    expect(await readFile(join(current.target, "sentinel"), "utf8")).toBe("preserved old target");
    expect(await readFile(nestedArchive, "utf8")).toBe("synthetic node archive");
  });

  it("rejects a source symlink alias into a generated target", async () => {
    const current = await fixture();
    await cp(join(current.nodeSource, "node"), join(current.target, "node"));
    const alias = join(current.root, "source-alias");
    await symlink(current.target, alias, "dir");
    current.options.set("node", alias);
    expect(current.run().status).not.toBe(0);
    expect(await readFile(join(current.target, "sentinel"), "utf8")).toBe("preserved old target");
  });

  it.each(["node", "postgres"])(
    "rejects a copied %s executable alias into a generated target",
    async (runtime) => {
      const current = await fixture();
      const executable =
        runtime === "node" ? join(current.nodeSource, "node") : join(current.postgresSource, "bin/postgres");
      await rm(executable);
      await symlink(join(current.target, "sentinel"), executable);
      expect(current.run().status).not.toBe(0);
      expect(await readFile(join(current.target, "sentinel"), "utf8")).toBe("preserved old target");
      expect(await readFile(join(current.postgresTarget, "sentinel"), "utf8")).toBe(
        "preserved old postgres target",
      );
    },
  );

  it("rejects a generated target nested inside the source directory", async () => {
    const current = await fixture();
    await writeFile(join(current.root, "node"), "synthetic node executable");
    current.options.set("node", current.root);
    expect(current.run().status).not.toBe(0);
    expect(await readFile(join(current.target, "sentinel"), "utf8")).toBe("preserved old target");
  });

  it("rejects mixed-case source aliases on case-insensitive filesystems", async (context) => {
    const current = await fixture();
    await rename(join(current.runtime, "node"), join(current.runtime, "NODE"));
    try {
      await stat(current.target);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      context.skip();
      return;
    }
    await writeFile(join(current.target, "node"), "synthetic node executable");
    current.options.set("node", join(current.runtime, "NODE/macos-arm64"));
    expect(current.run().status).not.toBe(0);
    expect(await readFile(join(current.target, "sentinel"), "utf8")).toBe("preserved old target");
    expect(await readFile(join(current.postgresTarget, "sentinel"), "utf8")).toBe(
      "preserved old postgres target",
    );
  });
});
