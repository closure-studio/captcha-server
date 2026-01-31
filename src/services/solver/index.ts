/**
 * Solver Service - Captcha bypass proxy router
 *
 * URL Structure: /solver/{provider}/{vendor}/{type}/...
 *
 * Providers:
 * - aegir: Aegir solver API
 * - gemini: (future) Gemini solver API
 *
 * Vendors:
 * - geetest: GeeTest captcha
 * - recaptcha: Google reCAPTCHA
 *
 * Types:
 * - icon: Icon-based captcha
 * - slider: Slider captcha
 * - word: Word/text captcha
 */

import { jsonResponse, corsPreflightResponse } from '../../utils';
import { handleAegirRequest, handleGeminiRequest } from './providers';

/** Available solver providers */
const PROVIDERS = {
    AEGIR: 'aegir',
    GEMINI: 'gemini',
} as const;

/**
 * Route requests to appropriate solver provider
 * @param request - Incoming request
 * @param env - Environment bindings
 * @param path - Path after /solver (e.g., "/aegir/geetest/icon/...")
 */
export async function handleSolverRequest(
    request: Request,
    env: Env,
    path: string
): Promise<Response> {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
        return corsPreflightResponse();
    }

    // Parse provider from path
    // path: /aegir/geetest/icon/... -> provider: aegir, remaining: /geetest/icon/...
    const segments = path.split('/').filter(Boolean);
    const provider = segments[0];
    const remainingPath = '/' + segments.slice(1).join('/');

    // Route to provider
    switch (provider) {
        case PROVIDERS.AEGIR:
            return handleAegirRequest(request, env, remainingPath);

        case PROVIDERS.GEMINI:
            return handleGeminiRequest(request, env, remainingPath);

        default:
            return jsonResponse(
                {
                    success: false,
                    error: `Unknown solver provider: ${provider}`,
                    availableProviders: Object.values(PROVIDERS),
                },
                404
            );
    }
}

export * from './types';
