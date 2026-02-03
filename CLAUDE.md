# CLAUDE.md - Captcha Server

## 项目概述

这是一个 Cloudflare Worker 项目，提供验证码相关的统一服务接口，包含三个核心服务：

1. **Store Service** - 基于 R2 的文件存储服务
2. **Solver Service** - 验证码解决方案代理服务
3. **API Service** - 基于 D1 的任务管理和统计服务

## 技术栈

- **运行时**: Cloudflare Workers (V8 引擎)
- **语言**: TypeScript (ES2024)
- **存储**: Cloudflare R2, D1 (SQLite)
- **构建工具**: Wrangler
- **测试**: Vitest + @cloudflare/vitest-pool-workers

## 目录结构

```
src/
├── index.ts                 # 主入口，路由分发
├── env.d.ts                 # 环境变量类型扩展 (secrets)
├── services/
│   ├── index.ts             # 服务导出
│   ├── store/               # R2 文件存储服务
│   │   ├── index.ts         # Store 路由处理
│   │   ├── handlers.ts      # 上传/获取处理器
│   │   ├── types.ts         # 类型定义
│   │   └── validation.ts    # 输入验证
│   ├── solver/              # 验证码解决代理服务
│   │   ├── index.ts         # Solver 路由
│   │   ├── types.ts         # 类型定义
│   │   └── providers/       # Provider 实现
│   │       ├── index.ts
│   │       ├── aegir.ts     # Aegir provider (代理)
│   │       └── gemini/      # Gemini provider (视觉模型)
│   │           ├── index.ts # Gemini 路由
│   │           └── geetest/ # GeeTest 验证码
│   │               ├── index.ts
│   │               └── slider.ts  # 滑块验证码
│   └── api/                 # D1 任务管理服务
│       ├── index.ts         # API 路由处理
│       ├── types.ts         # 类型定义
│       ├── validation.ts    # 输入验证
│       ├── handlers/        # 请求处理器
│       │   ├── index.ts
│       │   ├── tasks.ts     # 任务 CRUD
│       │   └── stats.ts     # 统计查询
│       └── queries/         # SQL 查询构建
│           ├── index.ts
│           ├── tasks.ts
│           └── stats.ts
└── utils/
    ├── index.ts
    ├── response.ts          # HTTP 响应工具
    └── encoding.ts          # Base64 编码工具
```

