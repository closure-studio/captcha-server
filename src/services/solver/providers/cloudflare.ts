/**
 * Meta Llama Vision Solver Provider
 *
 * Uses Cloudflare Workers AI with llama-3.2-11b-vision-instruct model.
 * Requires AI binding in wrangler.jsonc.
 */

import type { Solver, CaptchaVendor, CaptchaType, ImageData, PercentPoint } from '../types';
import { base64ToUint8Array, parseJsonResponse, validatePercentPoint, validatePercentPoints } from '../utils';
import { DEFAULT_PROMPTS } from '../prompts';

const MODEL = '@cf/meta/llama-3.2-11b-vision-instruct';

/**
 * Call Meta Llama Vision model via Cloudflare Workers AI.
 */
async function callMetaVision(
	env: Env,
	prompt: string,
	base64Data: string
): Promise<string> {
	const response = await env.AI.run(MODEL, {
		messages: [
			{
				role: 'user',
				content: [
					{ type: 'text', text: prompt },
					{ type: 'image', image: base64ToUint8Array(base64Data) },
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
		const text = await callMetaVision(env, prompt, imageData.base64Data);

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
