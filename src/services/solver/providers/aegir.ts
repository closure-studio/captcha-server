/**
 * Aegir Solver Provider
 *
 * Proxies requests to the Aegir captcha solving API
 */

import { corsPreflightResponse } from '../../../utils';

const AEGIR_API = 'http://114.132.98.164:8899';

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/**
 * Handle requests to Aegir solver
 * @param request - Incoming request
 * @param env - Environment bindings
 * @param path - Path after /solver/aegir (e.g., "/geetest/icon/...")
 */
export async function handleAegirRequest(
    request: Request,
    env: Env,
    path: string
): Promise<Response> {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
        return corsPreflightResponse();
    }

    const startTime = Date.now();
    const url = new URL(request.url);
    const targetUrl = AEGIR_API + path + url.search;

    try {
        // Forward request to Aegir API
        const response = await fetch(targetUrl, {
            method: request.method,
            headers: {
                'Content-Type': 'application/json;charset=UTF-8',
                'User-Agent': request.headers.get('User-Agent') || '',
            },
            body: request.method !== 'GET' ? await request.text() : undefined,
        });
        const elapsed = Date.now() - startTime;

        // Parse original response and inject elapsed time
        const contentType = response.headers.get('Content-Type') || '';
        if (contentType.includes('application/json')) {
            const originalData = await response.json() as Record<string, unknown>;
            const newData = { ...originalData, elapsed };
            return new Response(JSON.stringify(newData), {
                status: response.status,
                statusText: response.statusText,
                headers: {
                    'Content-Type': 'application/json',
                    ...CORS_HEADERS,
                },
            });
        }

        // For non-JSON responses, return as-is
        return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: {
                ...Object.fromEntries(response.headers),
                ...CORS_HEADERS,
            },
        });
    } catch (error) {
        console.error('Aegir proxy error:', error);
        return new Response(
            JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to reach Aegir API',
            }),
            {
                status: 502,
                headers: {
                    'Content-Type': 'application/json',
                    ...CORS_HEADERS,
                },
            }
        );
    }
}
