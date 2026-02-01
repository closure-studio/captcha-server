/**
 * Shared utilities for Gemini + GeeTest captcha solvers.
 */

import { GoogleGenAI } from '@google/genai';

export const MODEL = 'gemini-3-flash-preview';

/**
 * Parse base64 image input, extracting mimeType and raw base64 data.
 */
export function parseImageInput(image: string): { mimeType: string; base64Data: string } {
	const match = image.match(/^data:([^;]+);base64,(.+)$/);
	if (match) {
		return { mimeType: match[1], base64Data: match[2] };
	}
	return { mimeType: 'image/png', base64Data: image };
}

/**
 * Decode base64 string to ArrayBuffer.
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
	const binaryString = atob(base64);
	const bytes = new Uint8Array(binaryString.length);
	for (let i = 0; i < binaryString.length; i++) {
		bytes[i] = binaryString.charCodeAt(i);
	}
	return bytes.buffer;
}

/**
 * Extract image dimensions from PNG or JPEG binary data.
 */
export function getImageDimensions(buffer: ArrayBuffer): { width: number; height: number } | null {
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
 * Call Gemini vision model with a prompt and image.
 * Returns the raw text response.
 */
export async function callGeminiVision(
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

/**
 * Parse JSON from Gemini response text (strips markdown code fences).
 */
export function parseJsonResponse<T>(text: string): T {
	const cleaned = text.trim().replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
	return JSON.parse(cleaned) as T;
}
