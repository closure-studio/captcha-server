/**
 * NVIDIA Solver Provider
 *
 * Uses NVIDIA NIM with Kimi K2.5 model for captcha solving.
 * Requires NVIDIA_API_KEY secret.
 */

import type { Solver, CaptchaVendor, CaptchaType, ImageData, PercentPoint } from '../types';
import { parseJsonResponse, validatePercentPoint, validatePercentPoints } from '../utils';

const INVOKE_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';
const MODEL = 'moonshotai/kimi-k2.5';

/**
 * Kimi K2.5 中文优化 prompts
 * 注意：必须强调使用 0-100 的整数百分比
 */
const NVIDIA_PROMPTS: Record<CaptchaType, string> = {
	slider: `
这是一个滑块验证码图片，包含一个缺口。

请找到拼图缺口的位置，返回：
- x_percent: 缺口左边缘的水平位置，用 0-100 的整数表示（例如 65 表示 65%）
- y_percent: 缺口垂直中心的位置，用 0-100 的整数表示（例如 48 表示 48%）

示例：{"x_percent": 65, "y_percent": 48}

只输出 JSON，不要解释。
`,

	icon: `
这是一个图标点选验证码。

图片底部有一个提示栏，显示需要点击的目标图标，按从左到右的顺序排列。
主图区域中散布着相同的图标。

重要：必须严格按照提示栏从左到右的顺序返回坐标，顺序错误等于失败。

步骤：
1. 先读取提示栏中的图标顺序（从左到右依次是第1个、第2个、第3个...）
2. 在主图中逐个定位：先找第1个图标的中心位置，再找第2个，再找第3个...
3. 按相同顺序返回坐标数组，第一个元素对应提示栏第一个图标

坐标使用 0-100 的整数百分比（例如 40 表示 40%，不要用 0.4）

示例（提示栏从左到右为 A B C）：[A的坐标, B的坐标, C的坐标]
[{"x_percent": 25, "y_percent": 60}, {"x_percent": 70, "y_percent": 45}, {"x_percent": 50, "y_percent": 30}]

只输出 JSON，不要解释。
`,

	word: `
这是一个文字点选验证码。

图片底部有一个提示栏，显示需要点击的汉字，按从左到右的顺序排列。
主图区域中散布着相同的汉字。

重要：必须严格按照提示栏从左到右的顺序返回坐标，顺序错误等于失败。

步骤：
1. 先读取提示栏中的文字顺序（从左到右依次是第1个字、第2个字、第3个字...）
2. 在主图中逐个定位：先找第1个字的中心位置，再找第2个字，再找第3个字...
3. 按相同顺序返回坐标数组，第一个元素对应提示栏第一个字

坐标使用 0-100 的整数百分比（例如 40 表示 40%，不要用 0.4）

示例（提示栏从左到右为"泉水鸡"）：[泉的坐标, 水的坐标, 鸡的坐标]
[{"x_percent": 40, "y_percent": 28}, {"x_percent": 60, "y_percent": 48}, {"x_percent": 16, "y_percent": 72}]

只输出 JSON，不要解释。
`,
};

const SYSTEM_PROMPT = '你是验证码识别助手。分析图片并返回坐标，只输出 JSON 格式，不要任何解释。';

interface NvidiaMessage {
	role: 'user' | 'assistant' | 'system';
	content: string | Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }>;
}

interface NvidiaRequest {
	model: string;
	messages: NvidiaMessage[];
	max_tokens: number;
	temperature: number;
	top_p: number;
	stream: boolean;
	chat_template_kwargs?: { thinking: boolean };
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
 *
 * Per NVIDIA docs:
 * - system/assistant roles only support string content
 * - user role supports object array with image_url type
 */
async function callNvidiaVision(env: Env, prompt: string, mimeType: string, base64Data: string): Promise<string> {
	const dataUrl = `data:${mimeType};base64,${base64Data}`;

	const payload: NvidiaRequest = {
		model: MODEL,
		messages: [
			{
				role: 'system',
				content: SYSTEM_PROMPT,
			},
			{
				role: 'user',
				content: [
					{ type: 'image_url', image_url: { url: dataUrl } },
					{ type: 'text', text: prompt },
				],
			},
		],
		max_tokens: 512,
		temperature: 0.1,
		top_p: 1,
		stream: false,
		chat_template_kwargs: { thinking: false },
	};

	const response = await fetch(INVOKE_URL, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${env.NVIDIA_API_KEY}`,
			'Content-Type': 'application/json',
			Accept: 'application/json',
		},
		body: JSON.stringify(payload),
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`NVIDIA API error ${response.status}: ${errorText}`);
	}

	const data = (await response.json()) as NvidiaResponse;

	if (!data.choices || data.choices.length === 0) {
		throw new Error(`Empty response from NVIDIA API: ${JSON.stringify(data)}`);
	}

	const text = data.choices[0].message.content;
	if (!text) {
		throw new Error(`Empty content in NVIDIA API response: ${JSON.stringify(data)}`);
	}

	return text;
}

export const nvidiaSolver: Solver = {
	name: 'nvidia',

	supported: [{ vendor: 'geetest', types: ['slider', 'icon', 'word'] }],

	isConfigured(env: Env): boolean {
		return !!env.NVIDIA_API_KEY;
	},

	async solve(env: Env, _vendor: CaptchaVendor, type: CaptchaType, imageData: ImageData): Promise<PercentPoint[]> {
		const prompt = NVIDIA_PROMPTS[type];
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
