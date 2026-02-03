# 验证码系统后端 API 及数据库设计文档

## 一、项目背景

本系统是一个验证码自动解决平台，前端负责加载验证码 SDK、截图识别、模拟操作。后端负责任务分发、结果收集、数据持久化和统计分析。

数据库使用 **Cloudflare D1**，后端建议使用 **Cloudflare Workers**。

---

## 二、数据库设计

### 2.1 `captcha_tasks` - 任务主表

存储每个验证码任务的完整生命周期数据。

```sql
CREATE TABLE captcha_tasks (
  task_id TEXT PRIMARY KEY,           -- 服务器分配的任务ID（唯一主键）

  -- 验证码信息
  captcha_type TEXT,                  -- 验证码类型: slide / word / icon
  provider TEXT NOT NULL,             -- 验证码提供商: geetest_v4 / geetest_v3
  geetest_id TEXT,                    -- GeeTest 分配的 captcha ID
  challenge TEXT NOT NULL,            -- GeeTest challenge 值
  risk_type TEXT,                     -- 风控类型

  -- 任务结果状态
  status TEXT NOT NULL,               -- success / failed / timeout / error

  -- GeeTest 验证通过后返回的凭证
  lot_number TEXT,
  captcha_output TEXT,
  pass_token TEXT,
  gen_time TEXT,
  error_message TEXT,                 -- 失败时的错误信息

  -- 时间追踪
  created_at INTEGER NOT NULL,        -- 任务创建时间 (Unix 毫秒时间戳)
  started_at INTEGER,                 -- 前端开始处理时间
  completed_at INTEGER,               -- 完成时间
  duration_ms INTEGER                 -- 总耗时（毫秒）
);
```

| 字段 | 说明 |
|------|------|
| `task_id` | 主键，服务器生成，全局唯一 |
| `captcha_type` | 前端根据 GeeTest 返回的 riskType 判定，可能值: `slide`(滑块), `word`(文字点选), `icon`(图标点选) |
| `provider` | 目前支持 `geetest_v4` 和 `geetest_v3` |
| `status` | 最终状态，由前端提交结果时确定 |
| `lot_number` / `captcha_output` / `pass_token` / `gen_time` | GeeTest 验证成功后返回的四个凭证字段，只有 status=success 时才有值 |

---

### 2.2 `recognition_attempts` - 识别尝试记录

记录每次调用识别 API 的详情。一个 task 可能有多次识别尝试（重试场景）。

```sql
CREATE TABLE recognition_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id TEXT NOT NULL REFERENCES captcha_tasks(task_id),

  -- 识别器信息
  recognizer_name TEXT NOT NULL,      -- 识别服务名称
  attempt_seq INTEGER NOT NULL DEFAULT 1, -- 尝试序号（第几次尝试）

  -- 识别结果
  success INTEGER NOT NULL,           -- 是否成功: 0=失败, 1=成功
  captcha_id TEXT,                    -- 识别服务返回的 ID（用于报错反馈）
  points_json TEXT,                   -- 识别坐标 JSON, 格式: [{"x":123,"y":456}]
  message TEXT,                       -- 识别服务返回的消息
  elapsed_ms INTEGER,                 -- 识别 API 请求耗时（毫秒）

  -- 错误反馈
  error_reported INTEGER DEFAULT 0,   -- 是否已向识别服务报错: 0=否, 1=是

  created_at INTEGER NOT NULL         -- 记录创建时间 (Unix 毫秒时间戳)
);
```

`recognizer_name` 可能的值:

| 值 | 说明 |
|-----|------|
| `TTShitu` | TTShitu OCR 服务，支持滑块和点选 |
| `Gemini` | Google Gemini AI 服务 |
| `Aegir` | Aegir 服务，支持文字/图标点选 |
| `Cloudflare` | Cloudflare AI 识别 |
| `Nvidia` | Nvidia AI 识别 |

---

### 2.3 `bypass_attempts` - Bypass 执行记录

记录模拟操作（滑动/点击）的执行详情。

