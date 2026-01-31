/**
 * Encoding utilities
 */

/**
 * Decode base64 data to ArrayBuffer
 * Supports data URL format (data:mime/type;base64,...)
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
    // Remove data URL prefix if present (supports any mime type)
    const base64Data = base64.replace(/^data:[^;]+;base64,/, '');
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}
