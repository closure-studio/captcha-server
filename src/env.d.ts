/**
 * Extended environment bindings for Cloudflare Worker.
 *
 * Secrets (set via `wrangler secret put`):
 * - GEMINI_API_KEY: API key for the Gemini service
 * - GEMINI_BASE_URL: Base URL of the Gemini API endpoint
 * - CAPTCHA_SERVER_HOST: Host URL of the upstream captcha server
 * - CAPTCHA_SERVER_TOKEN: Authorization token for the upstream captcha server
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

		// Secrets for upstream captcha server proxy
		CAPTCHA_SERVER_HOST: string;
		CAPTCHA_SERVER_TOKEN: string;

		// Workers AI binding for Meta provider
		AI: Ai;
	}
}

export {};
