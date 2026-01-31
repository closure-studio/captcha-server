/**
 * Shared response utilities
 */

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

/**
 * Create a JSON response with proper headers
 */
export function jsonResponse(data: object, status: number = 200): Response {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json',
            ...CORS_HEADERS,
        },
    });
}

/**
 * Handle CORS preflight requests
 */
export function corsPreflightResponse(): Response {
    return new Response(null, {
        status: 204,
        headers: {
            ...CORS_HEADERS,
            'Access-Control-Max-Age': '86400',
        },
    });
}

/**
 * Create a binary response with CORS headers
 */
export function binaryResponse(
    body: ReadableStream | ArrayBuffer | null,
    contentType: string = 'application/octet-stream',
    cacheControl: string = 'public, max-age=3600'
): Response {
    return new Response(body, {
        headers: {
            'Content-Type': contentType,
            'Cache-Control': cacheControl,
            'Access-Control-Allow-Origin': '*',
        },
    });
}
