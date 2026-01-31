/**
 * Gemini + GeeTest Slider Captcha Solver
 *
 * Uses Gemini vision model to identify the puzzle gap position
 * in a slider CAPTCHA image.
 *
 * Required secrets (set via `wrangler secret put`):
 * - GEMINI_API_KEY
 * - GEMINI_BASE_URL
 */

import { GoogleGenAI } from '@google/genai';
import { jsonResponse } from '../../../../../utils';

const MODEL = 'gemini-3-flash-preview';

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
 * Parse base64 image input, extracting mimeType and raw base64 data.
 */
function parseImageInput(image: string): { mimeType: string; base64Data: string } {
	const match = image.match(/^data:([^;]+);base64,(.+)$/);
	if (match) {
		return { mimeType: match[1], base64Data: match[2] };
	}
	return { mimeType: 'image/png', base64Data: image };
}

/**
 * Extract image dimensions from PNG or JPEG binary data.
 */
function getImageDimensions(buffer: ArrayBuffer): { width: number; height: number } | null {
	const view = new DataView(buffer);

	// PNG: signature 0x89504E47, IHDR chunk contains width at offset 16, height at offset 20
	if (buffer.byteLength > 24 && view.getUint32(0) === 0x89504e47) {
		return {
			width: view.getUint32(16),
			height: view.getUint32(20),
		};
	}

	// JPEG: scan for SOF0 (0xFFC0) or SOF2 (0xFFC2) marker
	if (buffer.byteLength > 2 && view.getUint8(0) === 0xff && view.getUint8(1) === 0xd8) {
		let offset = 2;
		while (offset < buffer.byteLength - 9) {
			if (view.getUint8(offset) !== 0xff) {
				offset++;
				continue;
			}
			const marker = view.getUint8(offset + 1);
			if (marker === 0xc0 || marker === 0xc2) {
				return {
					height: view.getUint16(offset + 5),
					width: view.getUint16(offset + 7),
				};
			}
			const segmentLength = view.getUint16(offset + 2);
			offset += 2 + segmentLength;
		}
	}

	return null;
}

/**
 * Decode base64 string to ArrayBuffer.
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
	const binaryString = atob(base64);
	const bytes = new Uint8Array(binaryString.length);
	for (let i = 0; i < binaryString.length; i++) {
		bytes[i] = binaryString.charCodeAt(i);
	}
	return bytes.buffer;
}

/**
 * Handle POST /solver/gemini/geetest/slider
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

	const { mimeType, base64Data } = parseImageInput(body.image);

	// Extract image dimensions
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
						{ text: PROMPT },
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

		const cleaned = text.trim().replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
		const result = JSON.parse(cleaned) as { x_percent: number; y_percent: number };

		if (typeof result.x_percent !== 'number' || typeof result.y_percent !== 'number') {
			throw new Error(`Invalid response format: ${cleaned}`);
		}

		// Convert percentage to pixel coordinates (rounded to integers)
		const x = Math.round(width * result.x_percent / 100);
		const y = Math.round(height * result.y_percent / 100);

		return jsonResponse({ success: true, data: [{ x, y }] });
	} catch (error) {
		console.error('Gemini slider solver error:', error);
		return jsonResponse(
			{ success: false, error: error instanceof Error ? error.message : 'Failed to solve captcha' },
			502
		);
	}
}
