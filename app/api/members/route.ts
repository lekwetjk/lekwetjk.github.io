import { getApiMembers, getMembersApiKey, isMembersApiKeyValid } from "../../lib/members-api.ts";

export const dynamic = "force-dynamic";

function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Vary": "X-API-Key",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function GET(request: Request) {
  const key = getMembersApiKey();
  if (!key?.trim()) {
    console.error("[members-api] MEMBERS_API_KEY is not configured.");
    return json({ error: "Service unavailable" }, 503);
  }

  if (!isMembersApiKeyValid(request.headers.get("X-API-Key"), key)) {
    return json({ error: "Unauthorized" }, 401);
  }

  try {
    return json({ members: await getApiMembers() });
  } catch (error) {
    console.error("[members-api] Failed to load members.", error);
    return json({ error: "Unable to load members" }, 500);
  }
}
