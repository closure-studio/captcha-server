/**
 * Meta Llama Vision + GeeTest Icon Click Captcha Solver
 *
 * The image contains a hint bar at the top showing target icons/objects,
 * and the same icons scattered across the main image area below.
 * The user must click each target icon in the correct order as shown in the hint.
 *
 * Uses Cloudflare Workers AI with llama-3.2-11b-vision-instruct.
 * Returns an ordered array of {x, y} coordinates to click.
 */

import { jsonResponse } from '../../../../../utils';
import { parseImageInput, base64ToArrayBuffer, getImageDimensions, callMetaVision, parseJsonResponse } from './utils';

const PROMPT = `
You are solving a GeeTest icon-click CAPTCHA.

The image has a hint bar at the top (or bottom) showing target icons/objects in a specific order.
Those same icons appear scattered across the main image area.

Your task:
1. Identify the target icons from the hint bar (left to right).
2. Locate each target icon's CENTER position in the main image area.
3. Return their positions IN THE SAME ORDER as the hint, as percentages of image width and height.

Return a JSON array of objects, one per icon, in order:
[{"x_percent": number, "y_percent": number}, ...]

Example for 3 icons:
[{"x_percent": 25, "y_percent": 60}, {"x_percent": 70, "y_percent": 45}, {"x_percent": 50, "y_percent": 80}]

Only JSON. No explanation.
`;

/**
 * Handle POST /solver/meta/geetest/icon
 *
 * Request body: { "image": "base64 or data URL" }
 * Response: { "success": true, "data": [{ "x": number, "y": number }, ...] }
 */
export async function handleIcon(request: Request, env: Env): Promise<Response> {
	if (request.method !== 'POST') {
		return jsonResponse({ success: false, error: 'Method not allowed. Use POST.' }, 405);
	}

	let body: { image?: string };
	try {
		body = (await request.json()) as { image?: string };
	} catch {
		return jsonResponse({ success: false, error: 'Invalid JSON body' }, 400);
	}

	if (!body.image) {
		return jsonResponse({ success: false, error: 'Missing required field: image' }, 400);
	}

	const startTime = Date.now();
	const { base64Data } = parseImageInput(body.image);

	const buffer = base64ToArrayBuffer(base64Data);
	const dimensions = getImageDimensions(buffer);
	if (!dimensions) {
		return jsonResponse(
			{ success: false, error: 'Cannot detect image dimensions. Only PNG and JPEG are supported.' },
			400
		);
	}

	const { width, height } = dimensions;

	try {
		const text = await callMetaVision(env, PROMPT, base64Data);
		const elapsed = Date.now() - startTime;

		const results = parseJsonResponse<Array<{ x_percent: number; y_percent: number }>>(text);

		if (!Array.isArray(results) || results.length === 0) {
			throw new Error(`Invalid response format: ${text}`);
		}

		for (const item of results) {
			if (typeof item.x_percent !== 'number' || typeof item.y_percent !== 'number') {
				throw new Error(`Invalid point in response: ${JSON.stringify(item)}`);
			}
		}

		const data = results.map((r) => ({
			x: Math.round(width * r.x_percent / 100),
			y: Math.round(height * r.y_percent / 100),
		}));

		return jsonResponse({ success: true, elapsed, data });
	} catch (error) {
		console.error('Meta icon solver error:', error);
		return jsonResponse(
			{ success: false, error: error instanceof Error ? error.message : 'Failed to solve captcha' },
			502
		);
	}
}
