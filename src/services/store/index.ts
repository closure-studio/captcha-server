/**
 * Store Service - R2 file storage API
 *
 * Routes (relative to service mount point):
 * - POST /upload - Upload files
 * - GET /* - Retrieve files by path
 */

import { jsonResponse, corsPreflightResponse } from '../../utils';
import { handleUpload, handleGet } from './handlers';

/**
 * Route requests within the Store service
 * @param request - Incoming request
 * @param env - Environment bindings
 * @param path - Path relative to the service mount point (e.g., "/upload" or "/some/file.png")
 */
export async function handleStoreRequest(
    request: Request,
    env: Env,
    path: string
): Promise<Response> {
    const method = request.method;

    // Handle CORS preflight
    if (method === 'OPTIONS') {
        return corsPreflightResponse();
    }

    // Upload files
    if (path === '/upload') {
        if (method === 'POST') {
            return handleUpload(request, env);
        }
        return jsonResponse({ success: false, error: 'Method not allowed. Use POST for upload.' }, 405);
    }

    // Get file by path (any path after root)
    if (path.length > 1 && method === 'GET') {
        // Remove leading slash to get the storage path
        const storagePath = path.substring(1);
        return handleGet(storagePath, env);
    }

    return jsonResponse({ success: false, error: 'Not found' }, 404);
}

export * from './types';
