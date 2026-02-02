/**
 * Extended environment bindings for Cloudflare Worker.
 *
 * Secrets (set via `wrangler secret put`):
 * - GEMINI_API_KEY: API key for the Gemini service
 * - GEMINI_BASE_URL: Base URL of the Gemini API endpoint
 *
 * Bindings (configured in wrangler.jsonc):
 * - AI: Cloudflare Workers AI binding
 */

declare global {
	interface Env {
		// Secrets for Gemini provider
		GEMINI_API_KEY: string;
		GEMINI_BASE_URL: string;

		// Secret for NVIDIA provider
		NVIDIA_API_KEY: string;

		// Workers AI binding for Meta provider
		AI: Ai;
	}
}

export {};
