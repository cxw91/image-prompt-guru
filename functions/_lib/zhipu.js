// 智谱 API 调用 + 限流 + 输出清洗 的共享工具（Cloudflare Pages Functions）

const ZHIPU_API_URL = "https://open.bigmodel.cn/api/paas/v4/chat/completions";

export function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

export function fail(status, code, message) {
  return json(status, { ok: false, error: code, message });
}

/**
 * 调用智谱 chat completions，成功返回文本内容（抛出 Error 时为失败）
 *
 * frequency_penalty / presence_penalty 用于抑制小模型的重复生成循环：
 * 模型一旦陷入"换个名词再排一遍"的状态塌缩，这两个参数是唯一在采样层
 * 能起作用的手段。默认值偏保守，避免把 --ar / --v 这类必须保留的
 * 技术参数也一并惩罚掉。
 */
export async function callZhipu(
  env,
  {
    model,
    messages,
    maxTokens = 900,
    temperature = 0.7,
    frequencyPenalty = 0.5,
    presencePenalty = 0.3,
  }
) {
  const key = env.ZHIPU_API_KEY;
  if (!key) {
    throw new Error("ZHIPU_API_KEY_NOT_SET");
  }
  const res = await fetch(ZHIPU_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      frequency_penalty: frequencyPenalty,
      presence_penalty: presencePenalty,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`UPSTREAM_${res.status}:${text.slice(0, 300)}`);
  }
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content || !content.trim()) {
    throw new Error("EMPTY_RESPONSE");
  }
  return cleanPrompt(content);
}

