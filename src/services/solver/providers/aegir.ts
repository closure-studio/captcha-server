/**
 * Aegir Solver Provider
 *
 * TODO: Currently returns mock data. Replace with actual Aegir API integration
 * when response format is known.
 */

import type { Solver, CaptchaVendor, CaptchaType, ImageData, PercentPoint } from '../types';

const AEGIR_API = 'http://114.132.98.164:8899';

/**
 * Generate mock slider response
 */
function mockSlider(dimensions: { width: number; height: number }): PercentPoint[] {
	return [{ x_percent: 65, y_percent: 50 }];
}

/**
 * Generate mock icon response
 */
function mockIcon(dimensions: { width: number; height: number }): PercentPoint[] {
	return [
		{ x_percent: 25, y_percent: 55 },
		{ x_percent: 50, y_percent: 65 },
		{ x_percent: 75, y_percent: 50 },
	];
}

/**
 * Generate mock word response
 */
function mockWord(dimensions: { width: number; height: number }): PercentPoint[] {
	return [
		{ x_percent: 20, y_percent: 50 },
		{ x_percent: 40, y_percent: 60 },
		{ x_percent: 60, y_percent: 45 },
		{ x_percent: 80, y_percent: 55 },
	];
}

export const aegirSolver: Solver = {
	name: 'aegir',

	supported: [{ vendor: 'geetest', types: ['slider', 'icon', 'word'] }],

	isConfigured(_env: Env): boolean {
		// Aegir doesn't require configuration (hardcoded endpoint)
		return true;
	},

	async solve(
		_env: Env,
		vendor: CaptchaVendor,
		type: CaptchaType,
		imageData: ImageData
	): Promise<PercentPoint[]> {
		// TODO: Replace with actual Aegir API call when response format is known
		// const response = await fetch(`${AEGIR_API}/${vendor}/${type}`, {
		//     method: 'POST',
		//     headers: { 'Content-Type': 'application/json' },
		//     body: JSON.stringify({ image: imageData.base64Data }),
		// });

		switch (type) {
			case 'slider':
				return mockSlider(imageData.dimensions);
			case 'icon':
				return mockIcon(imageData.dimensions);
			case 'word':
				return mockWord(imageData.dimensions);
			default:
				throw new Error(`Unsupported captcha type: ${type}`);
		}
	},
};
