/**
 * Extended environment bindings for Cloudflare Worker.
 *
 * Secrets (set via `wrangler secret put`):
 * - GEMINI_API_KEY: API key for the Gemini service
 * - GEMINI_BASE_URL: Base URL of the Gemini API endpoint
 */

declare global {
	interface Env {
		// Secrets for Gemini provider
		GEMINI_API_KEY: string;
		GEMINI_BASE_URL: string;
	}
}

export {};