/** 去掉模型输出里的引号包裹、箭头/前缀标签等多余内容 */
export function cleanPrompt(text) {
  let t = text.trim();
  t = t.replace(/^```[a-z]*\s*/i, "").replace(/```\s*$/, "");
  t = t.replace(/^(prompt|提示词)\s*[:：]\s*/i, "");
  t = t.replace(/^[→=>»>]+\s*/, "");
  t = t.replace(/^[\"'“”「『]+/, "").replace(/[\"'“”」』]+$/, "");
  t = dedupePrompt(t.trim());
  return t;
}

/**
 * 兜底去重复：确定性后处理，不依赖模型行为。
 *
 * 背景：小模型在"列举"类任务上会进入重复生成循环（把同一批词条换个名词
 * 反复排），最坏情况撞到 max_tokens 被硬截断。这里做三件事：
 *   1. 按行处理，保留正文行与 `Negative prompt:` 标记行；
 *   2. 每个逗号分隔片段做归一化后保序去重（大小写、空白差异视为重复）；
 *   3. 每行的条目数设上限，超出的直接丢弃，防止超长垃圾漏给用户。
 *
 * 注意：只对"疑似列表"的行生效——自然语言段落（DALL·E / Flux 格式）
 * 不含逗号分片，会被原样通过。
 */
const MAX_ITEMS_PER_LINE = 40;

/**
 * 非画面瑕疵的过滤器。
 *
 * 小模型在生成 SD 负面词时，偶尔会滑向"事实/逻辑/学术判断错误"这类
 * 根本画不出来的概念（例如"错误的物理学判断"）。这类条目对出图毫无
 * 意义，只会白占 token 并诱发同类扩写。这里做语义族拦截。
 */
const NON_VISUAL_RE =
  /(错误|不正确|有误|不准确|失实|不实|错误性)?\s*(的)?\s*(物理|化学|生物|数学|历史|地理|天文|医学|法律|经济|哲学|伦理|工程|计算机|逻辑|语法|常识|事实|知识|学术|科学|文化|政治|社会|宗教|统计|编程|语言|拼写|时态|计量|单位)/;

// 英文同义族：incorrect/wrong/bad + 学科名 + judgement/reasoning/problem 等
const NON_VISUAL_EN_RE =
  /\b(incorrect|wrong|bad|invalid|false|inaccurate|flawed)\s+(physics|chemistry|chemical|biology|biological|math|mathematic\w*|history|historical|geograph\w*|astronom\w*|medical|medicine|legal|economic\w*|philosoph\w*|ethic\w*|engineering|computer|computing|logic|logical|grammar|spelling|factual|scientific|academic|knowledge)\b/i;
const NON_VISUAL_EN_TAIL_RE = /(judg\w*|judgement|judgment|reasoning|logic|knowledge|fact|analysis|conclusion|understanding|comprehension|argument|statement)/i;

// 画面类词汇：出现即视为正常视觉描述，放行
const VISUAL_RE =
  /(颜色|色彩|光|阴影|构图|轮廓|线条|纹理|肤|脸|手|眼|嘴|比例|聚焦|模糊|清晰|像素|噪点|畸变|透视|背景|主体|colour|color|light|shadow|composition|outline|line|texture|skin|face|hand|eye|mouth|proportion|focus|blur|sharp|pixel|noise|distort|perspective|background|anatomy|finger|limb|watermark|artifact)/i;

function isNonVisualDefect(item) {
  if (VISUAL_RE.test(item)) return false;
  // 中文：学科词 + 抽象结论词
  if (NON_VISUAL_RE.test(item) && /(判断|问题|错误|推理|逻辑|知识|认知|表达|理解|结论|描述|分析|论证|计算|运用|使用不当|不符)/.test(item)) {
    return true;
  }
  // 英文：学科词 + 抽象结论词
  if (NON_VISUAL_EN_RE.test(item) && NON_VISUAL_EN_TAIL_RE.test(item)) return true;
  return false;
}

export function dedupePrompt(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const out = [];
  for (const line of lines) {
    // `Negative prompt:` 之类的标记行：保留标记，只处理其后的内容
    const m = line.match(/^([A-Za-z][A-Za-z\s]{0,20}prompt\s*[:：])\s*(.*)$/i);
    const label = m ? m[1] : "";
    const body = m ? m[2] : line;
    const isNegative = /negative/i.test(label);

    // 不含逗号的整行（自然语言段落）原样保留
    if (!body.includes(",") && !body.includes("，")) {
      out.push(label ? `${label} ${body}`.trim() : body);
      continue;
    }

    const sep = body.includes("，") && !body.includes(",") ? "，" : ",";
    const rawParts = body.split(/[,，]/);
    const seen = new Set();
    const kept = [];
    for (const p of rawParts) {
      const item = p.trim();
      if (!item) continue;
      // 负面词行：剔除"画不出来"的概念性条目
      if (isNegative && isNonVisualDefect(item)) continue;
      // 归一化：去空白、转小写，用于判重
      const norm = item.replace(/\s+/g, "").toLowerCase();
      if (seen.has(norm)) continue;
      seen.add(norm);
      kept.push(item);
      if (kept.length >= MAX_ITEMS_PER_LINE) break;
    }
    if (!kept.length) continue;
    const joined = kept.join(sep + " ");
    out.push(label ? `${label} ${joined}`.trim() : joined);
  }
  return out.join("\n");
}

async function sha256Hex(str) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * SD 正面词行的净化：剥离模型偶发混入的负面词与 MJ 参数。
 *
 * 实测 glm-4-flash 会把 "无模糊/无水印" 这类否定词、甚至 --ar/--n 参数
 * 混进 SD 正面标签里。这里做确定性剔除，保证主输出干净。
 */
const SD_NEG_WORD_RE = /^(无|没有|不含|禁止|no|not|without|avoid|free of|devoid of|remove)/i;

export function sanitizeSdPositive(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  // 只取第一段非 `Negative prompt:` 的行，且丢掉任何 -- 参数
  const target = lines.find((l) => !/^negative\s*prompt/i.test(l)) || "";
  const body = target.replace(/--\S+(\s+\S+)?/g, " "); // 去掉 --ar 16:9 这类参数
  const parts = body.split(/[,，]/).map((s) => s.trim()).filter(Boolean);
  const kept = parts.filter((p) => !SD_NEG_WORD_RE.test(p));
  return kept.join(", ");
}

/**
 * 解析模型返回的负面词行，输出规范化的 `Negative prompt: a, b, c`。
 * 兼容模型把 "Negative prompt:" 写成 "负面提示词:" / "Negative:" 等情况。
 */
export function normalizeSdNegative(text) {
  let t = text.trim();
  t = t.replace(/^```[a-z]*\s*/i, "").replace(/```\s*$/, "");
  // 定位负面词标记行，取标记之后的全部内容
  const m = t.match(/^.*?(?:negative\s*prompt|负面提示词|负面词|negative)\s*[:：]\s*([\s\S]*)$/i);
  const body = m ? m[1] : t;
  const single = body.replace(/\s+/g, " ");
  const items = single
    .split(/[,，]/)
    .map((s) => s.trim().replace(/^["'“”]+|["'“”]+$/g, ""))
    .filter(Boolean)
    .filter((s) => !SD_NEG_WORD_RE.test(s));
  const seen = new Set();
  const kept = [];
  for (const it of items) {
    const norm = it.toLowerCase().replace(/[^\w\u4e00-\u9fa5]/g, "");
    if (!norm || seen.has(norm)) continue;
    seen.add(norm);
    kept.push(it);
    if (kept.length >= 8) break;
  }
  return kept.length ? `Negative prompt: ${kept.join(", ")}` : "";
}

/**
 * 按 IP 限流（需绑定名为 RATE_LIMIT 的 KV，未绑定时自动放行）
 * 返回 { ok: true } 或 { ok: false, limit, message }
 */
export async function checkRateLimit(env, request) {
  if (!env.RATE_LIMIT) return { ok: true };
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const day = new Date().toISOString().slice(0, 10);
  const key = `rl:${await sha256Hex(ip)}:${day}`;
  const limit = parseInt(env.RATE_LIMIT_DAILY || "30", 10);
  const cur = parseInt((await env.RATE_LIMIT.get(key)) || "0", 10);
  if (cur >= limit) {
    return { ok: false, limit };
  }
  await env.RATE_LIMIT.put(key, String(cur + 1), { expirationTtl: 90000 });
  return { ok: true };
}

/* —— Prompt 工程模板 —— */

export const FORMAT_RULES = {
  midjourney:
    "Format: a comma-separated list of keywords and short phrases, most important elements first. " +
    "Infer the aspect ratio from the input and end the prompt with an appropriate Midjourney parameter such as `--ar 16:9 --v 6`. " +
    "ONLY --ar and --v flags are allowed. Never emit `--n`, `--no`, `Negative prompt:`, section headers or any negative-prompt syntax. " +
    "No explanation.",
  "stable-diffusion":
    "Format: ONLY a comma-separated list of 12-25 short descriptive visual tags (Stable Diffusion style, weighted terms allowed). " +
    "Describe what IS in the picture: subject, appearance, clothing, pose, background, lighting, quality words. " +
    "Do NOT write any negative words (no 'no xxx' / 'without xxx' / '无水印'), do NOT write a `Negative prompt:` section, " +
    "do NOT use any `--` flags such as --ar, --v or --n, and do NOT output any section header. " +
    "Just the positive tag list, nothing else.",
  dalle:
    "Format: a fluent, descriptive paragraph of 2-4 sentences (natural language, as DALL·E prefers). " +
    "No keyword lists, no `Negative prompt:` section, no `--` flags, no explanation.",
  flux:
    "Format: a detailed natural-language scene description, 3-5 sentences covering subject, environment, lighting, composition and camera details (as Flux prefers). " +
    "No `Negative prompt:` section, no `--` flags, no explanation.",
};

/**
 * Stable Diffusion 专属的负面提示词生成要求。
 *
 * 单独成一次调用，而不是塞进主 prompt —— 小模型同时干"写正面词+写负面词"
 * 会顾此失彼：实测出现过负面词混入正面标签、错用 --n 参数、中英混杂等
 * 多种退化。拆开后两件事各自简单，模型才能稳定执行。
 */
export const SD_NEGATIVE_INSTRUCTION =
  "You are given a Stable Diffusion positive prompt. Output ONLY a `Negative prompt:` line " +
  "containing EXACTLY 6-8 short comma-separated VISUAL defects that commonly ruin AI-generated images, " +
  "chosen to be relevant to the given prompt. " +
  "Allowed examples: lowres, blurry, bad anatomy, extra fingers, extra limbs, watermark, text, signature, jpeg artifacts, " +
  "deformed hands, poorly drawn face, mutated, cropped, out of frame, low contrast. " +
  "Rules: describe PICTURE flaws only. Never mention concepts, facts, logic, science or academic subjects " +
  "(never write things like 'wrong physics judgement'). Never write positive words. " +
  "Never repeat an item. Stop after at most 8 items. Output in English.";

export const STYLE_HINTS = {
  none: "",
  ghibli:
    "Studio Ghibli anime style, hand-painted, soft warm colors, whimsical and nostalgic atmosphere.",
  cyberpunk:
    "Cyberpunk style, neon-lit, futuristic city, high contrast, glowing holograms, moody atmosphere.",
  photoreal:
    "Hyper-realistic photographic style, sharp focus, natural lighting, 8k detail, professional photography.",
  anime: "Modern anime illustration style, clean line art, vibrant colors, expressive characters.",
  watercolor:
    "Watercolor painting style, soft bleeding edges, delicate brush textures, airy pastel palette.",
  "3d-render":
    "3D render, Octane/C4D style, soft studio lighting, subsurface scattering, clean materials.",
  "oil-painting":
    "Classical oil painting style, rich impasto texture, dramatic chiaroscuro lighting.",
  "pixel-art":
    "Pixel art style, 16-bit retro game aesthetic, crisp pixels, limited color palette.",
  fantasy:
    "Epic fantasy concept art style, dramatic lighting, magical atmosphere, highly detailed.",
  minimalist:
    "Minimalist design style, clean composition, generous negative space, limited palette.",
};

export function buildInstruction(target, style, outputLang) {
  const format = FORMAT_RULES[target] || FORMAT_RULES.midjourney;
  const hint = STYLE_HINTS[style] || "";
  const styleLine = hint
    ? `Apply this art style to the result: ${hint}`
    : "Keep the original visual style of the input if applicable.";

  // 关键：--ar / --v 等参数是 Midjourney 独占语法，只有 MJ 目标才允许出现。
  // 早前版本在这里对所有目标都写"保留 --ar / --v"，导致 DALL·E / Flux 也被
  // 传染上 MJ 参数，必须按目标区分。
  const isMJ = target === "midjourney";
  const langLine = isMJ
    ? outputLang === "zh"
      ? "Write the final prompt in Chinese (简体中文). KEEP the `--ar` / `--v` flags as-is."
      : "Write the final prompt in English. KEEP the `--ar` / `--v` flags as-is."
    : outputLang === "zh"
      ? "Write the final prompt in Chinese (简体中文). Do NOT append any `--ar` / `--v` / `--n` flags — those belong to Midjourney only."
      : "Write the final prompt in English. Do NOT append any `--ar` / `--v` / `--n` flags — those belong to Midjourney only.";

  return `${format} ${styleLine} ${langLine} Output ONLY the final prompt itself.`;
}

/**
 * 组装最终 prompt（含 SD 负面词的两段式流程）。
 *
 * - 非 SD 目标：直接用主调用结果。
 * - SD 目标：主调用只出正面词；再单独发一次调用拿负面词，拼成
 *   `正面词\nNegative prompt: ...`。若第二次调用失败，则只返回正面词，
 *   不让整个请求失败——负面词是锦上添花，不是必需。
 */
export async function composePrompt(env, { target, mainPrompt, outputLang }) {
  if (target !== "stable-diffusion") {
    // 非 SD 目标：兜底剥掉误入的 Midjourney 参数（MJ 本身除外）
    if (target === "midjourney") return mainPrompt.trim();
    return stripMjFlags(mainPrompt).trim();
  }
  const positive = sanitizeSdPositive(mainPrompt) || stripMjFlags(mainPrompt).trim();
  try {
    const negRaw = await callZhipu(env, {
      model: env.ZHIPU_TEXT_MODEL || "glm-4-flash",
      maxTokens: 160,
      temperature: 0.4,
      messages: [
        { role: "system", content: SD_NEGATIVE_INSTRUCTION },
        { role: "user", content: `Positive prompt: ${positive}` },
      ],
    });
    const neg = normalizeSdNegative(negRaw);
    if (neg) return `${positive}\n${neg}`;
  } catch {
    // 静默降级：负面词拿不到就不给，不影响主结果
  }
  return positive;
}

/** 剥离 Midjourney 专有的 `--xx` 参数及其取值（确定性兜底） */
export function stripMjFlags(text) {
  return text
    .replace(/\s*--(?:ar|v|n|no|stylize|style|chaos|seed|q|quality|iw|s)\b[^\n]*$/gim, "")
    .replace(/\s*--\w+(\s+[\w:.]+)?/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/[,，]\s*$/g, "")
    .trim();
}

/* ==========================================================================
   CogView-3-Flash 文生图（智谱免费档）
   ========================================================================== */

const COGVIEW_API_URL = "https://open.bigmodel.cn/api/paas/v4/images/generations";

/** 单次请求的最大张数。并发单张出图总时长随张数线性增长，超过 2 张有超时风险。 */
const MAX_IMAGES_PER_REQUEST = 2;

/** 上游单次调用超时（毫秒）。超时主动中止，返回可读错误而不是让请求悬挂。 */
const IMAGE_TIMEOUT_MS = 45000;

/**
 * cogview-3-flash 官方支持的 7 种预设尺寸。
 * 这是唯一可信的白名单——上游对非法 size 的处理不可预期，必须服务端校验。
 * 除 768x1344 / 1344x768 外均为精确比例（后者是 9:16 / 16:9 最接近的官方档位）。
 */
export const COGVIEW_SIZES = [
  "1024x1024", // 1:1
  "864x1152",  // 3:4
  "768x1344",  // ≈9:16
  "1152x864",  // 4:3
  "1344x768",  // ≈16:9
  "1440x720",  // 2:1
  "720x1440",  // 1:2
];

/**
 * 把提示词改造成 CogView 能正确理解的形态。
 *
 * 为什么必须净化：本项目输出的提示词是 Midjourney / Stable Diffusion 格式，
 * 而 CogView 是纯自然语言模型——它既不识别 `--ar 16:9` 这类参数，也不支持
 * 负面提示词语法。原样发送会把符号当成正文内容，实测会显著降低出图质量。
 * 处理分四步：
 *   1. 丢弃 `Negative prompt: ...` 整行（负面词对 CogView 无意义）；
 *   2. 剥离 Midjourney 的 `--xx` 参数；
 *   3. 去掉 markdown 列表符号与成对引号；
 *   4. 压缩空白、清理悬空分隔符，并接成单行。
 */
export function toCogviewPrompt(text) {
  const NEG_LINE_RE = /^\s*(?:negative\s*prompt|负面提示词|负面词|反向提示词|negative)\s*[:：]/i;
  let t = String(text || "")
    .split(/\r?\n/)
    .filter((line) => !NEG_LINE_RE.test(line))
    .join("\n");

  t = stripMjFlags(t);
  t = t.replace(/^[#*•\-—]+\s*/gm, "");
  t = t.replace(/^["'“”「『]+/, "").replace(/["'“”」』]+$/, "");
  t = t
    .replace(/\s*\n\s*/g, " ")
    .replace(/\s*[,，]\s*/g, ", ")
    .replace(/(?:,\s*)+/g, ", ")
    .replace(/\s{2,}/g, " ")
    .replace(/^[,，\s]+|[,，\s]+$/g, "");
  return t.trim();
}

/**
 * 从提示词的 `--ar A:B` 里推断目标尺寸，返回 COGVIEW_SIZES 中的一项。
 *
 * 用对数距离而不是比值差做最近邻：比例是对称量，2:1 与 1:2 折叠后等价，
 * 直接比较差值会让宽屏档位系统性胜出。无 `--ar` 时返回 null，由调用方决定默认值。
 */
export function detectAspectSize(text) {
  const m = String(text || "").match(/--ar\s+(\d+(?:\.\d+)?)\s*[:：]\s*(\d+(?:\.\d+)?)/i);
  if (!m) return null;
  const ratio = parseFloat(m[1]) / parseFloat(m[2]);
  if (!Number.isFinite(ratio) || ratio <= 0) return null;

  let best = null;
  let bestDiff = Infinity;
  for (const size of COGVIEW_SIZES) {
    const [w, h] = size.split("x").map(Number);
    const diff = Math.abs(Math.log(w / h) - Math.log(ratio));
    if (diff < bestDiff) {
      bestDiff = diff;
      best = size;
    }
  }
  return best;
}

/**
 * 调用 CogView-3-Flash 出图，返回 { images, model, size }。
 *
 * 固定按「并发单张」发送：上游同一次请求返回多张的稳定性不如并发单张，
 * 且逐张独立失败时错误可定位。任一张失败即整体抛出，不留半截结果。
 */
export async function callCogview(env, { prompt, size, count = 1 }) {
  const key = env.ZHIPU_API_KEY;
  if (!key) throw new Error("ZHIPU_API_KEY_NOT_SET");

  const model = env.ZHIPU_IMAGE_MODEL || "cogview-3-flash";
  const finalSize = COGVIEW_SIZES.includes(size) ? size : COGVIEW_SIZES[0];
  const n = Math.min(Math.max(parseInt(count, 10) || 1, 1), MAX_IMAGES_PER_REQUEST);

  const requestOne = async () => {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), IMAGE_TIMEOUT_MS);
    try {
      const res = await fetch(COGVIEW_API_URL, {
        method: "POST",
        signal: ctl.signal,
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ model, prompt, size: finalSize, n: 1 }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`UPSTREAM_${res.status}:${text.slice(0, 300)}`);
      }
      const data = await res.json();
      const item = data?.data?.[0];
      const url =
        item?.url ||
        (item?.b64_json ? `data:image/png;base64,${item.b64_json}` : null);
      if (!url) throw new Error("EMPTY_RESPONSE");
      return url;
    } catch (e) {
      if (e?.name === "AbortError") throw new Error("UPSTREAM_TIMEOUT");
      throw e;
    } finally {
      clearTimeout(timer);
    }
  };

  const images = await Promise.all(Array.from({ length: n }, requestOne));
  return { images, model, size: finalSize };
}

/**
 * 识别「上游内容安全审核拒绝」，翻译成用户能据以行动的失败响应。
 *
 * 背景：智谱用「HTTP 状态码 + 业务错误码」两层结构报错，业务码才是真正的信息。
 * 审核拒绝是 HTTP 400 + 业务码 1301（关联码 1300），响应体形如：
 *   { "contentFilter": [{ "level": 1, "role": "user" }],
 *     "error": { "code": "1301", "message": "系统检测到输入或生成内容可能包含不安全或敏感内容…" } }
 * 原先把整段上游 JSON 拼进 message 直接下发，用户看到的是一串英文加原始 JSON，
 * 既看不懂「是我的提示词有问题」也无法据此改写。
 *
 * 本函数只做确定性分类，识别不了的一律返回 null，由调用方沿用原有兜底逻辑
 * （即「不猜测、不扩大改动面」）。同样的审核拒绝也会发生在 glm-4v-flash /
 * glm-4-flash 上，因此判定逻辑放在共享库，供各接口按需复用。
 */
export function describeUpstreamError(err) {
  const msg = String((err && err.message) || err || "");
  const m = msg.match(/^UPSTREAM_(\d+):([\s\S]*)$/);
  if (!m) return null;

  const rawBody = m[2] || "";
  let bizCode = "";
  let upstreamMessage = "";
  try {
    const parsed = JSON.parse(rawBody);
    bizCode = String(parsed?.error?.code || "");
    upstreamMessage = String(parsed?.error?.message || "");
  } catch {
    // 上游未必返回 JSON，退化为对原文的关键词判断
    upstreamMessage = rawBody;
  }

  const isBlocked =
    bizCode === "1301" ||
    bizCode === "1300" ||
    /敏感|不安全|违规|policy block|sensitive|content policy|safety/i.test(upstreamMessage);

  if (!isBlocked) return null;

  return {
    status: 422,
    code: "content_blocked",
    // 具体文案由前端按界面语言本地化，这里只给出语义化错误码
    message: "Blocked by upstream content safety review.",
  };
}

/* —— 出图结果的同源下载签名 ——
 *
 * 为什么需要：智谱图片 CDN（*.ufileos.com）不返回 Access-Control-Allow-Origin，
 * 浏览器直接 fetch 它必被 CORS 拦下，前端无法把图存成文件；而 `<a download>`
 * 对跨源地址同样失效。因此由服务端签发同源下载地址，交给 /api/img 中转。
 *
 * 为什么签名：/api/img 若不校验就退化成任意 URL 的开放代理。签名以
 * ZHIPU_API_KEY 为密钥（不额外引入 Secret），只放行本服务自己签发的地址。 */

const SIGN_TTL_SEC = 24 * 3600; // 下载链接有效期，覆盖「页面开着放到第二天」的常见情形

async function hmacHex(secret, message) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function signSecret(env) {
  // 极端情况下缺 Key 时给出固定串，签名仍可用（此时上游本来也不会出图）
  return env.ZHIPU_API_KEY || "unsigned";
}

/** 把上游图片地址包装成带签名的同源下载地址 */
export async function signImageUrl(env, url, ttlSec = SIGN_TTL_SEC) {
  const exp = Math.floor(Date.now() / 1000) + ttlSec;
  const sig = await hmacHex(signSecret(env), `${exp}|${url}`);
  return `/api/img?u=${encodeURIComponent(url)}&e=${exp}&s=${sig}`;
}

/** 校验 /api/img 的签名与有效期 */
export async function verifyImageSignature(env, url, exp, sig) {
  const e = parseInt(exp, 10);
  if (!Number.isFinite(e) || e * 1000 < Date.now()) return false;
  const expect = await hmacHex(signSecret(env), `${e}|${url}`);
  const given = String(sig);
  if (expect.length !== given.length) return false;
  // 恒定时间比较，避免按字节提前返回形成时序侧信道
  let diff = 0;
  for (let i = 0; i < expect.length; i++) {
    diff |= expect.charCodeAt(i) ^ given.charCodeAt(i);
  }
  return diff === 0;
}
