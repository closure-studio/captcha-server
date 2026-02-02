/**
 * Meta Llama Vision + GeeTest Slider Captcha Solver
 *
 * Uses Cloudflare Workers AI with llama-3.2-11b-vision-instruct
 * to identify the puzzle gap position in a slider CAPTCHA image.
 */

import { jsonResponse } from '../../../../../utils';
import { parseImageInput, base64ToArrayBuffer, getImageDimensions, callMetaVision, parseJsonResponse } from './utils';

const PROMPT = `
Find the puzzle gap in this slider CAPTCHA.

Return the gap's LEFT EDGE position as a percentage of image width.
Return the gap's vertical center as a percentage of image height.

Think step by step:
1. The image width is 100% (left edge = 0%, right edge = 100%)
2. Locate where the gap starts horizontally
3. Express as percentage

Example: If gap starts 65% across from left and centered at 48% from top:
{"x_percent": 65, "y_percent": 48}

Format: {"x_percent": number, "y_percent": number}
Only JSON.
`;

/**
 * Handle POST /solver/meta/geetest/slider
 *
 * Request body: { "image": "base64 or data URL" }
 * Response: { "success": true, "data": [{ "x": number, "y": number }] }
 */
export async function handleSlider(request: Request, env: Env): Promise<Response> {
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

		const result = parseJsonResponse<{ x_percent: number; y_percent: number }>(text);

		if (typeof result.x_percent !== 'number' || typeof result.y_percent !== 'number') {
			throw new Error(`Invalid response format: ${text}`);
		}

		const x = Math.round(width * result.x_percent / 100);
		const y = Math.round(height * result.y_percent / 100);

		return jsonResponse({ success: true, elapsed, data: [{ x, y }] });
	} catch (error) {
		console.error('Meta slider solver error:', error);
		return jsonResponse(
			{ success: false, error: error instanceof Error ? error.message : 'Failed to solve captcha' },
			502
		);
	}
}
