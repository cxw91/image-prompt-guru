// GET /api/img?u=<encoded>&e=<exp>&s=<sig> —— 出图结果的同源下载通道
//
// 存在的理由：智谱图片 CDN（*.ufileos.com）不返回 Access-Control-Allow-Origin，
// 浏览器直接取图必被 CORS 拦下，`<a download>` 对跨源地址也不生效，因此不能指望
// 前端把图存成文件。这里由服务端中转，顺带补上正确的文件名与 Content-Type。
//
// 安全边界：只放行 /api/imagine 自己签发的地址（HMAC 签名，密钥即 ZHIPU_API_KEY，
// 不引入新 Secret）。未签名或过期一律 403，避免本端点沦为任意 URL 的开放代理。
import { fail, verifyImageSignature } from "../_lib/zhipu.js";

const MAX_BYTES = 8 * 1024 * 1024; // 单图上限，超出即拒绝，防止被当作大流量中转

/**
 * 按魔数判断真实图片格式。
 *
 * 必要性：实测上游 CDN 不返回 Content-Type（响应里拿不到），若沿用兜底的
 * `image/png`，会把 JPEG 字节标成 PNG——文件名与类型双双失真，部分看图
 * 软件与「另存为」会因此出错。魔数是唯一可信来源。
 */
function sniffType(buf) {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return { type: "image/jpeg", ext: "jpg" };
  }
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return { type: "image/png", ext: "png" };
  }
  // Uint8Array 没有 Buffer#toString(encoding)，用 ASCII 码点逐字节还原
  const ascii = (from, to) => String.fromCharCode(...buf.subarray(from, to));
  if (buf.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") {
    return { type: "image/webp", ext: "webp" };
  }
  return { type: "application/octet-stream", ext: "bin" };
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const params = new URL(request.url).searchParams;
  const url = params.get("u");
  const exp = params.get("e");
  const sig = params.get("s");

  if (!url || !exp || !sig) return fail(400, "bad_request", "Missing u / e / s.");
  if (!(await verifyImageSignature(env, url, exp, sig))) {
    return fail(403, "bad_signature", "Download link is invalid or expired.");
  }

  let upstream;
  try {
    upstream = await fetch(url);
  } catch (e) {
    return fail(502, "upstream_error", `Cannot fetch image: ${String(e.message || e).slice(0, 200)}`);
  }
  if (!upstream.ok) {
    // 上游图片链接有效期约 30 天，过期后这里会返回非 2xx
    return fail(502, "upstream_error", `Image source returned ${upstream.status}.`);
  }

  // 图片体积量级为百 KB，整体读入内存换取准确的类型嗅探与长度校验（流式无法回头改头）
  const buf = new Uint8Array(await upstream.arrayBuffer());
  if (buf.byteLength > MAX_BYTES) return fail(413, "too_large", "Image too large to download.");
  if (!buf.byteLength) return fail(502, "empty_response", "Image source returned no data.");

  const { type, ext } = sniffType(buf);
  return new Response(buf, {
    status: 200,
    headers: {
      "Content-Type": type,
      "Content-Length": String(buf.byteLength),
      "Content-Disposition": `attachment; filename="cogview-${Date.now()}.${ext}"`,
      "Cache-Control": "private, max-age=1800",
    },
  });
}
