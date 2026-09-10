/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

interface Fetcher {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

interface D1Database {
  prepare(query: string, ...values: unknown[]): {
    run(...params: unknown[]): Promise<unknown>;
    all(...params: unknown[]): Promise<unknown>;
    first(...params: unknown[]): Promise<unknown>;
  };
}

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
  CHAT_ALLOWED_ORIGIN?: string;
  CHAT_DEBUG?: string;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

type RateState = {
  count: number;
  resetAt: number;
};

const CHAT_PATH = "/api/chat";
const CHAT_HEALTH_PATH = "/api/chat/health";
const CHAT_FEATURE_DISABLED = false;
const CHAT_MAX_RETRIES = 2;
const CHAT_RETRY_BACKOFF_MS = 400;
const DEFAULT_CHAT_MODEL = "gpt-4.1-mini";
const MAX_MESSAGE_LENGTH = 800;
const MAX_BODY_BYTES = 10_000;
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 12;
const OPENAI_TIMEOUT_MS = 15_000;
const SOURCE_SITE_BASE_URL = "https://lekwetjk.github.io";
const SOURCE_FETCH_TIMEOUT_MS = 8_000;
const SOURCE_CONTEXT_MAX_CHARS = 12_000;
const rateLimiter = new Map<string, RateState>();

function logChat(env: Env, message: string, details?: Record<string, unknown>) {
  if (env.CHAT_DEBUG !== "true") {
    return;
  }

  if (details && Object.keys(details).length > 0) {
    console.log(`[chat] ${message}`, details);
    return;
  }

  console.log(`[chat] ${message}`);
}

function createJsonResponse(body: unknown, status = 200, extraHeaders?: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...extraHeaders,
    },
  });
}

function getRequestOrigin(request: Request) {
  return request.headers.get("origin")?.trim() ?? "";
}

function getAllowedOrigin(request: Request, env: Env) {
  const configured = env.CHAT_ALLOWED_ORIGIN?.trim();
  const origin = getRequestOrigin(request);

  if (configured) {
    return configured;
  }

  if (origin) {
    return origin;
  }

  return "*";
}

function applyCorsHeaders(request: Request, env: Env, headers?: Record<string, string>) {
  return {
    "access-control-allow-origin": getAllowedOrigin(request, env),
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "Content-Type",
    "vary": "Origin",
    ...(headers ?? {}),
  };
}

function getClientIp(request: Request) {
  const cfIp = request.headers.get("cf-connecting-ip")?.trim();
  if (cfIp) {
    return cfIp;
  }

  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded && forwarded.length > 0 ? forwarded : "unknown";
}

function isRateLimited(clientIp: string, now = Date.now()) {
  const state = rateLimiter.get(clientIp);

  if (!state || state.resetAt <= now) {
    rateLimiter.set(clientIp, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return false;
  }

  if (state.count >= RATE_LIMIT_MAX_REQUESTS) {
    return true;
  }

  state.count += 1;
  return false;
}

function validateOrigin(request: Request, env: Env) {
  const configured = env.CHAT_ALLOWED_ORIGIN?.trim();
  const origin = getRequestOrigin(request);

  if (!configured || !origin) {
    return true;
  }

  return configured === origin;
}

async function parseChatRequest(request: Request): Promise<{ message: string } | { error: string }> {
  const contentLengthValue = request.headers.get("content-length");
  if (contentLengthValue) {
    const contentLength = Number.parseInt(contentLengthValue, 10);
    if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
      return { error: "Payload too large" };
    }
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return { error: "Content-Type must be application/json" };
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return { error: "Invalid JSON payload" };
  }

  const message = (payload as { message?: unknown })?.message;
  if (typeof message !== "string") {
    return { error: "Field 'message' must be a string" };
  }

  const normalized = message.trim();
  if (normalized.length === 0) {
    return { error: "Message cannot be empty" };
  }

  if (normalized.length > MAX_MESSAGE_LENGTH) {
    return { error: `Message is too long (max ${MAX_MESSAGE_LENGTH} chars)` };
  }

  return { message: normalized };
}

