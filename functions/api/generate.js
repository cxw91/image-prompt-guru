// POST /api/generate —— 图片转 Prompt（智谱 GLM-4V-Flash，免费档）
import { callZhipu, checkRateLimit, buildInstruction, composePrompt, fail, json } from "../_lib/zhipu.js";

const DATA_URL_RE = /^data:image\/(jpeg|png|webp);base64,/;
const HTTP_URL_RE = /^https?:\/\/.+/i;
const MAX_BODY_BYTES = 6 * 1024 * 1024; // 前端已压缩，防御性上限

export async function onRequestPost(context) {
  const { request, env } = context;

  const rl = await checkRateLimit(env, request);
  if (!rl.ok) {
    return fail(429, "rate_limited", `Daily limit reached (${rl.limit} requests/day). Please come back tomorrow.`);
  }

  let body;
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) return fail(413, "too_large", "Image too large.");
    body = JSON.parse(raw);
  } catch {
    return fail(400, "bad_request", "Invalid request body.");
  }

  const { image, imageUrl, style = "none", target = "midjourney", outputLang = "en" } = body || {};

  let visionUrl = null;
  if (image && DATA_URL_RE.test(image)) {
    visionUrl = image; // 智谱 image_url 支持公网 URL 与 base64 data URL
  } else if (imageUrl && HTTP_URL_RE.test(imageUrl)) {
    visionUrl = imageUrl.trim();
  } else {
    return fail(400, "bad_request", "Missing or invalid image / imageUrl.");
  }

  const model = env.ZHIPU_VISION_MODEL || "glm-4v-flash";
  const instruction = buildInstruction(target, style, outputLang);

  try {
    const mainPrompt = await callZhipu(env, {
      model,
      messages: [
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: visionUrl } },
            {
              type: "text",
              text:
                `Analyze this image and write one high-quality prompt that recreates it with a ${target} AI image generator. ` +
                instruction,
            },
          ],
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
