/* Image Prompt Guru —— 前端逻辑（页内中英切换 + 生成 + 历史） */
(function () {
  "use strict";

  var I18N = {
    en: {
      htmlLang: "en",
      langBtn: "中文",
      heroTitle: 'Turn any <span class="grad">image or idea</span> into a pro AI prompt',
      heroSub: "Free · No login · Images processed in real time and never stored",
      chip1: "Image to Prompt", chip2: "Text to Prompt",
      chip3: "🤖 Midjourney · DALL·E · SD · Flux", chip4: "🌐 Output follows UI language",
      tabImage: "Image to Prompt", tabText: "Text to Prompt",
      urlPh: "image URL (https://…)",
      textPh: "Describe your idea in any language, e.g. “a cat astronaut floating above neon Tokyo, retro anime style”",
      removeTitle: "Remove",
      uploadHint: "Click / drag an image here, or paste a screenshot",
      uploadFormats: "JPG · PNG · WEBP, auto-compressed in your browser",
      styleLabel: "Art style",
      targetLabel: "Target model",
      generate: "✨ Generate Prompt",
      generating: "Generating…",
      copy: "Copy",
      copied: "Copied ✓",
      resultLabel: "Generated prompt",
      resultEmpty: "Your prompt will appear here.",
      tabImagine: "Text to Image",
      imaginePh: "Paste any prompt here, e.g. “a red panda barista pulling espresso, cinematic lighting”",
      sizeLabel: "Image size",
      countLabel: "Images",
      counts: { "1": "1 image", "2": "2 images" },
      imagine: "🎨 Generate image",
      imagining: "Generating image…",
      toImagine: "🎨 Generate image from this prompt",
      imageLabel: "Generated image",
      download: "Download",
      imagineFailed: "Preview unavailable",
      errNoPrompt: "Generate a prompt first.",
      errNoImagineInput: "Please enter a prompt first.",
      errImagine: "Image generation failed, please retry.",
      sizes: {
        "1024x1024": "Square 1:1 · 1024×1024",
        "864x1152": "Portrait 3:4 · 864×1152",
        "768x1344": "Portrait 9:16 · 768×1344",
        "1152x864": "Landscape 4:3 · 1152×864",
        "1344x768": "Landscape 16:9 · 1344×768",
        "1440x720": "Wide 2:1 · 1440×720",
        "720x1440": "Tall 1:2 · 720×1440",
      },
      history: "History (stored in your browser only)",
      clearHistory: "Clear",
      historyEmpty: "No history yet.",
      errNoImage: "Please upload an image or enter an image URL first.",
      errNoText: "Please enter your idea first.",
      errNetwork: "Network error — could not reach the service. Check your connection and retry.",
      errLocalFile: "The backend API is not running because this HTML file was opened locally (file://). Deploy to Cloudflare (see README) or start `wrangler pages dev` first.",
      errBadResponse: "The service returned an unreadable response (HTTP {status}). Please retry — if it keeps happening, check the deployment status.",
      errBlocked: "The prompt was blocked by content safety review. Please rephrase it and try again.",
      errLimit: "Daily limit reached, please come back tomorrow.",
      styles: {
        none: "Original / none", ghibli: "Ghibli", cyberpunk: "Cyberpunk",
        photoreal: "Photorealistic", anime: "Anime", watercolor: "Watercolor",
        "3d-render": "3D Render", "oil-painting": "Oil Painting",
        "pixel-art": "Pixel Art", fantasy: "Fantasy", minimalist: "Minimalist",
      },
      targets: { midjourney: "Midjourney", "stable-diffusion": "Stable Diffusion", dalle: "DALL·E", flux: "Flux" },
    },
    zh: {
      htmlLang: "zh",
      langBtn: "English",
      heroTitle: '把任意<span class="grad">图片或想法</span>变成专业 AI 提示词',
      heroSub: "完全免费 · 无需注册 · 图片实时处理、绝不存储",
      chip1: "图片转提示词", chip2: "文字转提示词",
      chip3: "🤖 Midjourney · DALL·E · SD · Flux", chip4: "🌐 中文界面出中文提示词",
      tabImage: "图片转提示词", tabText: "文字转提示词",
      urlPh: "图片链接（https://…）",
      textPh: "用任何语言描述你的想法，例如「一只戴着宇航员头盔的猫，漂浮在霓虹灯闪烁的东京上空，复古动漫风」",
      removeTitle: "移除",
      uploadHint: "点击 / 拖拽图片到这里，或直接粘贴截图",
      uploadFormats: "JPG · PNG · WEBP，浏览器内自动压缩",
      styleLabel: "艺术风格",
      targetLabel: "目标模型",
      generate: "✨ 生成提示词",
      generating: "生成中…",
      copy: "复制",
      copied: "已复制 ✓",
      resultLabel: "生成的提示词",
      resultEmpty: "提示词将显示在这里。",
      tabImagine: "提示词生图",
      imaginePh: "粘贴或输入提示词，例如「一只红色小熊猫咖啡师在拉花，电影感光线」",
      sizeLabel: "画面尺寸",
      countLabel: "生成张数",
      counts: { "1": "1 张", "2": "2 张" },
      imagine: "🎨 生成图片",
      imagining: "出图中…",
      toImagine: "🎨 用这个提示词出图",
      imageLabel: "生成的图片",
      download: "下载",
      imagineFailed: "图片加载失败",
      errNoPrompt: "请先生成提示词。",
      errNoImagineInput: "请先输入提示词。",
      errImagine: "出图失败，请重试。",
      sizes: {
        "1024x1024": "正方形 1:1 · 1024×1024",
        "864x1152": "竖版 3:4 · 864×1152",
        "768x1344": "竖版 9:16 · 768×1344",
        "1152x864": "横版 4:3 · 1152×864",
        "1344x768": "横版 16:9 · 1344×768",
        "1440x720": "宽屏 2:1 · 1440×720",
        "720x1440": "长屏 1:2 · 720×1440",
      },
      history: "历史记录（仅保存在你的浏览器中）",
      clearHistory: "清空",
      historyEmpty: "暂无历史记录。",
      errNoImage: "请先上传图片或填写图片链接。",
      errNoText: "请先输入你的想法。",
      errNetwork: "网络异常：未能连接到服务，请检查网络后重试。",
      errLocalFile: "本地直接打开 HTML（file://）时后端 API 不在线。请先部署到 Cloudflare（见 README），或在本地运行 wrangler pages dev 后再试。",
      errBadResponse: "服务返回了无法解析的响应（HTTP {status}）。请重试；若持续出现，请检查部署状态。",
      errBlocked: "提示词未通过内容安全审核，请修改后重试。",
      errLimit: "今日次数已用完，请明天再来。",
      styles: {
        none: "原图风格 / 无", ghibli: "吉卜力", cyberpunk: "赛博朋克",
        photoreal: "照片写实", anime: "动漫", watercolor: "水彩",
        "3d-render": "3D 渲染", "oil-painting": "油画",
        "pixel-art": "像素画", fantasy: "奇幻", minimalist: "极简",
      },
      targets: { midjourney: "Midjourney", "stable-diffusion": "Stable Diffusion", dalle: "DALL·E", flux: "Flux" },
    },
  };

  var $ = function (id) { return document.getElementById(id); };

  /* 彩色 SVG 图片图标（替代 emoji，全平台显示一致）
     display:block + flex:none 由 .tab-icon 提供，避免 svg 基线对齐导致的错位 */
  var ICON_IMAGE = '<svg class="tab-icon" width="16" height="16" viewBox="0 0 48 48" aria-hidden="true" focusable="false">'
    + '<rect x="3" y="9" width="42" height="32" rx="6" fill="#6D8CFF"/>'
    + '<rect x="7" y="13" width="34" height="24" rx="3" fill="#EAF1FF"/>'
    + '<circle cx="16.5" cy="20.5" r="3.5" fill="#FFB020"/>'
    + '<path d="M7 33 L19 24 L26 29 L33 21.5 L41 29 L41 34 Q41 37 38 37 L10 37 Q7 37 7 34 Z" fill="#3ECF8E"/>'
    + '<path d="M22 33 L29 26 L34 30.5 L34 37 L22 37 Z" fill="#1D9E75"/>'
    + '</svg>';

  /* chip 标签用的小图标（与标签栏同款图形，尺寸缩到 14px 适配 chip 行高） */
  var ICON_IMAGE_CHIP = ICON_IMAGE.replace('class="tab-icon" width="16" height="16"', 'class="chip-icon" width="14" height="14"');

  /* 文字转提示词用：文档 + 铅笔，与图片图标同一套配色。
     纸面留出足够蓝边、文字线取深蓝且加粗——14px 下若白底占比过大，
     图标会退化成一块白斑，辨识度反而不如 emoji。 */
  var ICON_TEXT = '<svg class="tab-icon" width="16" height="16" viewBox="0 0 48 48" aria-hidden="true" focusable="false">'
    + '<rect x="5" y="4" width="27" height="36" rx="5" fill="#6D8CFF"/>'
    + '<rect x="9.5" y="9" width="18" height="26" rx="2.5" fill="#EAF1FF"/>'
    + '<rect x="13" y="13.5" width="11" height="3.4" rx="1.7" fill="#4A66D8"/>'
    + '<rect x="13" y="19.5" width="11" height="3.4" rx="1.7" fill="#4A66D8"/>'
    + '<rect x="13" y="25.5" width="7" height="3.4" rx="1.7" fill="#4A66D8"/>'
    + '<path d="M28 34.5 L38 24.5 L42.5 29 L32.5 39 Z" fill="#FFB020"/>'
    + '<path d="M38 24.5 L40.5 22 A3.2 3.2 0 0 1 45 26.5 L42.5 29 Z" fill="#3ECF8E"/>'
    + '<path d="M28 34.5 L32.5 39 L26 41 Z" fill="#6D8CFF"/>'
    + '</svg>';

  /* 供历史记录等紧凑场景使用的 14px 版本 */
  var ICON_TEXT_CHIP = ICON_TEXT.replace('class="tab-icon" width="16" height="16"', 'class="chip-icon" width="14" height="14"');

  /* 生图标签用：画框 + 右上角星芒，与前两个标签视觉同族 */
  var ICON_IMAGINE = '<svg class="tab-icon" width="16" height="16" viewBox="0 0 48 48" aria-hidden="true" focusable="false">'
    + '<rect x="2" y="12" width="30" height="26" rx="5" fill="#6D8CFF"/>'
    + '<rect x="5.5" y="15.5" width="23" height="19" rx="2.5" fill="#EAF1FF"/>'
    + '<circle cx="12" cy="21.5" r="2.6" fill="#FFB020"/>'
    + '<path d="M5.5 31 L13 25 L17 28 L22 23.5 L28.5 31 L28.5 33 Q28.5 34.5 27 34.5 L7 34.5 Q5.5 34.5 5.5 33 Z" fill="#3ECF8E"/>'
    + '<path d="M39 6.5 L40.8 11.2 L45.5 13 L40.8 14.8 L39 19.5 L37.2 14.8 L32.5 13 L37.2 11.2 Z" fill="#9A6DFF"/>'
    + '</svg>';

  /* ---------- 语言状态 ---------- */
  var LANG_KEY = "ipg_lang";
  function initialLang() {
    var q = new URLSearchParams(location.search).get("lang");
    if (q === "zh" || q === "en") return q;
    try {
      var saved = localStorage.getItem(LANG_KEY);
      if (saved === "zh" || saved === "en") return saved;
    } catch (e) { /* 隐私模式忽略 */ }
    return (navigator.language || "").toLowerCase().indexOf("zh") === 0 ? "zh" : "en";
  }
  var lang = initialLang();
  var t = I18N[lang];
  var busy = false; // 生成请求进行中标记（重入守卫 + 按钮文案状态）
  var drawing = false; // 出图请求进行中标记（与 busy 分开，两个动作互不阻塞对方文案）
  var currentPrompt = ""; // 最近一次生成的提示词，作为出图入参
  var promptShown = false; // 是否已有提示词结果（决定结果区在提示词模式下是否可见）
  var lastResult = null; // 最近一次出图结果 { images, downloads, size }，切语言时按新文案重渲染

  /* ---------- 页内语言切换 ---------- */
  function applyLang() {
    t = I18N[lang];
    document.documentElement.lang = t.htmlLang;
    document.title = lang === "zh" ? "图片转提示词生成器 — 免费免登录" : "Image to Prompt Generator — Free & No Login";
    try { localStorage.setItem(LANG_KEY, lang); } catch (e) { /* 隐私模式忽略 */ }

    $("lang-switch").textContent = t.langBtn;
    $("hero-title").innerHTML = t.heroTitle;
    $("hero-sub").textContent = t.heroSub;
    $("chip1").innerHTML = ICON_IMAGE_CHIP + "<span>" + t.chip1 + "</span>";
    $("chip2").innerHTML = ICON_TEXT_CHIP + "<span>" + t.chip2 + "</span>";
    $("chip3").textContent = t.chip3;
    $("chip4").textContent = t.chip4;
    var tabs = document.querySelectorAll(".tab");
    // 三个 tab 统一用「图标 + 文字」的 span 结构渲染，保证排版一致
    tabs[0].innerHTML = ICON_IMAGE + '<span>' + t.tabImage + '</span>';
    tabs[1].innerHTML = ICON_TEXT + '<span>' + t.tabText + '</span>';
    tabs[2].innerHTML = ICON_IMAGINE + '<span>' + t.tabImagine + '</span>';
    $("image-url").placeholder = t.urlPh;
    $("text-input").placeholder = t.textPh;
    $("imagine-input").placeholder = t.imaginePh;
    $("remove-btn").title = t.removeTitle;
    $("upload-hint").textContent = t.uploadHint;
    $("upload-formats").textContent = t.uploadFormats;
    $("style-field-label").textContent = t.styleLabel;
    $("target-field-label").textContent = t.targetLabel;
    $("result-label").textContent = t.resultLabel;
    $("size-field-label").textContent = t.sizeLabel;
    $("count-field-label").textContent = t.countLabel;
    $("image-label").textContent = t.imageLabel;
    $("to-imagine-btn").textContent = t.toImagine;
    $("history-title").textContent = t.history;
    $("clear-history").textContent = t.clearHistory;

    /* 下拉框重建 */
    var styleSel = $("style-select"), targetSel = $("target-select");
    var sizeSel = $("size-select"), countSel = $("count-select");
    var styleVal = styleSel.value, targetVal = targetSel.value;
    var sizeVal = sizeSel.value, countVal = countSel.value;
    styleSel.innerHTML = ""; targetSel.innerHTML = "";
    sizeSel.innerHTML = ""; countSel.innerHTML = "";
    Object.keys(t.styles).forEach(function (k) {
      var o = document.createElement("option");
      o.value = k; o.textContent = t.styles[k]; styleSel.appendChild(o);
    });
    Object.keys(t.targets).forEach(function (k) {
      var o = document.createElement("option");
      o.value = k; o.textContent = t.targets[k]; targetSel.appendChild(o);
    });
    Object.keys(t.sizes).forEach(function (k) {
      var o = document.createElement("option");
      o.value = k; o.textContent = t.sizes[k]; sizeSel.appendChild(o);
    });
    Object.keys(t.counts).forEach(function (k) {
      var o = document.createElement("option");
      o.value = k; o.textContent = t.counts[k]; countSel.appendChild(o);
    });
    if (styleVal) styleSel.value = styleVal;
    if (targetVal) targetSel.value = targetVal;
    // 尺寸与张数的 value 都是纯数字串（尺寸与后端白名单一致），跨语言不变，直接回填
    sizeSel.value = sizeVal || "1024x1024";
    countSel.value = countVal || "1";

    /* 结果区与提示刷新 */
    if (!promptShown) $("result-output").textContent = t.resultEmpty;
    renderHistory();
    // 出图结果的按钮文案也要跟着切语言
    renderImages(lastResult);
    // 生成按钮文案、各面板显隐都依赖当前模式与请求状态，统一在这里收敛
    syncMode();
  }

  $("lang-switch").addEventListener("click", function (e) {
    e.preventDefault();
    lang = lang === "zh" ? "en" : "zh";
    applyLang();
  });

  /* ---------- Tab 切换 ---------- */
  var mode = "image";
  var tabs = document.querySelectorAll(".tab");

  function hasImages() {
    return !!(lastResult && lastResult.images && lastResult.images.length);
  }

  /**
   * 按当前模式收敛面板显隐与主按钮文案。
   *
   * 三个模式只有两种主按钮语义：提示词模式是「生成提示词」，生图模式是「生成图片」，
   * 因此共用一个 #generate-btn，靠这里改写文案与禁用态，避免维护两套按钮。
   */
  function syncMode() {
    var isImagine = mode === "imagine";
    $("panel-image").style.display = mode === "image" ? "block" : "none";
    $("panel-text").style.display = mode === "text" ? "block" : "none";
    $("panel-imagine").style.display = isImagine ? "block" : "none";
    // 风格 / 目标模型只对提示词接口有意义；生图面板自带画面尺寸与张数
    $("prompt-controls").style.display = isImagine ? "none" : "grid";
    // 提示词结果只在提示词模式展示，图片结果只在生图模式展示
    $("result-wrap").style.display = !isImagine && promptShown ? "block" : "none";
    $("image-wrap").style.display = isImagine && hasImages() ? "block" : "none";

    var gb = $("generate-btn");
    gb.disabled = busy || drawing;
    // 请求进行中保持"生成中"文案，避免切语言/切标签看起来像没在跑
    if (isImagine) gb.textContent = drawing ? t.imagining : t.imagine;
    else gb.textContent = busy ? t.generating : t.generate;
  }

  /** 切换标签（标签点击与「用这个提示词出图」共用） */
  function switchMode(next) {
    mode = next;
    tabs.forEach(function (x) { x.classList.toggle("active", x.dataset.mode === next); });
    syncMode();
    renderHistory(); // 历史条目能否点击回填取决于当前模式
  }

  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () { switchMode(tab.dataset.mode); });
  });

  /* ---------- 图片上传 ---------- */
  var dropzone = $("dropzone"), fileInput = $("file-input");
  var previewWrap = $("preview-wrap"), previewImg = $("preview-img");
  var imageDataUrl = null;

  function showImage(dataUrl) {
    imageDataUrl = dataUrl;
    previewImg.src = dataUrl;
    previewWrap.style.display = "block";
    dropzone.style.display = "none";
  }
  function clearImage() {
    imageDataUrl = null;
    fileInput.value = "";
    previewWrap.style.display = "none";
    dropzone.style.display = "block";
  }
  dropzone.addEventListener("click", function () { fileInput.click(); });
  dropzone.addEventListener("dragover", function (e) { e.preventDefault(); dropzone.classList.add("dragover"); });
  dropzone.addEventListener("dragleave", function () { dropzone.classList.remove("dragover"); });
  dropzone.addEventListener("drop", function (e) {
    e.preventDefault(); dropzone.classList.remove("dragover");
    var f = e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) handleFile(f);
  });
  fileInput.addEventListener("change", function () {
    if (fileInput.files && fileInput.files[0]) handleFile(fileInput.files[0]);
  });
  document.addEventListener("paste", function (e) {
    var items = e.clipboardData && e.clipboardData.items;
    if (!items) return;
    for (var i = 0; i < items.length; i++) {
      if (items[i].type && items[i].type.indexOf("image") === 0) {
        handleFile(items[i].getAsFile());
        break;
      }
    }
  });
  $("remove-btn").addEventListener("click", clearImage);

  function handleFile(file) {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      showNotice(t.errNoImage);
      return;
    }
    compressImage(file).then(showImage).catch(function () { showNotice(t.errNoImage); });
  }

  /** 浏览器端压缩：最长边 ≤1024，JPEG 质量 ≤0.85，目标 ≤900KB */
  function compressImage(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        var img = new Image();
        img.onload = function () {
          var MAX = 1024;
          var scale = Math.min(1, MAX / Math.max(img.width, img.height));
          var w = Math.round(img.width * scale), h = Math.round(img.height * scale);
          var canvas = document.createElement("canvas");
          canvas.width = w; canvas.height = h;
          var ctx = canvas.getContext("2d");
          ctx.fillStyle = "#ffffff"; // PNG 透明底转白
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);
          var quality = 0.85, out = canvas.toDataURL("image/jpeg", quality);
          while (out.length > 900 * 1024 && quality > 0.45) {
            quality -= 0.1;
            out = canvas.toDataURL("image/jpeg", quality);
          }
          resolve(out);
        };
        img.onerror = reject;
        img.src = reader.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /* ---------- 生成 ---------- */
  var generateBtn = $("generate-btn");
  var noticeBox = $("notice");
  function showNotice(msg) {
    noticeBox.textContent = msg;
    noticeBox.style.display = "block";
    // 提示条在卡片顶部，而出图失败时用户视线在结果区下方。
    // block:"nearest" 只在该元素不可见时才滚动，不打扰正常流程。
    if (noticeBox.scrollIntoView) {
      noticeBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }
  function hideNotice() { noticeBox.style.display = "none"; }

  /**
   * 读取响应并尽力解析为 JSON，同时保留状态码与原始文本。
   *
   * 为什么要自己解析：原先直接用 res.json()，一旦响应不是 JSON（缓存了错误页、
   * 边缘返回了 HTML、上游异常页被透传等）就抛异常，被 .catch 归入「连不上服务」，
   * 用户得到的是与事实不符的指引，而真正的原因（HTTP 状态码）被丢掉了。
   */
  function readJson(res) {
    return res.text().then(function (raw) {
      var data = null;
      try { data = JSON.parse(raw); } catch (e) { /* 非 JSON：由调用方按状态码提示 */ }
      return { status: res.status, data: data, raw: raw };
    });
  }

  /** 后端只回语义化错误码，具体文案按当前界面语言在此收敛 */
  function messageForError(data, fallback) {
    if (data && data.error === "content_blocked") return t.errBlocked;
    return (data && data.message) || fallback;
  }

  /** fetch 本身失败时的提示：open 本地文件与真实网络故障要分开说 */
  function noticeForNetworkFailure() {
    return location.protocol === "file:" ? t.errLocalFile : t.errNetwork;
  }

  generateBtn.addEventListener("click", function () {
    // 守卫必须放在最前面：一旦有请求在飞，后续点击直接丢弃
    if (busy || drawing) return;

    // 生图模式共用同一个按钮，但走完全不同的接口与结果区
    if (mode === "imagine") {
      runImagine($("imagine-input").value.trim(), t.errNoImagineInput);
      return;
    }

    hideNotice();
    var style = $("style-select").value, target = $("target-select").value;
    var endpoint, payload;

    if (mode === "image") {
      var urlInput = $("image-url").value.trim();
      if (imageDataUrl) {
        payload = { image: imageDataUrl, style: style, target: target, outputLang: lang };
      } else if (urlInput) {
        payload = { imageUrl: urlInput, style: style, target: target, outputLang: lang };
      } else {
        showNotice(t.errNoImage); return;
      }
      endpoint = "/api/generate";
    } else {
      var text = $("text-input").value.trim();
      if (!text) { showNotice(t.errNoText); return; }
      payload = { text: text, style: style, target: target, outputLang: lang };
      endpoint = "/api/enhance";
    }

    busy = true;
    syncMode();

    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(readJson)
      .then(function (r) {
        if (r.status === 429) { showNotice(t.errLimit); return; }
        if (!r.data) {
          // 响应不是 JSON：把状态码如实告诉用户，而不是谎报「连不上服务」
          showNotice(t.errBadResponse.replace("{status}", r.status));
          return;
        }
        if (!r.data.ok) {
          showNotice(messageForError(r.data, t.errNetwork));
          return;
        }
        currentPrompt = r.data.prompt;
        promptShown = true;
        $("result-output").textContent = currentPrompt;
        // 换了提示词，上一轮出的图不再对应，先清空
        lastResult = null;
        renderImages(null);
        // 提示词里若带 Midjourney 的 --ar 参数，按它预选画面尺寸（用户仍可手改）
        var guessed = detectSize(currentPrompt);
        if (guessed) $("size-select").value = guessed;
        addHistory(mode, target, currentPrompt);
        syncMode();
        $("result-output").scrollIntoView({ behavior: "smooth", block: "nearest" });
      })
      .catch(function () { showNotice(noticeForNetworkFailure()); })
      .finally(function () {
        busy = false;
        syncMode();
      });
  });

  /* ---------- 复制 ---------- */
  $("copy-btn").addEventListener("click", function () {
    copyText($("result-output").textContent, this);
  });
  function copyText(text, btn) {
    function done() {
      var old = btn.textContent;
      btn.textContent = t.copied;
      btn.classList.add("ok");
      setTimeout(function () { btn.textContent = old; btn.classList.remove("ok"); }, 1500);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done);
    } else {
      var ta = document.createElement("textarea");
      ta.value = text; document.body.appendChild(ta); ta.select();
      document.execCommand("copy"); document.body.removeChild(ta); done();
    }
  }

  /* ---------- 出图（提示词 → 图片，CogView-3-Flash 免费档） ---------- */

  /**
   * 从提示词的 `--ar A:B` 推断画面尺寸，返回 t.sizes 的某个 key。
   * 与后端 detectAspectSize 用同一套「对数距离最近邻」：比例是对称量，
   * 直接比较比值差会让宽屏档位系统性胜出。
   */
  function detectSize(text) {
    var m = /--ar\s+(\d+(?:\.\d+)?)\s*[:：]\s*(\d+(?:\.\d+)?)/i.exec(text || "");
    if (!m) return null;
    var ratio = parseFloat(m[1]) / parseFloat(m[2]);
    if (!isFinite(ratio) || ratio <= 0) return null;
    var best = null, bestDiff = Infinity;
    Object.keys(t.sizes).forEach(function (s) {
      var p = s.split("x");
      var diff = Math.abs(Math.log(Number(p[0]) / Number(p[1])) - Math.log(ratio));
      if (diff < bestDiff) { bestDiff = diff; best = s; }
    });
    return best;
  }

  function renderImages(result) {
    var images = (result && result.images) || [];
    var downloads = (result && result.downloads) || [];
    var size = (result && result.size) || "";
    var grid = $("image-grid");
    grid.innerHTML = "";
    if (!images.length) return;

    images.forEach(function (url, i) {
      var card = document.createElement("div");
      card.className = "image-card";
      card.setAttribute("data-failed", t.imagineFailed);

      // 点图看大图：新窗口打开原始地址（<img> 展示不涉及 CORS）
      var view = document.createElement("a");
      view.href = url;
      view.target = "_blank";
      view.rel = "noopener noreferrer";
      var img = document.createElement("img");
      img.src = url;
      img.alt = size ? t.imageLabel + " " + size : t.imageLabel;
      img.loading = "lazy";
      img.addEventListener("error", function () { card.classList.add("failed"); });
      view.appendChild(img);

      // 下载走同源签名地址：上游 CDN 无 CORS 头，跨源直链既 fetch 不了、
      // download 属性也会被忽略；同理这里不设 download（其取值会覆盖服务端
      // 推断出的真实扩展名），直接依赖 /api/img 的 Content-Disposition 落盘。
      // 统一 _blank：签名过期时响应是错误 JSON，若在本文档打开会把整个页面
      // 顶掉，新窗口打开则只是多一个标签页。
      var dl = document.createElement("a");
      dl.className = "btn-link";
      dl.href = downloads[i] || url; // 签名地址缺失时退化为新窗口打开原图
      dl.textContent = t.download;
      dl.target = "_blank";
      dl.rel = "noopener noreferrer";

      card.appendChild(view);
      card.appendChild(dl);
      grid.appendChild(card);
    });
  }

  /**
   * 出图主流程。由共享的 #generate-btn（生图模式）与「用这个提示词出图」共用。
   * 尺寸与张数都从生图面板的下拉框读取，因此调用前必须先切到生图模式。
   */
  function runImagine(prompt, emptyHint) {
    if (busy || drawing) return;
    if (!prompt) { showNotice(emptyHint || t.errNoImagineInput); return; }

    hideNotice();
    drawing = true;
    syncMode();
    var size = $("size-select").value;
    var count = parseInt($("count-select").value, 10) || 1;

    $("image-wrap").style.display = "block";
    $("image-grid").innerHTML = '<div class="image-loading">' + t.imagining + "</div>";

    fetch("/api/imagine", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: prompt, size: size, count: count }),
    })
      .then(readJson)
      .then(function (r) {
        // 响应不是 JSON：多为服务端/边缘异常，如实报出状态码便于定位
        if (!r.data) {
          lastResult = null;
          renderImages(null);
          syncMode();
          showNotice(t.errBadResponse.replace("{status}", r.status));
          return;
        }
        if (!r.data.ok) {
          lastResult = null;
          renderImages(null);
          syncMode(); // hasImages() 已变 false，交给 syncMode 收起图片区
          showNotice(messageForError(r.data, t.errImagine));
          return;
        }
        lastResult = { images: r.data.images || [], downloads: r.data.downloads || [], size: r.data.size };
        renderImages(lastResult);
        syncMode();
        $("image-wrap").scrollIntoView({ behavior: "smooth", block: "nearest" });
      })
      .catch(function () {
        lastResult = null;
        renderImages(null);
        syncMode();
        showNotice(noticeForNetworkFailure());
      })
      .finally(function () {
        drawing = false;
        syncMode();
      });
  }

  /* 「用这个提示词出图」：切到生图标签 → 回填提示词 → 自动出图。
     按钮文案本身承诺了出图，所以不要求用户再点一次。 */
  $("to-imagine-btn").addEventListener("click", function () {
    if (busy || drawing) return;
    if (!currentPrompt) { showNotice(t.errNoPrompt); return; }
    switchMode("imagine");
    $("imagine-input").value = currentPrompt;
    var guessed = detectSize(currentPrompt);
    if (guessed) $("size-select").value = guessed;
    runImagine(currentPrompt, t.errNoImagineInput);
  });

  /* ---------- 历史（localStorage） ---------- */
  var HKEY = "ipg_history";
  function getHistory() {
    try { return JSON.parse(localStorage.getItem(HKEY)) || []; }
    catch (e) { return []; }
  }
  function saveHistory(list) {
    try { localStorage.setItem(HKEY, JSON.stringify(list.slice(0, 20))); } catch (e) { /* 隐私模式忽略 */ }
  }
  function addHistory(mode, target, prompt) {
    var list = getHistory();
    list.unshift({
      mode: mode, target: target, prompt: prompt,
      time: new Date().toLocaleString(),
    });
    saveHistory(list);
    renderHistory();
  }
  function renderHistory() {
    var list = getHistory();
    var box = $("history-list");
    box.innerHTML = "";
    if (!list.length) {
      box.innerHTML = '<div class="empty-hint">' + t.historyEmpty + "</div>";
      return;
    }
    list.forEach(function (item) {
      var div = document.createElement("div");
      div.className = "history-item";
      var meta = document.createElement("span");
      meta.className = "meta";
      // 图标用 SVG 而非 emoji：🖼（U+1F5BC）本身没有 emoji 变体，Windows 下
      // 会被字体回退成黑白轮廓甚至豆腐块，且与相邻文字基线不对齐。
      meta.innerHTML = item.mode === "image" ? ICON_IMAGE_CHIP : ICON_TEXT_CHIP;
      var label = item.target ? (t.targets[item.target] || item.target) : "";
      meta.appendChild(document.createTextNode((label ? label + " · " : "") + item.time));
      var p = document.createElement("p");
      p.textContent = item.prompt;
      // 生图模式下，点历史条目即回填到生图输入框——历史里存的就是提示词，
      // 复用它们出图是最自然的用法，省去手动复制粘贴。
      var reusable = mode === "imagine";
      p.title = reusable ? t.toImagine : item.prompt;
      p.style.cursor = reusable ? "pointer" : "default";
      p.addEventListener("click", function () {
        if (mode !== "imagine") return;
        $("imagine-input").value = item.prompt;
        var guessed = detectSize(item.prompt);
        if (guessed) $("size-select").value = guessed;
        $("imagine-input").scrollIntoView({ behavior: "smooth", block: "center" });
      });
      var btn = document.createElement("button");
      btn.className = "copy-btn";
      btn.textContent = t.copy;
      btn.addEventListener("click", function () { copyText(item.prompt, btn); });
      div.appendChild(meta); div.appendChild(p); div.appendChild(btn);
      box.appendChild(div);
    });
  }
  $("clear-history").addEventListener("click", function () {
    saveHistory([]);
    renderHistory();
  });

  /* ---------- 初始化 ---------- */
  applyLang();
})();
