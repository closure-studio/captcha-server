/**
 * Shared utilities for captcha solvers
 */

import type { ImageData, ImageDimensions, PercentPoint, PixelPoint } from './types';

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
 * Convert base64 string to Uint8Array.
 */
export function base64ToUint8Array(base64: string): Uint8Array {
	const binaryString = atob(base64);
	const bytes = new Uint8Array(binaryString.length);
	for (let i = 0; i < binaryString.length; i++) {
		bytes[i] = binaryString.charCodeAt(i);
	}
	return bytes;
}

/**
 * Extract image dimensions from PNG or JPEG binary data.
 */
export function getImageDimensions(buffer: ArrayBuffer): ImageDimensions | null {
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
 * Parse complete image from base64 string.
 * Returns null if image dimensions cannot be detected.
 */
export function parseImage(image: string): ImageData | null {
	const { mimeType, base64Data } = parseImageInput(image);
	const buffer = base64ToArrayBuffer(base64Data);
	const dimensions = getImageDimensions(buffer);

	if (!dimensions) {
		return null;
	}

	return { mimeType, base64Data, buffer, dimensions };
}

/**
 * Convert percentage points to pixel points.
 */
export function percentToPixels(points: PercentPoint[], dimensions: ImageDimensions): PixelPoint[] {
	return points.map((p) => ({
		x: Math.round(dimensions.width * p.x_percent / 100),
		y: Math.round(dimensions.height * p.y_percent / 100),
	}));
}

/**
 * Parse JSON from model response text (strips markdown code fences).
 */
export function parseJsonResponse<T>(text: string): T {
	const cleaned = text.trim().replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
	return JSON.parse(cleaned) as T;
}

/**
 * Validate that a value is an array of PercentPoints.
 */
export function validatePercentPoints(value: unknown): value is PercentPoint[] {
	if (!Array.isArray(value) || value.length === 0) {
		return false;
	}
	return value.every(
		(item) =>
			typeof item === 'object' &&
			item !== null &&
			typeof (item as PercentPoint).x_percent === 'number' &&
			typeof (item as PercentPoint).y_percent === 'number'
	);
}

/**
 * Validate that a value is a single PercentPoint.
 */
export function validatePercentPoint(value: unknown): value is PercentPoint {
	return (
		typeof value === 'object' &&
		value !== null &&
		typeof (value as PercentPoint).x_percent === 'number' &&
		typeof (value as PercentPoint).y_percent === 'number'
	);
}
