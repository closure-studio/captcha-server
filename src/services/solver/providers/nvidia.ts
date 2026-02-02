/**
 * NVIDIA Solver Provider
 *
 * Uses NVIDIA NIM with Llama 3.2 Vision model for captcha solving.
 * Requires NVIDIA_API_KEY secret.
 */

import type { Solver, CaptchaVendor, CaptchaType, ImageData, PercentPoint } from '../types';
import { parseJsonResponse, validatePercentPoint, validatePercentPoints } from '../utils';
import { DEFAULT_PROMPTS } from '../prompts';

const INVOKE_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';
const MODEL = 'meta/llama-3.2-90b-vision-instruct';

interface NvidiaMessage {
	role: 'user' | 'assistant';
	content: string | Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }>;
}

interface NvidiaRequest {
	model: string;
	messages: NvidiaMessage[];
	max_tokens: number;
	temperature: number;
	top_p: number;
	stream: boolean;
}

interface NvidiaResponse {
	choices: Array<{
		message: {
			content: string;
		};
	}>;
}

/**
 * Call NVIDIA NIM Vision API.
 */
async function callNvidiaVision(
	env: Env,
	prompt: string,
	mimeType: string,
	base64Data: string
): Promise<string> {
	const dataUrl = `data:${mimeType};base64,${base64Data}`;

	const payload: NvidiaRequest = {
		model: MODEL,
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
		temperature: 0.1,
		top_p: 1.0,
		stream: false,
	};

	const response = await fetch(INVOKE_URL, {
		method: 'POST',
		headers: {
			'Authorization': `Bearer ${env.NVIDIA_API_KEY}`,
			'Content-Type': 'application/json',
			'Accept': 'application/json',
		},
		body: JSON.stringify(payload),
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`NVIDIA API error ${response.status}: ${errorText}`);
	}

	const data = (await response.json()) as NvidiaResponse;

	if (!data.choices || data.choices.length === 0) {
		throw new Error('Empty response from NVIDIA API');
	}

	const text = data.choices[0].message.content;
	if (!text) {
		throw new Error('Empty content in NVIDIA API response');
	}

	return text;
}

export const nvidiaSolver: Solver = {
	name: 'nvidia',

	supported: [{ vendor: 'geetest', types: ['slider', 'icon', 'word'] }],

	isConfigured(env: Env): boolean {
		return !!env.NVIDIA_API_KEY;
	},

	async solve(
		env: Env,
		_vendor: CaptchaVendor,
		type: CaptchaType,
		imageData: ImageData
	): Promise<PercentPoint[]> {
		const prompt = DEFAULT_PROMPTS[type];
		const text = await callNvidiaVision(env, prompt, imageData.mimeType, imageData.base64Data);

		const parsed = parseJsonResponse(text);

		if (type === 'slider') {
			// Slider returns a single point
			if (validatePercentPoint(parsed)) {
				return [parsed];
			}
			// Model might return array even for slider
			if (validatePercentPoints(parsed)) {
				return parsed;
			}
			throw new Error(`Invalid response format: ${text}`);
		} else {
			// Icon and word return multiple points
			if (validatePercentPoints(parsed)) {
				return parsed;
			}
			throw new Error(`Invalid response format: ${text}`);
		}
	},
};