function extractResponseText(data: unknown) {
  const response = data as {
    output_text?: unknown;
    output?: Array<{ content?: Array<{ type?: string; text?: unknown }> }>;
  };

  if (typeof response.output_text === "string" && response.output_text.trim().length > 0) {
    return response.output_text.trim();
  }

  const parts = response.output ?? [];
  for (const item of parts) {
    const contents = item.content ?? [];
    for (const contentItem of contents) {
      if (contentItem.type === "output_text" && typeof contentItem.text === "string") {
        const trimmed = contentItem.text.trim();
        if (trimmed.length > 0) {
          return trimmed;
        }
      }
    }
  }

  return "";
}

async function readUpstreamErrorExcerpt(response: Response) {
  try {
    const text = await response.text();
    const compact = text.replace(/\s+/g, " ").trim();

    if (!compact) {
      return "";
    }

    return compact.slice(0, 240);
  } catch {
    return "";
  }
}

function stripHtmlToText(html: string) {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchSiteText(url: string) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort("source timeout"), SOURCE_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "user-agent": "KRD-IG-Assistant/1.0",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      return "";
    }

    const html = await response.text();
    return stripHtmlToText(html);
  } catch {
    return "";
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchSourceContext(question: string) {
  const searchUrl = `${SOURCE_SITE_BASE_URL}/?s=${encodeURIComponent(question.slice(0, 180))}`;
  const [homeText, searchText] = await Promise.all([
    fetchSiteText(SOURCE_SITE_BASE_URL),
    fetchSiteText(searchUrl),
  ]);

  const chunks: string[] = [];
  if (homeText) {
    chunks.push(`[ZRODLO: ${SOURCE_SITE_BASE_URL}] ${homeText}`);
  }
  if (searchText) {
    chunks.push(`[ZRODLO: ${searchUrl}] ${searchText}`);
  }

  const merged = chunks.join("\n\n").trim();
  if (!merged) {
    return "";
  }

  return merged.slice(0, SOURCE_CONTEXT_MAX_CHARS);
}

async function fetchOpenAIWithRetry(requestBody: string, apiKey: string, model: string, env: Env) {
  let lastResponse: Response | null = null;

  for (let attempt = 1; attempt <= CHAT_MAX_RETRIES + 1; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort("upstream timeout"), OPENAI_TIMEOUT_MS);

    try {
      logChat(env, "openai request start", { attempt, model });
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${apiKey}`,
        },
        body: requestBody,
        signal: controller.signal,
      });

      lastResponse = response;

      if (response.ok || (response.status !== 429 && response.status < 500)) {
        return response;
      }

      const excerpt = await readUpstreamErrorExcerpt(response.clone());
      logChat(env, "openai request retryable failure", {
        attempt,
        status: response.status,
        statusText: response.statusText,
        excerpt,
      });

      if (attempt <= CHAT_MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, attempt * CHAT_RETRY_BACKOFF_MS));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logChat(env, "openai request error", { attempt, message });
      lastResponse = null;

      if (attempt <= CHAT_MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, attempt * CHAT_RETRY_BACKOFF_MS));
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  return lastResponse ?? new Response(JSON.stringify({ error: "Chat service is temporarily unavailable." }), { status: 502 });
}

async function handleChatRequest(request: Request, env: Env): Promise<Response> {
  const corsHeaders = applyCorsHeaders(request, env);

  if (!validateOrigin(request, env)) {
    logChat(env, "origin rejected", { origin: getRequestOrigin(request) });
    return createJsonResponse({ error: "Origin not allowed" }, 403, corsHeaders);
  }

  const parsed = await parseChatRequest(request);
  if ("error" in parsed) {
    logChat(env, "invalid chat payload", { error: parsed.error });
    const status = parsed.error === "Payload too large" ? 413 : 400;
    return createJsonResponse({ error: parsed.error }, status, corsHeaders);
  }

  const clientIp = getClientIp(request);
  if (isRateLimited(clientIp)) {
    logChat(env, "rate limit hit", { clientIp });
    return createJsonResponse(
      { error: "Too many requests. Try again in a few minutes." },
      429,
      {
        ...corsHeaders,
        "retry-after": String(Math.floor(RATE_LIMIT_WINDOW_MS / 1000)),
      },
    );
  }

  const apiKey = env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    logChat(env, "missing api key");
    return createJsonResponse(
      { error: "Chat is not configured. Missing OPENAI_API_KEY." },
      503,
      corsHeaders,
    );
  }

  const sourceContext = await fetchSourceContext(parsed.message);
  logChat(env, "source context ready", { length: sourceContext.length, questionLength: parsed.message.length });

  if (!sourceContext) {
    logChat(env, "source context empty");
    return createJsonResponse(
      {
        reply:
          "Nie moge zweryfikowac odpowiedzi na podstawie strony lekwetjk.github.io w tej chwili. Sprobuj ponownie za chwile albo sprawdz bezposrednio strone glowna i wyszukiwarke serwisu.",
      },
      200,
      corsHeaders,
    );
  }

  const model = env.OPENAI_MODEL?.trim() || DEFAULT_CHAT_MODEL;
  const requestBody = JSON.stringify({
    model,
    max_output_tokens: 300,
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text: "Jestes asystentem KRD-IG. Odpowiadaj wylacznie na podstawie tresci przekazanej w bloku KONTEKST_ZE_STRONY i traktuj go jako jedyne zrodlo prawdy. Nie uzywaj wiedzy ogolnej ani domyslow. Jesli odpowiedz nie wynika wprost z kontekstu, napisz: 'Nie znalazlem potwierdzenia tej informacji na lekwetjk.github.io.' i dodaj, jaka podstrone warto sprawdzic. Odpowiadaj zwiezle po polsku.",
          },
        ],
      },
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text: `KONTEKST_ZE_STRONY:\n${sourceContext}`,
          },
        ],
      },
      {
        role: "user",
        content: [{ type: "input_text", text: parsed.message }],
      },
    ],
  });

  const upstreamResponse = await fetchOpenAIWithRetry(requestBody, apiKey, model, env);

  if (!upstreamResponse.ok) {
    const upstreamErrorExcerpt = await readUpstreamErrorExcerpt(upstreamResponse.clone());
    logChat(env, "openai final failure", {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      excerpt: upstreamErrorExcerpt,
    });
    return createJsonResponse(
      {
        error: "Model request failed. Try again shortly.",
        upstream_status: upstreamResponse.status,
        upstream_status_text: upstreamResponse.statusText,
        upstream_error_excerpt: upstreamErrorExcerpt,
      },
      502,
      corsHeaders,
    );
  }

  let responseBody: unknown;
  try {
    responseBody = await upstreamResponse.json();
  } catch (error) {
    logChat(env, "openai invalid json", { message: error instanceof Error ? error.message : String(error) });
    return createJsonResponse({ error: "Unexpected model response." }, 502, corsHeaders);
  }

  const reply = extractResponseText(responseBody);
  if (!reply) {
    logChat(env, "openai empty reply");
    return createJsonResponse({ error: "Model returned an empty answer." }, 502, corsHeaders);
  }

  logChat(env, "openai success", { model, replyLength: reply.length });
  return createJsonResponse({ reply, model }, 200, corsHeaders);
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === CHAT_HEALTH_PATH && request.method === "GET") {
      return createJsonResponse(
        {
          ok: !CHAT_FEATURE_DISABLED,
          disabled: CHAT_FEATURE_DISABLED,
          configured: Boolean(env.OPENAI_API_KEY?.trim()),
          model: env.OPENAI_MODEL?.trim() || DEFAULT_CHAT_MODEL,
          retries: CHAT_MAX_RETRIES,
          message: CHAT_FEATURE_DISABLED ? "Chat is temporarily disabled." : "Chat is enabled.",
        },
        200,
        applyCorsHeaders(request, env),
      );
    }

    if (url.pathname === CHAT_PATH && request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: applyCorsHeaders(request, env),
      });
    }

    if (url.pathname === CHAT_PATH && request.method === "POST") {
      if (CHAT_FEATURE_DISABLED) {
        logChat(env, "chat disabled by feature flag");
        return createJsonResponse(
          { error: "Chat is temporarily disabled.", disabled: true },
          503,
          applyCorsHeaders(request, env),
        );
      }

      return handleChatRequest(request, env);
    }

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    return handler.fetch(request, env, ctx);
  },
};

export default worker;
