// POST /api/enhance —— 文字转 Prompt（智谱 GLM-4-Flash，免费档）
import { callZhipu, checkRateLimit, buildInstruction, composePrompt, fail, json } from "../_lib/zhipu.js";

export async function onRequestPost(context) {
  const { request, env } = context;

  const rl = await checkRateLimit(env, request);
  if (!rl.ok) {
    return fail(429, "rate_limited", `Daily limit reached (${rl.limit} requests/day). Please come back tomorrow.`);
  }

  let body;
  try {
    body = JSON.parse(await request.text());
  } catch {
    return fail(400, "bad_request", "Invalid request body.");
  }

  const { text, style = "none", target = "midjourney", outputLang = "en" } = body || {};
  const input = String(text || "").trim();
  if (!input) return fail(400, "bad_request", "Missing text.");
  if (input.length > 2000) return fail(400, "too_long", "Text too long (max 2000 chars).");

  const model = env.ZHIPU_TEXT_MODEL || "glm-4-flash";
  const instruction = buildInstruction(target, style, outputLang);

  try {
    const mainPrompt = await callZhipu(env, {
      model,
      messages: [
        {
          role: "system",
          content:
            "You are an expert AI art prompt engineer. The user gives a rough idea (possibly in Chinese or any language). " +
            "Turn it into ONE polished prompt for the specified image generator. Never ask questions; always output the final prompt.",
        },
        {
          role: "user",
          content: `My idea: ${input}\nTarget generator: ${target}\n${instruction}`,
        },
      ],
    });
    const prompt = await composePrompt(env, { target, mainPrompt, outputLang });
    return json(200, { ok: true, prompt });
  } catch (e) {
    const msg = String(e.message || e);
    if (msg === "ZHIPU_API_KEY_NOT_SET") {
      return fail(500, "missing_key", "ZHIPU_API_KEY is not configured. Set it in Cloudflare Pages settings.");
    }
    if (msg === "EMPTY_RESPONSE") {
      return fail(502, "empty_response", "The model returned an empty result, please retry.");
    }
    return fail(502, "upstream_error", `Model API error: ${msg.slice(0, 300)}`);
  }
}

export function onRequestGet() {
  return fail(405, "method_not_allowed", "Use POST.");
}
