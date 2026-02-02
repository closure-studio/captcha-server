/**
 * Solver Service Type Definitions
 */

/** Supported captcha vendors */
export type CaptchaVendor = 'geetest';

/** Supported captcha types */
export type CaptchaType = 'slider' | 'icon' | 'word';

/** Supported solver providers */
export type SolverProvider = 'aegir' | 'gemini' | 'meta';

/** Point with percentage coordinates (0-100) */
export interface PercentPoint {
	x_percent: number;
	y_percent: number;
}

/** Point with pixel coordinates */
export interface PixelPoint {
	x: number;
	y: number;
}

/** Image dimensions */
export interface ImageDimensions {
	width: number;
	height: number;
}

/** Parsed image data */
export interface ImageData {
	mimeType: string;
	base64Data: string;
	buffer: ArrayBuffer;
	dimensions: ImageDimensions;
}

/** Request body for solver endpoints */
export interface SolverRequest {
	image?: string;
}

/** Successful solver response */
export interface SolverSuccessResponse {
	success: true;
	elapsed: number;
	data: PixelPoint[];
}

/** Failed solver response */
export interface SolverErrorResponse {
	success: false;
	error: string;
}

/** Solver response */
export type SolverResponse = SolverSuccessResponse | SolverErrorResponse;

/**
 * Solver interface - all providers must implement this
 */
export interface Solver {
	/** Provider name */
	readonly name: SolverProvider;

	/** Supported vendor/type combinations */
	readonly supported: { vendor: CaptchaVendor; types: CaptchaType[] }[];

	/**
	 * Check if provider is configured and ready
	 */
	isConfigured(env: Env): boolean;

	/**
	 * Solve a captcha
	 * @param env - Environment bindings
	 * @param vendor - Captcha vendor (e.g., 'geetest')
	 * @param type - Captcha type (e.g., 'slider', 'icon', 'word')
	 * @param imageData - Parsed image data
	 * @returns Array of points as percentages
	 */
	solve(
		env: Env,
		vendor: CaptchaVendor,
		type: CaptchaType,
		imageData: ImageData
	): Promise<PercentPoint[]>;
}
