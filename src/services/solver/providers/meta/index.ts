/**
 * Meta Llama Vision Solver Provider Router
 *
 * Routes requests to vendor/type-specific handlers.
 * Uses Cloudflare Workers AI with llama-3.2-11b-vision-instruct model.
 *
 * Required binding in wrangler.jsonc:
 * - AI binding for Workers AI
 */

import { jsonResponse, corsPreflightResponse } from '../../../../utils';
import { handleSlider as handleGeetestSlider, handleIcon as handleGeetestIcon } from './geetest';

/**
 * Handle requests to Meta solver.
 * @param request - Incoming request
 * @param env - Environment bindings
 * @param path - Path after /solver/meta (e.g., "/geetest/slider")
 */
export async function handleMetaRequest(request: Request, env: Env, path: string): Promise<Response> {
	if (request.method === 'OPTIONS') {
		return corsPreflightResponse();
	}

	if (!env.AI) {
		return jsonResponse(
			{ success: false, error: 'Meta provider not configured. Add AI binding to wrangler.jsonc.' },
			503
		);
	}

	// Parse path: /{vendor}/{type}
	const segments = path.split('/').filter(Boolean);
	const vendor = segments[0];
	const type = segments[1];

	// Route to vendor/type handler
	if (vendor === 'geetest') {
		switch (type) {
			case 'slider':
				return handleGeetestSlider(request, env);
			case 'icon':
				return handleGeetestIcon(request, env);
		}
	}

	return jsonResponse(
		{
			success: false,
			error: `Unsupported: vendor=${vendor}, type=${type}`,
			supported: [{ vendor: 'geetest', types: ['slider', 'icon'] }],
		},
		404
	);
}
