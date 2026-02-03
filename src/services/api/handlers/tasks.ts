/**
 * Task handlers
 */

import { jsonResponse } from '../../../utils';
import {
    validateCreateTaskRequest,
    validateSubmitResultRequest,
} from '../validation';
import {
    listTasksQuery,
    getTaskQuery,
    createTaskStatement,
    updateTaskResultStatement,
    insertRecognitionStatement,
    insertBypassStatement,
    insertAssetStatement,
} from '../queries';
import type { TaskListItem } from '../types';

/**
 * Handle GET /api/tasks - List pending tasks
 */
export async function handleListTasks(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const limitParam = url.searchParams.get('limit');
    const limit = limitParam ? Math.min(parseInt(limitParam, 10) || 10, 100) : 10;

    const result = await listTasksQuery(env.DB, limit).all();

    const tasks: TaskListItem[] = result.results.map((row: Record<string, unknown>) => ({
        taskId: row.task_id as string,
        challenge: row.challenge as string,
        geetestId: row.geetest_id as string | null,
        provider: row.provider as TaskListItem['provider'],
        riskType: row.risk_type as string | null,
        type: row.captcha_type as TaskListItem['type'],
        createdAt: row.created_at as number,
    }));

    return jsonResponse({ success: true, tasks });
}

/**
 * Handle POST /api/tasks - Create a new task
 */
export async function handleCreateTask(request: Request, env: Env): Promise<Response> {
    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return jsonResponse({ success: false, error: 'Invalid JSON body' }, 400);
    }

    if (!validateCreateTaskRequest(body)) {
        return jsonResponse({ success: false, error: 'Invalid request body' }, 400);
    }

    const taskId = `task-${crypto.randomUUID()}`;
    const now = Date.now();

    await createTaskStatement(env.DB, taskId, body, now).run();

    return jsonResponse({
        success: true,
        taskId,
        message: 'Task created',
    }, 201);
}

/**
 * Handle POST /api/tasks/{taskId} - Submit task result
 */
export async function handleSubmitResult(
    request: Request,
    env: Env,
    taskId: string
): Promise<Response> {
    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return jsonResponse({ success: false, error: 'Invalid JSON body' }, 400);
    }

    // Inject taskId from path
    if (body && typeof body === 'object') {
        (body as Record<string, unknown>).taskId = taskId;
    }

    if (!validateSubmitResultRequest(body)) {
        return jsonResponse({ success: false, error: 'Invalid request body' }, 400);
    }

    // Verify task exists
    const existingTask = await getTaskQuery(env.DB, taskId).first();
    if (!existingTask) {
        return jsonResponse({ success: false, error: 'Task not found' }, 404);
    }

    const now = Date.now();
    const statements: D1PreparedStatement[] = [];

    // Update task status and result
    statements.push(updateTaskResultStatement(env.DB, body, now));

    // Insert recognition attempts (support both single and array)
    const recognitions = body.recognitions ?? (body.recognition ? [body.recognition] : []);
    for (const rec of recognitions) {
        statements.push(insertRecognitionStatement(env.DB, taskId, rec, now));
    }

    // Insert bypass attempt
    if (body.bypass) {
        statements.push(insertBypassStatement(env.DB, taskId, body.bypass, now));
    }

    // Insert assets
    if (body.assets) {
        for (const asset of body.assets) {
            statements.push(insertAssetStatement(env.DB, taskId, asset, now));
        }
    }

    // Execute batch
    await env.DB.batch(statements);

    return jsonResponse({ success: true, message: 'Result submitted' });
}
