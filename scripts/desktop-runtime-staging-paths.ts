import { lstat, realpath } from "node:fs/promises";
import path from "node:path";

type PathPolicy = Pick<typeof path, "resolve" | "relative" | "isAbsolute" | "sep">;

export function isStrictDescendant(directory: string, parent: string, policy: PathPolicy = path) {
  const relative = policy.relative(policy.resolve(parent), policy.resolve(directory));
  return (
    relative !== "" &&
    relative !== ".." &&
    !relative.startsWith(`..${policy.sep}`) &&
    !policy.isAbsolute(relative)
  );
}

export async function assertStagingDirectoriesSafe(input: {
  repositoryRoot: string;
  runtimeRoot: string;
  destinations: string[];
  sources: string[];
  archives: string[];
  manifestPath: string;
}) {
  const { repositoryRoot, runtimeRoot, destinations, sources, archives, manifestPath } = input;
  if (!isStrictDescendant(runtimeRoot, repositoryRoot))
    throw new Error("Runtime root must be inside the repository.");
  for (const destination of destinations) {
    if (!isStrictDescendant(destination, runtimeRoot))
      throw new Error("Refusing a destination outside the runtime tree.");
    await rejectSymlinkAncestors(destination, repositoryRoot);
  }
  await rejectSymlinkAncestors(manifestPath, repositoryRoot);
  const inputs = await Promise.all([...sources, ...archives, manifestPath].map((file) => realpath(file)));
  const resolvedDestinations = await Promise.all(destinations.map(canonicalDestination));
  for (const destination of resolvedDestinations) {
    for (const source of inputs) {
      if (
        path.relative(destination, source) === "" ||
        isStrictDescendant(source, destination) ||
        isStrictDescendant(destination, source)
      ) {
        throw new Error("Runtime staging sources and destinations must not overlap.");
      }
    }
  }
}

async function canonicalDestination(directory: string): Promise<string> {
  try {
    return await realpath(directory);
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
    return path.join(await canonicalDestination(path.dirname(directory)), path.basename(directory));
  }
}

async function rejectSymlinkAncestors(file: string, root: string) {
  if (!isStrictDescendant(file, root)) throw new Error("Staging output must be inside the repository.");
  let current = root;
  for (const part of path.relative(root, file).split(path.sep)) {
    current = path.join(current, part);
    try {
      if ((await lstat(current)).isSymbolicLink())
        throw new Error("Refusing a staging symlink or junction ancestor.");
    } catch (error) {
      if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
    }
  }
}
