import path from "node:path";
import { describe, expect, it } from "vitest";
import { isStrictDescendant } from "../../scripts/desktop-runtime-staging-paths";

describe("native runtime output containment", () => {
  it.each([
    ["/runtime/node/arm64", "/runtime", true],
    ["/runtime", "/runtime", false],
    ["/runtime/../outside", "/runtime", false],
    ["/runtime-other/node", "/runtime", false],
    ["/node", "/", true],
    ["/", "/", false],
  ])("checks POSIX path %s", (directory, parent, expected) => {
    expect(isStrictDescendant(String(directory), String(parent), path.posix)).toBe(expected);
  });

  it.each([
    ["C:\\runtime\\node\\x64", "C:\\runtime", true],
    ["C:\\runtime", "C:\\runtime", false],
    ["C:\\runtime\\..\\outside", "C:\\runtime", false],
    ["C:\\runtime-other\\node", "C:\\runtime", false],
    ["D:\\runtime\\node", "C:\\runtime", false],
    ["C:\\node", "C:\\", true],
    ["C:\\", "C:\\", false],
    ["\\\\server\\share\\runtime\\node", "\\\\server\\share\\runtime", true],
    ["\\\\other\\share\\runtime", "\\\\server\\share\\runtime", false],
  ])("checks Windows path %s", (directory, parent, expected) => {
    expect(isStrictDescendant(String(directory), String(parent), path.win32)).toBe(expected);
  });
});
