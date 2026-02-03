/**
 * Task-related database queries
 */

import type {
    CreateTaskRequest,
    SubmitResultRequest,
    RecognitionData,
    BypassData,
    AssetData,
} from '../types';

/**
 * Query to list pending tasks
 */
export function listTasksQuery(db: D1Database, limit: number) {
    return db
        .prepare(
            `SELECT task_id, challenge, geetest_id, provider, risk_type, captcha_type, created_at
             FROM captcha_tasks
             WHERE status = 'pending'
             ORDER BY created_at ASC
             LIMIT ?`
        )
        .bind(limit);
}

/**
 * Query to get a task by ID
 */
export function getTaskQuery(db: D1Database, taskId: string) {
    return db.prepare(`SELECT * FROM captcha_tasks WHERE task_id = ?`).bind(taskId);
}

/**
 * Statement to create a new task
 */
export function createTaskStatement(db: D1Database, taskId: string, req: CreateTaskRequest, now: number) {
    return db
        .prepare(
            `INSERT INTO captcha_tasks (task_id, challenge, provider, geetest_id, captcha_type, risk_type, status, created_at)
             VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`
        )
        .bind(
            taskId,
            req.challenge,
            req.provider,
            req.geetestId ?? null,
            req.captchaType ?? null,
            req.riskType ?? null,
            now
        );
}

/**
 * Statement to update task with result
 */
export function updateTaskResultStatement(db: D1Database, req: SubmitResultRequest, now: number) {
    const result = req.result;
    return db
        .prepare(
            `UPDATE captcha_tasks
             SET status = ?,
                 lot_number = ?,
                 captcha_output = ?,
                 pass_token = ?,
                 gen_time = ?,
                 error_message = ?,
                 completed_at = ?,
                 duration_ms = ?
             WHERE task_id = ?`
        )
        .bind(
            req.status,
            result?.lot_number ?? null,
            result?.captcha_output ?? null,
            result?.pass_token ?? null,
            result?.gen_time ?? null,
            req.errorMessage ?? null,
            now,
            req.duration ?? null,
            req.taskId
        );
}

/**
 * Statement to insert recognition attempt
 */
export function insertRecognitionStatement(
    db: D1Database,
    taskId: string,
    rec: RecognitionData,
    now: number
) {
    return db
        .prepare(
            `INSERT INTO recognition_attempts
             (task_id, recognizer_name, attempt_seq, success, captcha_id, points_json, message, elapsed_ms, error_reported, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
            taskId,
            rec.recognizerName,
            rec.attemptSeq ?? 1,
            rec.success ? 1 : 0,
            rec.captchaId ?? null,
            rec.points ? JSON.stringify(rec.points) : null,
            rec.message ?? null,
            rec.elapsedMs ?? null,
            rec.errorReported ? 1 : 0,
            now
        );
}

/**
 * Statement to insert bypass attempt
 */
export function insertBypassStatement(
    db: D1Database,
    taskId: string,
    bypass: BypassData,
    now: number
) {
    return db
        .prepare(
            `INSERT INTO bypass_attempts
             (task_id, bypass_type, config_json, success, message, target_x, actual_steps, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
            taskId,
            bypass.bypassType,
            bypass.configJson ?? null,
            bypass.success ? 1 : 0,
            bypass.message ?? null,
            bypass.targetX ?? null,
            bypass.actualSteps ?? null,
            now
        );
}

/**
 * Statement to insert asset record
 */
export function insertAssetStatement(
    db: D1Database,
    taskId: string,
    asset: AssetData,
    now: number
) {
    return db
        .prepare(
            `INSERT INTO captcha_assets
             (task_id, asset_type, r2_key, file_size, width, height, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
            taskId,
            asset.assetType,
            asset.r2Key,
            asset.fileSize ?? null,
            asset.width ?? null,
            asset.height ?? null,
            now
        );
}
