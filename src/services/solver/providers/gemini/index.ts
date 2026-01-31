/**
 * Gemini Solver Provider Router
 *
 * Routes requests to vendor/type-specific handlers.
 *
 * Required secrets (set via `wrangler secret put`):
 * - GEMINI_API_KEY
 * - GEMINI_BASE_URL
 */

import { jsonResponse, corsPreflightResponse } from '../../../../utils';
import { handleSlider as handleGeetestSlider } from './geetest';

/**
 * Handle requests to Gemini solver.
 * @param request - Incoming request
 * @param env - Environment bindings
 * @param path - Path after /solver/gemini (e.g., "/geetest/slider")
 */
export async function handleGeminiRequest(request: Request, env: Env, path: string): Promise<Response> {
	if (request.method === 'OPTIONS') {
		return corsPreflightResponse();
	}

	if (!env.GEMINI_API_KEY || !env.GEMINI_BASE_URL) {
		return jsonResponse(
			{ success: false, error: 'Gemini provider not configured. Set GEMINI_API_KEY and GEMINI_BASE_URL secrets.' },
			503
		);
	}

	// Parse path: /{vendor}/{type}
	const segments = path.split('/').filter(Boolean);
	const vendor = segments[0];
	const type = segments[1];

	// Route to vendor/type handler
	if (vendor === 'geetest') {
		if (type === 'slider') {
			return handleGeetestSlider(request, env);
		}
		// Future: icon, word
	}

	return jsonResponse(
		{
			success: false,
			error: `Unsupported: vendor=${vendor}, type=${type}`,
			supported: [{ vendor: 'geetest', types: ['slider'] }],
		},
		404
	);
}
