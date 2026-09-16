# Image Prompt Guru（提示词大师）

零成本、免登录的「图片 / 文字 → AI 提示词 → 直接出图」工具，并接入了文生图闭环，部署在 Cloudflare Pages 免费层，模型走智谱永久免费档（`glm-4v-flash` 视觉 + `glm-4-flash` 文字 + `cogview-3-flash` 出图，国内直连可用）。

## 功能

三个标签页：**图片转提示词 / 文字转提示词 / 提示词生图**。

1. **图片转提示词**：上传 / 拖拽 / 粘贴截图，或填公网图片链接，输出 Midjourney、Stable Diffusion、DALL·E、Flux 四种格式的提示词。
2. **文字转提示词**：用任意语言描述想法，产出可用的专业提示词。
3. **提示词生图**：粘贴任意提示词，选画面尺寸与张数（1–2 张），用 CogView-3-Flash 出图，支持下载与点击看原图。

三个标签页相互打通：

- 前两个标签生成提示词后，结果区下方出现「🎨 用这个提示词出图」，一键切到生图页并自动出图；
- 生图页里点击历史记录条目，可直接把该条提示词回填到生图输入框；
- 提示词里若含 Midjourney 的 `--ar A:B`，生图时会自动预选最接近的官方尺寸。

## 项目结构

```
image-prompt-guru/
├── public/                  # 静态前端（Pages 根目录）
│   ├── index.html           # 唯一主页面（右上角按钮页内切换中/英文）
│   ├── zh/index.html        # /zh/ 跳转桩 → ../index.html?lang=zh
│   └── assets/              # 样式与逻辑（app.js 内置中英文案，语言偏好存 localStorage）
├── functions/               # Cloudflare Pages Functions（后端 API）
│   ├── _lib/zhipu.js        # 智谱调用 / 限流 / Prompt 模板 / CogView 出图与下载签名
│   └── api/
│       ├── generate.js      # POST /api/generate  图片→提示词（glm-4v-flash）
│       ├── enhance.js       # POST /api/enhance   文字→提示词（glm-4-flash）
│       ├── imagine.js       # POST /api/imagine   提示词→图片（cogview-3-flash）
│       └── img.js           # GET  /api/img       出图结果的同源下载通道（HMAC 签名）
├── wrangler.toml            # Pages 配置（模型名、限额可在 [vars] 改）
├── .dev.vars.example        # 本地开发密钥模板
└── README.md
```

**安全设计**：智谱 API Key 只存在于 Cloudflare 环境变量中，永不下发到浏览器；图片在浏览器端先压缩到 ≤900KB 再上传；KV 限流防止免费额度被刷；出图下载走 HMAC 签名代理，密钥复用 `ZHIPU_API_KEY`，未签名的地址无法被当作开放代理使用。

## 上线步骤（三步，全程免费）

### ① 注册两个免费账号

1. **Cloudflare**：https://dash.cloudflare.com （邮箱注册）
2. **智谱开放平台**：https://open.bigmodel.cn → 实名认证 → 控制台「API Key」→ 创建并复制 API Key

### ② 创建 Pages 项目

1. Cloudflare 控制台 → **Workers & Pages → Create → Pages → Upload assets**（或用 wrangler 部署，见下）
2. 部署成功后得到免费二级域名 `https://<项目名>.pages.dev`

### ③ 配置环境变量与部署

在 Pages 项目 → **Settings → Variables and Secrets** 添加：

| 类型 | 变量名 | 值 | 说明 |
|---|---|---|---|
| Secret | `ZHIPU_API_KEY` | `sk-...` | 智谱 API Key（必填，三个接口共用） |
| Var | `ZHIPU_VISION_MODEL` | `glm-4v-flash` | 视觉模型（已默认，可不配） |
| Var | `ZHIPU_TEXT_MODEL` | `glm-4-flash` | 文字模型（已默认，可不配） |
| Var | `ZHIPU_IMAGE_MODEL` | `cogview-3-flash` | 出图模型（已默认，可不配） |
| Var | `RATE_LIMIT_DAILY` | `30` | 每 IP 每日次数（已默认，可不配；仅约束两个提示词接口） |

> 注意：Direct Upload（拖拽上传资产）方式不带 Functions。**要让 API 生效，需用下面的 wrangler 命令部署**，或把本项目推到 GitHub 后在 Pages 里连接仓库（构建输出目录填 `public`）。

## 本地开发

```bash
cp .dev.vars.example .dev.vars   # 填入智谱 Key
npm install
npx wrangler pages dev           # http://localhost:8788
```

#### wrangler 部署（推荐）

```bash
cd image-prompt-guru
npm install
npx wrangler login            # 浏览器授权 Cloudflare 账号
npx wrangler pages deploy     # 首次会提示输入/创建项目名
```

之后在 Pages 设置里添加 `ZHIPU_API_KEY`（Secret），再重新执行一次 deploy 即可。

### 可选：开启 IP 限流

1. Cloudflare 控制台 → **Storage & Databases → KV → Create namespace**（名字随意）
2. Pages 项目 → **Settings → Bindings → Add → KV namespace**，Variable name 填 `RATE_LIMIT`，选中刚建的命名空间
3. 不绑定时限流自动跳过，网站仍正常，只是不限次数（依赖智谱自身的免费额度上限兜底）

### 画面尺寸

请求里的 `size` 只接受 cogview-3-flash 官方 7 种预设值，非法值自动回落 `1024x1024`：

| 界面标签 | size | 备注 |
|---|---|---|
| 正方形 1:1 | `1024x1024` | 精确 |
| 竖版 3:4 | `864x1152` | 精确 |
| 竖版 9:16 | `768x1344` | 官方最接近的竖屏档位 |
| 横版 4:3 | `1152x864` | 精确 |
| 横版 16:9 | `1344x768` | 官方最接近的宽屏档位 |
| 宽屏 2:1 | `1440x720` | 精确 |
| 长屏 1:2 | `720x1440` | 精确 |

提示词里若含 `--ar A:B`，前端会按对数距离最近邻自动预选对应尺寸（用户仍可手改）；服务端在 `size` 缺省时用同一规则兜底。