```sql
CREATE TABLE bypass_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id TEXT NOT NULL REFERENCES captcha_tasks(task_id),
  recognition_attempt_id INTEGER REFERENCES recognition_attempts(id),

  -- 执行信息
  bypass_type TEXT NOT NULL,          -- 类型: slide / click
  config_json TEXT,                   -- 执行配置参数 (JSON)

  -- 执行结果
  success INTEGER NOT NULL,           -- 是否成功: 0=失败, 1=成功
  message TEXT,                       -- 结果消息

  -- 执行详情（可选）
  target_x INTEGER,                   -- 滑动目标 X 坐标或点击参考坐标
  actual_steps INTEGER,               -- 实际执行步数（仅滑动类型）

  created_at INTEGER NOT NULL         -- 记录创建时间 (Unix 毫秒时间戳)
);
```

`config_json` 示例:

```json
// slide 类型
{
  "xOffset": -10,
  "slideSteps": 30,
  "stepDelay": { "min": 15, "max": 25 }
}

// click 类型
{
  "delay": { "min": 400, "max": 600 }
}
```

---

### 2.4 `captcha_assets` - 图片资产记录

记录存储在 Cloudflare R2 中的截图文件引用（图片本身存 R2，数据库只存路径）。

```sql
CREATE TABLE captcha_assets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id TEXT NOT NULL REFERENCES captcha_tasks(task_id),

  asset_type TEXT NOT NULL,           -- 资产类型
  r2_key TEXT NOT NULL,               -- R2 存储路径
  file_size INTEGER,                  -- 文件大小（字节）
  width INTEGER,                      -- 图片宽度（像素）
  height INTEGER,                     -- 图片高度（像素）

  created_at INTEGER NOT NULL         -- 记录创建时间 (Unix 毫秒时间戳)
);
```

`asset_type` 可能的值:

| 值 | 说明 |
|----|------|
| `original` | 原始验证码截图 |
| `cropped` | 裁剪后的图片（如 Gemini 识别器会裁剪上下区域） |
| `marked` | 标注了识别坐标的图片 |
| `background` | 背景图（部分识别方式需要） |

`r2_key` 格式: `captchas/{provider}/{type}/{taskId}/{asset_type}.png`

---

### 2.5 索引

```sql
-- 任务表
CREATE INDEX idx_tasks_status ON captcha_tasks(status);
CREATE INDEX idx_tasks_type_status ON captcha_tasks(captcha_type, status);
CREATE INDEX idx_tasks_created ON captcha_tasks(created_at);

-- 识别记录
CREATE INDEX idx_recog_task ON recognition_attempts(task_id);
CREATE INDEX idx_recog_recognizer ON recognition_attempts(recognizer_name, success);

-- Bypass 记录
CREATE INDEX idx_bypass_task ON bypass_attempts(task_id);

-- 资产记录
CREATE INDEX idx_assets_task ON captcha_assets(task_id);
```

---

## 三、API 接口设计

Base URL: `{WORKER_URL}/api`

### 3.1 获取待处理任务

前端轮询此接口获取新任务。

```
GET /api/tasks
```

**Response:**

```json
{
  "success": true,
  "tasks": [
    {
      "taskId": "task-abc-123",
      "challenge": "122ca1ba-0101-4b26-9842-63c0a1424cc2",
      "geetestId": "54088bb07d2df3c46b79f80300b0abbe",
      "provider": "geetest_v4",
      "riskType": "word",
      "type": "word",
      "createdAt": 1706832000000
    }
  ]
}
```

**数据库操作:** 从 `captcha_tasks` 查询 `status = 'pending'` 的任务，按 `created_at` 升序返回。

---

### 3.2 提交验证结果

前端完成验证码求解后调用。

```
POST /api/tasks/{taskId}/result
```

**Request Body:**

```json
{
  "taskId": "task-abc-123",
  "status": "success",
  "result": {
    "lot_number": "xxx",
    "captcha_output": "xxx",
    "pass_token": "xxx",
    "gen_time": "xxx"
  },
  "duration": 5230,
  "recognition": {
    "recognizerName": "Gemini",
    "attemptSeq": 1,
    "success": true,
    "captchaId": "recog-id-456",
    "points": [{"x": 123, "y": 456}],
    "message": "识别成功",
    "elapsedMs": 1200,
    "errorReported": false
  },
  "bypass": {
    "bypassType": "click",
    "success": true,
    "message": "点击完成",
    "configJson": "{\"delay\":{\"min\":400,\"max\":600}}"
  },
  "assets": [
    {
      "assetType": "original",
      "r2Key": "captchas/geetest_v4/word/task-abc-123/original.png",
      "fileSize": 45678,
      "width": 344,
      "height": 384
    }
  ]
}
```

