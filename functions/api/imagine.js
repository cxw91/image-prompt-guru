// POST /api/imagine —— 提示词转图片（智谱 CogView-3-Flash，免费档）
//
// 与 /api/generate、/api/enhance 的差异：按产品决策，本接口「不参与 IP 限流」。
// 理由是图片生成单张耗时长、正常用户不会高频触发，且智谱侧对免费模型自带
// 速率限制兜底。若后续发现被刷，开启限流只需两步：
//   1. 在上面的 import 列表里补上 checkRateLimit；
//   2. 在 onRequestPost 开头插入：
//      const rl = await checkRateLimit(env, request);
//      if (!rl.ok) return fail(429, "rate_limited", `Daily limit reached (${rl.limit} requests/day). Please come back tomorrow.`);
//
import {
  callCogview,
  COGVIEW_SIZES,
  describeUpstreamError,
  detectAspectSize,
  fail,
  json,
  signImageUrl,
  toCogviewPrompt,
} from "../_lib/zhipu.js";

const MAX_PROMPT_CHARS = 2000;

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try {
    body = JSON.parse(await request.text());
  } catch {
    return fail(400, "bad_request", "Invalid request body.");
  }

  const { prompt, size, count = 1 } = body || {};
  const raw = String(prompt || "").trim();
  if (!raw) return fail(400, "bad_request", "Missing prompt.");
  if (raw.length > MAX_PROMPT_CHARS) {
    return fail(400, "too_long", `Prompt too long (max ${MAX_PROMPT_CHARS} chars).`);
  }

  // 净化：CogView 不识别 --ar 参数、也不支持负面提示词，原样发送会污染出图
  const cleaned = toCogviewPrompt(raw);
  if (!cleaned) return fail(400, "bad_request", "Prompt is empty after cleanup.");

  // 尺寸：客户端显式指定优先；未指定时用净化「前」的 --ar 参数推断，兜底正方形。
  // 必须先于净化读取——stripMjFlags 会把 --ar 一并删掉。
  const requested = String(size || "");
  const finalSize = COGVIEW_SIZES.includes(requested)
    ? requested
    : detectAspectSize(raw) || COGVIEW_SIZES[0];

  try {
    const { images, model } = await callCogview(env, {
      prompt: cleaned,
      size: finalSize,
      count,
    });
    // images：上游地址，用于 <img> 展示（不涉及 CORS）
    // downloads：同源签名地址，用于「下载」按钮（上游 CDN 无 CORS 头，必须中转）
    const downloads = await Promise.all(images.map((url) => signImageUrl(env, url)));
    return json(200, { ok: true, images, downloads, size: finalSize, model });
  } catch (e) {
    const msg = String(e.message || e);
    if (msg === "ZHIPU_API_KEY_NOT_SET") {
      return fail(500, "missing_key", "ZHIPU_API_KEY is not configured. Set it in Cloudflare Pages settings.");
    }
    if (msg === "EMPTY_RESPONSE") {
      return fail(502, "empty_response", "The model returned no image, please retry.");
    }
    if (msg === "UPSTREAM_TIMEOUT") {
      return fail(504, "upstream_timeout", "Image generation timed out, please retry with fewer images.");
    }
    // 内容安全审核拒绝要给出可行动的提示，而不是把上游原始 JSON 丢给用户
    const blocked = describeUpstreamError(e);
    if (blocked) return fail(blocked.status, blocked.code, blocked.message);
    return fail(502, "upstream_error", `Model API error: ${msg.slice(0, 300)}`);
  }
}

export function onRequestGet() {
  return fail(405, "method_not_allowed", "Use POST.");
}
