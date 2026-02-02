/**
 * Generic request handler for solver endpoints
 * Handles common request/response logic for all providers
 */

import { jsonResponse, corsPreflightResponse } from '../../utils';
import { parseImage, percentToPixels } from './utils';
import type { Solver, CaptchaVendor, CaptchaType, SolverRequest } from './types';

/**
 * Create a handler function for a solver endpoint
 */
export function createSolverHandler(solver: Solver) {
	return async function handleSolverRequest(
		request: Request,
		env: Env,
		path: string
	): Promise<Response> {
		// Handle CORS preflight
		if (request.method === 'OPTIONS') {
			return corsPreflightResponse();
		}

		// Check provider configuration
		if (!solver.isConfigured(env)) {
			return jsonResponse(
				{ success: false, error: `${solver.name} provider not configured.` },
				503
			);
		}

		// Parse path: /{vendor}/{type}
		const segments = path.split('/').filter(Boolean);
		const vendor = segments[0] as CaptchaVendor;
		const type = segments[1] as CaptchaType;

		// Validate vendor/type combination
		const supportedVendor = solver.supported.find((s) => s.vendor === vendor);
		if (!supportedVendor || !supportedVendor.types.includes(type)) {
			return jsonResponse(
				{
					success: false,
					error: `Unsupported: vendor=${vendor}, type=${type}`,
					supported: solver.supported,
				},
				404
			);
		}

		// Validate request method
		if (request.method !== 'POST') {
			return jsonResponse({ success: false, error: 'Method not allowed. Use POST.' }, 405);
		}

		// Parse request body
		let body: SolverRequest;
		try {
			body = (await request.json()) as SolverRequest;
		} catch {
			return jsonResponse({ success: false, error: 'Invalid JSON body' }, 400);
		}

		// Validate image field
		if (!body.image) {
			return jsonResponse({ success: false, error: 'Missing required field: image' }, 400);
		}

		// Parse image
		const imageData = parseImage(body.image);
		if (!imageData) {
			return jsonResponse(
				{ success: false, error: 'Cannot detect image dimensions. Only PNG and JPEG are supported.' },
				400
			);
		}

		// Solve captcha
		const startTime = Date.now();
		try {
			const percentPoints = await solver.solve(env, vendor, type, imageData);
			const elapsed = Date.now() - startTime;
			const pixelPoints = percentToPixels(percentPoints, imageData.dimensions);

			return jsonResponse({ success: true, elapsed, data: pixelPoints });
		} catch (error) {
			console.error(`${solver.name} solver error:`, error);
			return jsonResponse(
				{ success: false, error: error instanceof Error ? error.message : 'Failed to solve captcha' },
				502
			);
		}
	};
}
