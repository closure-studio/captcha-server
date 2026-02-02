/**
 * Cloudflare Workers AI Vision Solver Provider
 *
 * Uses Cloudflare Workers AI with llama-3.2-11b-vision-instruct model.
 * Requires AI binding in wrangler.jsonc.
 */

import type { Solver, CaptchaVendor, CaptchaType, ImageData, PercentPoint } from '../types';
import { parseJsonResponse, validatePercentPoint, validatePercentPoints } from '../utils';
import { DEFAULT_PROMPTS } from '../prompts';

const MODEL = '@cf/meta/llama-4-scout-17b-16e-instruct';

/**
 * Call Llama Vision model via Cloudflare Workers AI.
 *
 * Uses messages format with image_url content type (data URL).
 * HTTP URLs are not supported, only base64 data URLs.
 *
 * @see https://developers.cloudflare.com/workers-ai/models/llama-3.2-11b-vision-instruct/
 */
async function callVision(env: Env, prompt: string, mimeType: string, base64Data: string): Promise<unknown> {
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
	});

	// Response format: { response: string | object, tool_calls: [], usage: {...} }
	if (typeof response === 'object' && response !== null && 'response' in response) {
		return (response as { response: unknown }).response;
	}

	throw new Error(`Unexpected response format from Workers AI: ${JSON.stringify(response)}`);
}

export const cloudflareSolver: Solver = {
	name: 'cloudflare',

	supported: [{ vendor: 'geetest', types: ['slider', 'icon', 'word'] }],

	isConfigured(env: Env): boolean {
		return !!env.AI;
	},

	async solve(env: Env, _vendor: CaptchaVendor, type: CaptchaType, imageData: ImageData): Promise<PercentPoint[]> {
		const prompt = DEFAULT_PROMPTS[type];
		const result = await callVision(env, prompt, imageData.mimeType, imageData.base64Data);

		// Response can be either a string (needs parsing) or already parsed object
		let parsed: unknown;
		if (typeof result === 'string') {
			parsed = parseJsonResponse(result);
		} else {
			parsed = result;
		}

		if (type === 'slider') {
			// Slider returns a single point
			if (validatePercentPoint(parsed)) {
				return [parsed];
			}
			// Model might return array even for slider
			if (validatePercentPoints(parsed)) {
				return parsed;
			}
			throw new Error(`Invalid response format: ${JSON.stringify(parsed)}`);
		} else {
			// Icon and word return multiple points
			if (validatePercentPoints(parsed)) {
				return parsed;
			}
			throw new Error(`Invalid response format: ${JSON.stringify(parsed)}`);
		}
	},
};