## API 路由

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/`, `/health` | 健康检查 |
| POST | `/store/upload` | 批量上传文件到 R2 |
| GET | `/store/{path}` | 从 R2 获取文件 |
| ALL | `/solver/{provider}/{vendor}/{type}/*` | 代理验证码解决请求 |
| GET | `/api/tasks` | 获取待处理任务列表 |
| POST | `/api/tasks` | 创建新任务 |
| POST | `/api/tasks/{taskId}` | 提交任务结果 (原子批量写入) |
| GET | `/api/stats` | 统计查询 (view=overview\|by-type\|by-recognizer\|trend) |

## 开发命令

```bash
npm run dev      # 本地开发服务器
npm run deploy   # 部署到 Cloudflare
npm run test     # 运行测试
npm run cf-typegen  # 生成 Worker 类型定义
```

## Cloudflare 绑定

在 `wrangler.jsonc` 中配置:

- **R2 Bucket**: `CAPTCHA_BUCKET` → `captcha-store`
- **D1 Database**: `DB` → `captcha-db`

## Secrets (敏感配置)

通过 `wrangler secret put` 设置，不要提交到代码仓库：

```bash
wrangler secret put GEMINI_API_KEY    # Gemini API 密钥
wrangler secret put GEMINI_BASE_URL   # Gemini API 基础 URL
```

类型定义在 `src/env.d.ts` 中声明。

## 核心模式

### 请求处理模式

所有服务遵循统一的处理器签名：
```typescript
function handle{Service}Request(
  request: Request,
  env: Env,
  path: string
): Promise<Response>
```

### Provider 模式 (Solver)

Solver 服务使用可插拔的 Provider 模式：
- `aegir` - 代理到 Aegir 验证码解决 API
- `gemini` - 使用 Gemini 视觉模型解决滑块验证码

#### Gemini Provider API

**POST** `/solver/gemini/geetest/slider`

请求体：
```json
{
  "image": "base64编码的图片或data URL"
}
```

响应：
```json
{
  "success": true,
  "data": [{ "x": 195, "y": 96 }]
}
```

支持的图片格式：PNG、JPEG。会自动从图片二进制数据解析宽高。

### API Service

任务管理服务使用 D1 数据库存储任务、识别记录、Bypass 记录和资产信息。

#### 创建任务

**POST** `/api/tasks`

```json
{
  "challenge": "122ca1ba-0101-4b26-9842-63c0a1424cc2",
  "provider": "geetest_v4",
  "geetestId": "54088bb07d2df3c46b79f80300b0abbe",
  "captchaType": "word",
  "riskType": "word"
}
```

#### 提交结果

**POST** `/api/tasks/{taskId}`

支持单次识别 (`recognition`) 或多次重试 (`recognitions` 数组)，使用 `db.batch()` 原子写入。

```json
{
  "status": "success",
  "result": { "lot_number": "...", "captcha_output": "...", "pass_token": "...", "gen_time": "..." },
  "duration": 5230,
  "recognition": { "recognizerName": "Gemini", "success": true, "points": [{"x": 123, "y": 456}] },
  "bypass": { "bypassType": "click", "success": true },
  "assets": [{ "assetType": "original", "r2Key": "captchas/.../original.png" }]
}
```

#### 统计查询

**GET** `/api/stats?view={view}&from={timestamp}&to={timestamp}&interval={interval}`

- `view=overview` - 总览统计 (总数、成功率、平均耗时)
- `view=by-type` - 按验证码类型分组
- `view=by-recognizer` - 按识别器分组
- `view=trend` - 时间趋势 (interval=hour|day)

### 验证模式

Store 服务使用类型守卫进行输入验证：
```typescript
validateUploadRequest(data)  // 验证上传请求
validateFileItem(item)       // 验证单个文件项
```

## 添加新服务

1. 在 `src/services/` 下创建新目录
2. 实现 `handle{Service}Request` 函数
3. 在 `src/services/index.ts` 导出
4. 在 `src/index.ts` 添加路由分发

## 添加新 Solver Provider

1. 在 `src/services/solver/providers/{provider}/` 创建目录
2. 按 `{vendor}/{type}.ts` 结构组织处理器
3. 在 `providers/{provider}/index.ts` 实现路由
4. 在 `src/services/solver/providers/index.ts` 导出
5. 在 `src/services/solver/index.ts` 添加 provider 路由

## 部署

通过 GitHub Actions 自动部署：
- 推送到 `master` 分支触发部署
- 需要设置 secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`

## 关键文件说明

| 文件 | 作用 |
|------|------|
| `src/index.ts` | Worker 入口，统一路由分发，CORS 处理 |
| `src/env.d.ts` | 环境变量类型扩展 (secrets) |
| `src/services/store/handlers.ts` | 文件上传到 R2 和从 R2 获取的核心逻辑 |
| `src/services/solver/providers/aegir.ts` | Aegir 验证码服务代理实现 |
| `src/services/solver/providers/gemini/geetest/slider.ts` | Gemini 滑块验证码解决器 |
| `src/services/api/index.ts` | API 服务路由处理 |
| `src/services/api/handlers/tasks.ts` | 任务 CRUD 处理器 |
| `src/services/api/handlers/stats.ts` | 统计查询处理器 |
| `src/services/api/queries/*.ts` | D1 SQL 查询构建 |
| `src/utils/response.ts` | HTTP 响应辅助函数 (JSON/Binary/CORS) |
| `src/utils/encoding.ts` | Base64/Data URL 解码 |

## 注意事项

- 当前 CORS 配置为完全开放 (`*`)
- Aegir API 端点硬编码在 provider 中
- 无认证/授权机制
- 无速率限制
