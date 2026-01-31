/**
 * Validation utilities for Store service
 */

import type { FileUploadItem, UploadRequest } from './types';

/**
 * Validate a single file item
 */
export function validateFileItem(item: unknown): item is FileUploadItem {
    if (!item || typeof item !== 'object') {
        return false;
    }
    const file = item as Record<string, unknown>;
    if (typeof file.path !== 'string' || file.path.trim() === '') {
        return false;
    }
    if (typeof file.data !== 'string' || file.data.trim() === '') {
        return false;
    }
    return true;
}

/**
 * Validate the upload request
 */
export function validateUploadRequest(data: unknown): data is UploadRequest {
    if (!data || typeof data !== 'object') {
        return false;
    }
    const req = data as Record<string, unknown>;
    if (!Array.isArray(req.files) || req.files.length === 0) {
        return false;
    }
    return req.files.every(validateFileItem);
}
