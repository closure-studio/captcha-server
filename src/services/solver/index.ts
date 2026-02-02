/**
 * Solver Service - Captcha solving router
 *
 * URL Structure: /solver/{provider}/{vendor}/{type}
 *
 * Providers:
 * - aegir: Aegir solver API (mock)
 * - gemini: Google Gemini vision model
 * - cloudflare: Cloudflare Workers AI (Llama Vision)
 *
 * Vendors:
 * - geetest: GeeTest captcha
 *
 * Types:
 * - slider: Slider captcha
 * - icon: Icon-based captcha
 * - word: Word/text captcha
 */

import { jsonResponse, corsPreflightResponse } from '../../utils';
import { getHandler, providerNames } from './providers';
import type { SolverProvider } from './types';

/**
 * Route requests to appropriate solver provider
 * @param request - Incoming request
 * @param env - Environment bindings
 * @param path - Path after /solver (e.g., "/aegir/geetest/slider")
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
	const segments = path.split('/').filter(Boolean);
	const provider = segments[0] as SolverProvider;
	const remainingPath = '/' + segments.slice(1).join('/');

	// Get handler for provider
	const handler = getHandler(provider);
	if (!handler) {
		return jsonResponse(
			{
				success: false,
				error: `Unknown solver provider: ${provider}`,
				availableProviders: providerNames,
			},
			404
		);
	}

	return handler(request, env, remainingPath);
}

export * from './types';
