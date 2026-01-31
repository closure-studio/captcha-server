/**
 * Types for the Store service (R2 file storage)
 */

/** Single file upload item */
export interface FileUploadItem {
    /** Storage path (determined by frontend) */
    path: string;
    /** Base64 encoded file data */
    data: string;
}

/** Upload request supporting multiple files */
export interface UploadRequest {
    /** Array of files to upload */
    files: FileUploadItem[];
}

/** Result for a single file upload */
export interface FileUploadResult {
    path: string;
    success: boolean;
    error?: string;
}

/** Upload response */
export interface UploadResponse {
    success: boolean;
    results: FileUploadResult[];
    message?: string;
}

/** Error response */
export interface ErrorResponse {
    success: false;
    error: string;
}
