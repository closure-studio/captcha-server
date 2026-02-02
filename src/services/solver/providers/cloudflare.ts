/**
 * Cloudflare Workers AI Vision Solver Provider
 *
 * Uses Cloudflare Workers AI with llama-3.2-11b-vision-instruct model.
 * Requires AI binding in wrangler.jsonc.
 */

import type { Solver, CaptchaVendor, CaptchaType, ImageData, PercentPoint } from '../types';
import { parseJsonResponse, validatePercentPoint, validatePercentPoints } from '../utils';
import { DEFAULT_PROMPTS } from '../prompts';

const MODEL = '@cf/meta/llama-3.2-11b-vision-instruct';

/**
 * Call Llama Vision model via Cloudflare Workers AI.
 *
 * Uses messages format with image_url content type (data URL).
 * HTTP URLs are not supported, only base64 data URLs.
 *
 * @see https://developers.cloudflare.com/workers-ai/models/llama-3.2-11b-vision-instruct/
 */
async function callVision(
	env: Env,
	prompt: string,
	mimeType: string,
	base64Data: string
): Promise<string> {
	const dataUrl = `data:${mimeType};base64,${base64Data}`;

	const response = await env.AI.run(MODEL, {
		messages: [
			{
				role: 'user',
				content: [
					{ type: 'text', text: prompt },
					{ type: 'image_url', image_url: { url: dataUrl } },
				],
			},
		],
		max_tokens: 512,
	});

	const text = typeof response === 'object' && 'response' in response
		? (response as { response: string }).response
		: null;

	if (!text) {
		throw new Error('Empty response from Workers AI');
	}

	return text;
}

export const cloudflareSolver: Solver = {
	name: 'cloudflare',

	supported: [{ vendor: 'geetest', types: ['slider', 'icon', 'word'] }],

	isConfigured(env: Env): boolean {
		return !!env.AI;
	},

	async solve(
		env: Env,
		_vendor: CaptchaVendor,
		type: CaptchaType,
		imageData: ImageData
	): Promise<PercentPoint[]> {
		const prompt = DEFAULT_PROMPTS[type];
		const text = await callVision(env, prompt, imageData.mimeType, imageData.base64Data);

		if (type === 'slider') {
			// Slider returns a single point
			const result = parseJsonResponse<PercentPoint>(text);
			if (!validatePercentPoint(result)) {
				throw new Error(`Invalid response format: ${text}`);
			}
			return [result];
		} else {
			// Icon and word return multiple points
			const results = parseJsonResponse<PercentPoint[]>(text);
			if (!validatePercentPoints(results)) {
				throw new Error(`Invalid response format: ${text}`);
			}
			return results;
		}
	},
};
