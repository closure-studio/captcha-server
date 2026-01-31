# Captcha Server

Cloudflare Worker 统一服务，整合文件存储和验证码解决方案代理。

## Base URL

```
https://captcha-server.<your-subdomain>.workers.dev
```

---

## API 概览

| 服务 | 路径 | 说明 |
|------|------|------|
| Health | `GET /` | 健康检查 |
| Store | `/store/*` | R2 文件存储 |
| Solver | `/solver/{provider}/{vendor}/{type}/*` | 验证码解决方案代理 |

---

## Health Check

检查服务状态。

```
GET /
GET /health
```

**Response:**

```json
{
  "status": "healthy",
  "service": "captcha-server",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "availableServices": ["/store", "/solver"]
}
```

---

## Store Service

文件存储服务，使用 Cloudflare R2。

### 上传文件

```
POST /store/upload
Content-Type: application/json
```

**Request Body:**

```json
{
  "files": [
    {
      "path": "geetest/icon/abc123.png",
      "data": "data:image/png;base64,iVBORw0KGgo..."
    },
    {
      "path": "geetest/slider/def456.png",
      "data": "iVBORw0KGgo..."
    }
  ]
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `files` | array | 文件数组 |
| `files[].path` | string | 存储路径（由前端决定） |
| `files[].data` | string | Base64 编码的文件数据，支持 Data URL 格式 |

**Response (Success):**

```json
{
  "success": true,
  "results": [
    { "path": "geetest/icon/abc123.png", "success": true },
    { "path": "geetest/slider/def456.png", "success": true }
  ],
  "message": "All files uploaded successfully"
}
```

**Response (Partial Failure):**

```json
{
  "success": false,
  "results": [
    { "path": "geetest/icon/abc123.png", "success": true },
    { "path": "geetest/slider/def456.png", "success": false, "error": "Failed to upload file" }
  ],
  "message": "Some files failed to upload"
}
```

### 获取文件

```
GET /store/{path}
```

**Example:**

```
GET /store/geetest/icon/abc123.png
```

**Response:**

- 成功: 返回文件二进制内容
- 失败:
  ```json
  { "success": false, "error": "File not found" }
  ```

---

## Solver Service

验证码解决方案代理服务。

### URL 结构

```
/solver/{provider}/{vendor}/{type}/{endpoint}
```

| 参数 | 说明 | 示例 |
|------|------|------|
| `provider` | 解决方案提供商 | `aegir`, `gemini` |
| `vendor` | 验证码厂商 | `geetest`, `recaptcha` |
| `type` | 验证码类型 | `icon`, `slider`, `word` |
| `endpoint` | 具体 API 端点 | 由 provider 决定 |

### Aegir Provider

代理请求到 Aegir API。

**支持的方法:** `GET`, `POST`, `PUT`, `DELETE`

**URL 映射:**

```
/solver/aegir/geetest/icon/...  ->  http://aegir-api/geetest/icon/...
/solver/aegir/geetest/slider/...  ->  http://aegir-api/geetest/slider/...
```

**Example:**

```bash
# POST 请求
curl -X POST https://your-worker.workers.dev/solver/aegir/geetest/icon \
  -H "Content-Type: application/json" \
  -d '{"image": "base64...", "question": "..."}'

# GET 请求（带 query string）
curl "https://your-worker.workers.dev/solver/aegir/geetest/slider?task_id=xxx"
```

**Response:**

响应直接透传自 Aegir API，格式由 Aegir API 定义。

**Error Response (无法连接后端):**

```json
{
  "success": false,
  "error": "Failed to reach Aegir API"
}
```

---

## 错误响应

所有 API 的错误响应格式统一：

```json
{
  "success": false,
  "error": "Error message"
}
```

| HTTP Status | 说明 |
|-------------|------|
| 400 | 请求参数错误 |
| 404 | 资源不存在 |
| 405 | 方法不允许 |
| 500 | 服务器内部错误 |
| 502 | 后端服务不可用 |

---

## CORS

所有 API 均支持 CORS，允许任意来源跨域访问。

**Headers:**

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

---

## 代码示例

### JavaScript/TypeScript

```typescript
// 上传文件
async function uploadFiles(files: { path: string; data: string }[]) {
  const response = await fetch('https://your-worker.workers.dev/store/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ files }),
  });
  return response.json();
}

// 调用 solver
async function solveCaptcha(vendor: string, type: string, payload: object) {
  const response = await fetch(
    `https://your-worker.workers.dev/solver/aegir/${vendor}/${type}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }
  );
  return response.json();
}
```

### cURL

```bash
# 健康检查
curl https://your-worker.workers.dev/health

# 上传文件
curl -X POST https://your-worker.workers.dev/store/upload \
  -H "Content-Type: application/json" \
  -d '{"files":[{"path":"test/image.png","data":"iVBORw0KGgo..."}]}'

# 获取文件
curl https://your-worker.workers.dev/store/test/image.png -o image.png

# 调用 Aegir solver
curl -X POST https://your-worker.workers.dev/solver/aegir/geetest/icon \
  -H "Content-Type: application/json" \
  -d '{"image":"base64..."}'
```

---

## 开发

```bash
# 安装依赖
npm install

# 本地开发
npm run dev

# 部署
npm run deploy

# 类型生成
npm run cf-typegen
```
