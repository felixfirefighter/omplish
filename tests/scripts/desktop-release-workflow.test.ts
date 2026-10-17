import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const ci = readFileSync(".github/workflows/ci.yml", "utf8");
const desktop = readFileSync(".github/workflows/publish-desktop.yml", "utf8");

describe("desktop publication prerequisites", () => {
  it("calls canonical verification as a same-commit local reusable workflow", () => {
    expect(ci).toContain("workflow_call:");
    expect(desktop).toContain("uses: ./.github/workflows/ci.yml");
    expect(ci).toContain("ref: ${{ github.sha }}");
  });

  it("keeps publication blocked until U10 native acceptance exists", () => {
    const publish = desktop.slice(desktop.indexOf("  publish:"));
    expect(publish).toMatch(/needs:.*verify.*native-acceptance/s);
    expect(desktop).toMatch(/native-acceptance:[\s\S]*?U10[\s\S]*?exit 1/);
    expect(publish).not.toContain("always()");
  });

  it("builds the image consumed by both Compose application services", () => {
    expect(ci).toContain("--tag omplish:local");
    expect(ci).toContain("--no-build");
    expect(ci).toContain("EXPECTED_PRODUCTION_IMAGE_ID: ${{ steps.production-image.outputs.image-id }}");
    expect(readFileSync("compose.yaml", "utf8").match(/image: omplish:local/g)).toHaveLength(2);
  });
});
