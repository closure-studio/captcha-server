-- Migration: 0001_init
-- Description: Initialize captcha database schema

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
