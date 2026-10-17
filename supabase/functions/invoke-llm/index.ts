// invoke-llm — Base44-compatible `InvokeLLM` proxy for the self-host build.
//
// The frontend shim (@staticbot/base44-supabase-shim) forwards every
// `supabase.integrations.Core.InvokeLLM(payload)` call here. The payload is
// Base44-shaped: `{ prompt, response_json_schema?, add_context_from_internet?,
// file_urls?, temperature?, max_tokens? }`. The response is the parsed JSON
// object when a schema was supplied, otherwise plain text.
//
// Backend: any OpenAI-compatible /chat/completions endpoint (Ollama, vLLM,
// LiteLLM, OpenAI, OpenRouter, an internal gateway, ...).
//
// Required secrets (supabase secrets set ... / your compose env):
//   LLM_API_URL   — full URL or base URL of the gateway.
//                   e.g. http://host:11434/v1/chat/completions
//                        https://api.openai.com/v1
//   LLM_MODEL     — model name, e.g. llama3.1, gpt-4o-mini
//
// Optional secrets:
//   LLM_API_KEY       — Bearer token; omit for a local Ollama with no auth
//   LLM_VISION_MODEL  — model used when payload.file_urls is non-empty
//                       (vision/multimodal capable); falls back to LLM_MODEL
//   LLM_SYSTEM_PROMPT — extra system instructions prepended to every call
//   LLM_ALLOW_ANON    — "true" to let signed-out visitors (public pages such
//                       as Landing) call this function with only the anon key

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface LLMPayload {
  prompt?: string;
  response_json_schema?: Record<string, unknown>;
  add_context_from_internet?: boolean;
  file_urls?: string[];
  temperature?: number;
  max_tokens?: number;
}

/** Resolve the chat-completions URL from whatever shape the operator set. */
function resolveChatCompletionsUrl(raw: string): string {
  const url = raw.replace(/\/+$/, "");
  if (url.endsWith("/chat/completions")) return url;
  if (url.endsWith("/v1")) return `${url}/chat/completions`;
  // Bare host/base: assume the common OpenAI-compatible path.
  return `${url}/v1/chat/completions`;
}

/** Pull the first JSON object/array out of possibly-fenced model output. */
function extractJson(text: string): unknown {
  let t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  try {
    return JSON.parse(t);
  } catch {
    const start = Math.min(
      ...[t.indexOf("{"), t.indexOf("[")].filter((i) => i >= 0),
    );
    const end = Math.max(t.lastIndexOf("}"), t.lastIndexOf("]"));
    if (start >= 0 && end > start) {
      return JSON.parse(t.slice(start, end + 1));
    }
    throw new Error("Model did not return parseable JSON");
  }
}

function buildMessages(
  payload: LLMPayload,
  schema: Record<string, unknown> | undefined,
) {
  const systemParts: string[] = [];
  const extraSystem = Deno.env.get("LLM_SYSTEM_PROMPT");
  if (extraSystem) systemParts.push(extraSystem);
  systemParts.push("You are a helpful business assistant.");
  if (payload.add_context_from_internet) {
    systemParts.push(
      "Answer with the most current data available to you; if your knowledge is stale, say so explicitly rather than inventing figures.",
    );
  }
  if (schema) {
    systemParts.push(
      "Respond with ONLY valid JSON matching this JSON Schema. No prose, no markdown fences:\n" +
        JSON.stringify(schema),
    );
  }

  // With attachments the user content becomes multimodal parts (image URLs).
  // Non-image documents require a vision-capable gateway model.
  const files = (payload.file_urls ?? []).filter(Boolean);
  const userContent: unknown =
    files.length > 0
      ? [
          { type: "text", text: payload.prompt ?? "" },
          ...files.map((url) => ({ type: "image_url", image_url: { url } })),
        ]
      : (payload.prompt ?? "");

  return [
    { role: "system", content: systemParts.join("\n\n") },
    { role: "user", content: userContent },
  ];
}

async function callLlm(
  body: Record<string, unknown>,
  apiUrl: string,
  apiKey: string | undefined,
) {
  return await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // --- Auth: valid user session, or anon key when explicitly allowed -----
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const allowAnon = Deno.env.get("LLM_ALLOW_ANON") === "true";
    if (!token || token === anonKey) {
      if (!allowAnon) {
        return json(
          {
            error:
              "Sign in to use AI features, or set LLM_ALLOW_ANON=true on this function.",
          },
          401,
        );
      }
    } else {
      const anon = createClient(supabaseUrl, anonKey);
      const { data: callerData, error: callerErr } =
        await anon.auth.getUser(token);
      if (callerErr || !callerData.user) {
        if (!allowAnon) return json({ error: "Invalid or expired session" }, 401);
      }
    }

    // --- Backend config -----------------------------------------------------
    const apiUrlRaw = Deno.env.get("LLM_API_URL");
    const model = Deno.env.get("LLM_MODEL");
    if (!apiUrlRaw || !model) {
      return json(
        {
          error:
            "LLM not configured. Set LLM_API_URL and LLM_MODEL secrets on the invoke-llm edge function.",
        },
        500,
      );
    }
    const apiUrl = resolveChatCompletionsUrl(apiUrlRaw);
    const apiKey = Deno.env.get("LLM_API_KEY") || undefined;

    // --- Payload ------------------------------------------------------------
    const payload: LLMPayload = await req.json();
    if (!payload.prompt || typeof payload.prompt !== "string") {
      return json({ error: "A 'prompt' string is required" }, 400);
    }
    const schema = payload.response_json_schema;
    const visionModel = Deno.env.get("LLM_VISION_MODEL");
    const activeModel =
      (payload.file_urls ?? []).length > 0 && visionModel ? visionModel : model;

    const baseBody: Record<string, unknown> = {
      model: activeModel,
      messages: buildMessages(payload, schema),
      ...(payload.temperature !== undefined
        ? { temperature: payload.temperature }
        : {}),
      ...(payload.max_tokens !== undefined
        ? { max_tokens: payload.max_tokens }
        : {}),
    };

    // --- Call the gateway ---------------------------------------------------
    let res = await callLlm(
      schema
        ? {
            ...baseBody,
            response_format: {
              type: "json_schema",
              json_schema: { name: "response", schema },
            },
          }
        : baseBody,
      apiUrl,
      apiKey,
    );

    // Some gateways (older Ollama, LM Studio, ...) reject response_format;
    // retry once without it — the schema is already in the system prompt.
    if (res.status === 400 && schema) {
      res = await callLlm(baseBody, apiUrl, apiKey);
    }
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error(`invoke-llm: gateway ${res.status}:`, detail);
      return json(
        { error: `LLM gateway returned ${res.status}: ${detail.slice(0, 400)}` },
        502,
      );
    }

    const completion = await res.json();
    const text: string = completion?.choices?.[0]?.message?.content ?? "";

    // Base44 contract: parsed object with a schema, plain text without.
    if (schema) {
      try {
        return json(extractJson(text));
      } catch (err) {
        return json(
          { error: `Model returned non-JSON output: ${(err as Error).message}` },
          502,
        );
      }
    }
    return json(text);
  } catch (err: unknown) {
    console.error("invoke-llm failed:", err);
    return json(
      { error: (err as Error)?.message || "Failed to invoke LLM" },
      500,
    );
  }
});