**字段说明:**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `taskId` | string | Y | 任务ID |
| `status` | string | Y | `success` / `failed` / `timeout` / `error` |
| `result` | object | N | GeeTest 验证成功凭证，仅 status=success 时有 |
| `duration` | number | N | 总耗时（毫秒） |
| `errorMessage` | string | N | 错误信息，status 非 success 时 |
| `recognition` | object | N | 识别记录 |
| `bypass` | object | N | Bypass 执行记录 |
| `assets` | array | N | 图片资产列表 |

**数据库操作（事务）:**

```
1. UPDATE captcha_tasks SET status, result 字段, completed_at, duration_ms
2. INSERT INTO recognition_attempts (如有 recognition 数据)
3. INSERT INTO bypass_attempts (如有 bypass 数据)
4. INSERT INTO captcha_assets (如有 assets 数据)
```

D1 支持 batch 写入，建议用 `db.batch()` 保证原子性。

**Response:**

```json
{
  "success": true,
  "message": "Result submitted"
}
```

---

### 3.3 批量提交识别记录（可选）

支持一个 task 多次重试时批量上报。

```
POST /api/tasks/{taskId}/recognitions
```

**Request Body:**

```json
{
  "attempts": [
    {
      "recognizerName": "TTShitu",
      "attemptSeq": 1,
      "success": false,
      "captchaId": "id-1",
      "points": [],
      "message": "识别失败",
      "elapsedMs": 800,
      "errorReported": true
    },
    {
      "recognizerName": "Gemini",
      "attemptSeq": 2,
      "success": true,
      "captchaId": "id-2",
      "points": [{"x": 120, "y": 300}],
      "message": "识别成功",
      "elapsedMs": 1500,
      "errorReported": false
    }
  ]
}
```

---

### 3.4 统计接口

#### 3.4.1 总览统计

```
GET /api/stats/overview?from={timestamp}&to={timestamp}
```

**Response:**

```json
{
  "total": 1000,
  "success": 720,
  "failed": 200,
  "timeout": 60,
  "error": 20,
  "successRate": 72.0,
  "avgDurationMs": 4500
}
```

**SQL:**

```sql
SELECT
  COUNT(*) as total,
  SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success,
  SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
  SUM(CASE WHEN status = 'timeout' THEN 1 ELSE 0 END) as timeout,
  SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as error,
  ROUND(100.0 * SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate,
  ROUND(AVG(duration_ms)) as avg_duration_ms
FROM captcha_tasks
WHERE created_at >= ?1 AND created_at <= ?2;
```

#### 3.4.2 按验证码类型统计

```
GET /api/stats/by-type?from={timestamp}&to={timestamp}
```

**Response:**

```json
[
  { "captchaType": "slide", "total": 500, "success": 400, "successRate": 80.0, "avgDurationMs": 3200 },
  { "captchaType": "word",  "total": 300, "success": 200, "successRate": 66.7, "avgDurationMs": 5100 },
  { "captchaType": "icon",  "total": 200, "success": 120, "successRate": 60.0, "avgDurationMs": 5800 }
]
```

#### 3.4.3 按识别器统计

```
GET /api/stats/by-recognizer?from={timestamp}&to={timestamp}
```

**Response:**

```json
[
  { "recognizerName": "Gemini",  "total": 400, "success": 320, "successRate": 80.0, "avgElapsedMs": 1500 },
  { "recognizerName": "TTShitu", "total": 350, "success": 250, "successRate": 71.4, "avgElapsedMs": 900 },
  { "recognizerName": "Aegir",   "total": 250, "success": 150, "successRate": 60.0, "avgElapsedMs": 1100 }
]
```

**SQL:**

```sql
SELECT
  recognizer_name,
  COUNT(*) as total,
  SUM(success) as success,
  ROUND(100.0 * SUM(success) / COUNT(*), 2) as success_rate,
  ROUND(AVG(elapsed_ms)) as avg_elapsed_ms
FROM recognition_attempts
WHERE created_at >= ?1 AND created_at <= ?2
GROUP BY recognizer_name;
```

#### 3.4.4 时间趋势

```
GET /api/stats/trend?from={timestamp}&to={timestamp}&interval=hour
```

`interval`: `hour` / `day`

**Response:**

