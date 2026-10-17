import { z } from "zod";

import { enterDemo, resetDemo, getIdentityRequestSecurity } from "@/modules/identity";
import { observeApiRequest } from "@/shared/http/request-observability";
import { assertTrustedJsonMutation, readBoundedJson } from "@/shared/http/request-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const demoEntryRequestSchema = z.union([
  z.strictObject({}),
  z.strictObject({ intent: z.literal("reset-demo"), confirm: z.literal(true) }),
]);

export function POST(request: Request) {
  return observeApiRequest(request, "identity.enter-demo", async () => {
    assertTrustedJsonMutation(request, getIdentityRequestSecurity().trustedOrigin);
    const body = await readBoundedJson(request, 128, { allowEmpty: true });
    const input = demoEntryRequestSchema.parse(body === undefined ? {} : body);
    const result = "intent" in input ? await resetDemo(request.headers) : await enterDemo(request.headers);
    const response = Response.json(
      { mode: result.mode, redirectTo: "/inbox" },
      { headers: { "cache-control": "no-store" } },
    );
    for (const cookie of result.setCookieHeaders) response.headers.append("set-cookie", cookie);
    return response;
  });
}
