/**
 * Request handlers for Store service
 */

import { jsonResponse, binaryResponse, base64ToArrayBuffer } from '../../utils';
import { validateUploadRequest } from './validation';
import type { FileUploadResult, UploadResponse, ErrorResponse } from './types';

/**
 * Handle file upload (supports multiple files)
 */
export async function handleUpload(request: Request, env: Env): Promise<Response> {
    try {
        const contentType = request.headers.get('Content-Type') || '';

        if (!contentType.includes('application/json')) {
            return jsonResponse(
                { success: false, error: 'Content-Type must be application/json' } as ErrorResponse,
                400
            );
        }

        const data: unknown = await request.json();

        if (!validateUploadRequest(data)) {
            return jsonResponse(
                {
                    success: false,
                    error: 'Invalid request body. Required: { files: [{ path: string, data: string }, ...] }',
                } as ErrorResponse,
                400
            );
        }

        const results: FileUploadResult[] = [];
        let allSuccess = true;

        for (const file of data.files) {
            try {
                // Decode base64 data
                const buffer = base64ToArrayBuffer(file.data);

                // Upload to R2 with the path specified by frontend
                await env.CAPTCHA_BUCKET.put(file.path, buffer);

                results.push({
                    path: file.path,
                    success: true,
                });
            } catch (error) {
                allSuccess = false;
                results.push({
                    path: file.path,
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to upload file',
                });
            }
        }

        return jsonResponse({
            success: allSuccess,
            results,
            message: allSuccess ? 'All files uploaded successfully' : 'Some files failed to upload',
        } as UploadResponse);
    } catch (error) {
        console.error('Upload error:', error);
        return jsonResponse(
            { success: false, error: error instanceof Error ? error.message : 'Internal server error' } as ErrorResponse,
            500
        );
    }
}

/**
 * Handle file retrieval by path
 */
export async function handleGet(path: string, env: Env): Promise<Response> {
    try {
        const object = await env.CAPTCHA_BUCKET.get(path);

        if (!object) {
            return jsonResponse({ success: false, error: 'File not found' } as ErrorResponse, 404);
        }

        return binaryResponse(
            object.body,
            object.httpMetadata?.contentType || 'application/octet-stream'
        );
    } catch (error) {
        console.error('Get error:', error);
        return jsonResponse({ success: false, error: 'Failed to retrieve file' } as ErrorResponse, 500);
    }
}
