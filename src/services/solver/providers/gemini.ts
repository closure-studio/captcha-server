/**
 * Gemini Solver Provider
 *
 * Uses Google Gemini vision model for captcha solving.
 * Requires GEMINI_API_KEY and GEMINI_BASE_URL secrets.
 */

import { GoogleGenAI } from '@google/genai';
import type { Solver, CaptchaVendor, CaptchaType, ImageData, PercentPoint } from '../types';
import { parseJsonResponse, validatePercentPoint, validatePercentPoints } from '../utils';
import { DEFAULT_PROMPTS } from '../prompts';

const MODEL = 'gemini-2.5-flash';

/**
 * Call Gemini vision model with a prompt and image.
 */
async function callGeminiVision(
	env: Env,
	prompt: string,
	mimeType: string,
	base64Data: string
): Promise<string> {
	const ai = new GoogleGenAI({
		apiKey: env.GEMINI_API_KEY,
		httpOptions: {
			baseUrl: env.GEMINI_BASE_URL,
		},
	});

	const response = await ai.models.generateContent({
		model: MODEL,
		contents: [
			{
				role: 'user',
				parts: [
					{ text: prompt },
					{ inlineData: { mimeType, data: base64Data } },
				],
			},
		],
		config: {
			temperature: 0.1,
		},
	});

	const text = response.text;
	if (!text) {
		throw new Error('Empty response from Gemini API');
	}

	return text;
}

export const geminiSolver: Solver = {
	name: 'gemini',

	supported: [{ vendor: 'geetest', types: ['slider', 'icon', 'word'] }],

	isConfigured(env: Env): boolean {
		return !!(env.GEMINI_API_KEY && env.GEMINI_BASE_URL);
	},

	async solve(
		env: Env,
		_vendor: CaptchaVendor,
		type: CaptchaType,
		imageData: ImageData
	): Promise<PercentPoint[]> {
		const prompt = DEFAULT_PROMPTS[type];
		const text = await callGeminiVision(env, prompt, imageData.mimeType, imageData.base64Data);

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