```json
[
  { "time": "2025-02-01 10:00", "total": 50, "success": 38, "successRate": 76.0 },
  { "time": "2025-02-01 11:00", "total": 45, "success": 35, "successRate": 77.8 }
]
```

---

## 四、任务生命周期

```
                    前端                                   后端 (Worker + D1)
                     │                                          │
                     │  GET /api/tasks                          │
                     │ ────────────────────────────────────────> │
                     │                                          │  查询 status='pending'
                     │  <──────────────────────────────────────  │
                     │  返回任务列表                              │
                     │                                          │
                     │  加载 GeeTest SDK                         │
                     │  截图 → 调用识别 API                      │
                     │  模拟滑动/点击                             │
                     │  等待 GeeTest 验证回调                    │
                     │                                          │
                     │  POST /api/tasks/{taskId}/result          │
                     │ ────────────────────────────────────────> │
                     │                                          │  batch 写入:
                     │                                          │   - UPDATE captcha_tasks
                     │                                          │   - INSERT recognition_attempts
                     │                                          │   - INSERT bypass_attempts
                     │                                          │   - INSERT captcha_assets
                     │  <──────────────────────────────────────  │
                     │  { success: true }                        │
```

---

## 五、D1 注意事项

1. **事务**: 使用 `db.batch([stmt1, stmt2, ...])` 保证写入原子性
2. **行大小限制**: D1 单行最大 5MB，points_json 和 config_json 不会超限
3. **读写限制**: D1 免费版 5M 读/天、100K 写/天，注意统计接口加缓存
4. **时间戳**: 全部使用 Unix 毫秒时间戳 (JavaScript `Date.now()`)，统计查询时用 `datetime()` 函数转换
5. **迁移**: 建议使用 Wrangler 的 `wrangler d1 migrations` 管理 schema 变更

---

## 六、建表完整 SQL

可直接用 `wrangler d1 execute` 执行:

```sql
-- 任务主表
CREATE TABLE IF NOT EXISTS captcha_tasks (
  task_id TEXT PRIMARY KEY,
  captcha_type TEXT,
  provider TEXT NOT NULL,
  geetest_id TEXT,
  challenge TEXT NOT NULL,
  risk_type TEXT,
  status TEXT NOT NULL,
  lot_number TEXT,
  captcha_output TEXT,
  pass_token TEXT,
  gen_time TEXT,
  error_message TEXT,
  created_at INTEGER NOT NULL,
  started_at INTEGER,
  completed_at INTEGER,
  duration_ms INTEGER
);

-- 识别尝试记录
CREATE TABLE IF NOT EXISTS recognition_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id TEXT NOT NULL REFERENCES captcha_tasks(task_id),
  recognizer_name TEXT NOT NULL,
  attempt_seq INTEGER NOT NULL DEFAULT 1,
  success INTEGER NOT NULL,
  captcha_id TEXT,
  points_json TEXT,
  message TEXT,
  elapsed_ms INTEGER,
  error_reported INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL
);

-- Bypass 执行记录
CREATE TABLE IF NOT EXISTS bypass_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id TEXT NOT NULL REFERENCES captcha_tasks(task_id),
  recognition_attempt_id INTEGER REFERENCES recognition_attempts(id),
  bypass_type TEXT NOT NULL,
  config_json TEXT,
  success INTEGER NOT NULL,
  message TEXT,
  target_x INTEGER,
  actual_steps INTEGER,
  created_at INTEGER NOT NULL
);

-- 图片资产记录
CREATE TABLE IF NOT EXISTS captcha_assets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id TEXT NOT NULL REFERENCES captcha_tasks(task_id),
  asset_type TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  file_size INTEGER,
  width INTEGER,
  height INTEGER,
  created_at INTEGER NOT NULL
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_tasks_status ON captcha_tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_type_status ON captcha_tasks(captcha_type, status);
CREATE INDEX IF NOT EXISTS idx_tasks_created ON captcha_tasks(created_at);
CREATE INDEX IF NOT EXISTS idx_recog_task ON recognition_attempts(task_id);
CREATE INDEX IF NOT EXISTS idx_recog_recognizer ON recognition_attempts(recognizer_name, success);
CREATE INDEX IF NOT EXISTS idx_bypass_task ON bypass_attempts(task_id);
CREATE INDEX IF NOT EXISTS idx_assets_task ON captcha_assets(task_id);
```
