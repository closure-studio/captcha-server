/**
 * API Service - Task management and statistics
 *
 * Routes:
 * - GET  /api/tasks           - List pending tasks
 * - POST /api/tasks           - Create a new task
 * - POST /api/tasks/{taskId}  - Submit task result (atomic batch write)
 * - GET  /api/stats           - Unified statistics (view=overview|by-type|by-recognizer|trend)
 */

import { jsonResponse } from '../../utils';
import {
    handleListTasks,
    handleCreateTask,
    handleSubmitResult,
    handleStats,
} from './handlers';

/**
 * Handle API service requests
 */
export async function handleApiRequest(
    request: Request,
    env: Env,
    path: string
): Promise<Response> {
    const method = request.method;

    // GET /api/tasks - List pending tasks
    if (path === '/tasks' && method === 'GET') {
        return handleListTasks(request, env);
    }

    // POST /api/tasks - Create new task
    if (path === '/tasks' && method === 'POST') {
        return handleCreateTask(request, env);
    }

    // POST /api/tasks/{taskId} - Submit result
    const taskResultMatch = path.match(/^\/tasks\/([^/]+)$/);
    if (taskResultMatch && method === 'POST') {
        const taskId = taskResultMatch[1];
        return handleSubmitResult(request, env, taskId);
    }

    // GET /api/stats - Unified statistics
    if (path === '/stats' && method === 'GET') {
        return handleStats(request, env);
    }

    return jsonResponse({ success: false, error: 'Not found' }, 404);
}
