/**
 * Captcha Service - GeeTest GT3 integration + upstream proxy (preserved)
 *
 * Routes:
 * - GET  /captcha/reqs  - GeeTest GT3 register (returns challenge params)
 * - POST /captcha/resp  - GeeTest GT3 validate (secondary validation)
 */

import { jsonResponse } from '../../utils';

// ==================== GeeTest GT3 ====================

const GT3_ID = 'f23ae14ba3a5bd01d1d65288422dbf97';
const GT3_KEY = '0fcfd8e505bf5d2c94db0bd92adbdaa9';
const GEETEST_API = 'https://api.geetest.com';

/**
 * Compute MD5 hex digest (Cloudflare Workers supports MD5 in SubtleCrypto)
 */
async function md5(input: string): Promise<string> {
	const data = new TextEncoder().encode(input);
	const hash = await crypto.subtle.digest('MD5', data);
	return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * GeeTest GT3 Register - returns challenge params for client-side init
 */
async function gt3Register(): Promise<Response> {
	try {
		const res = await fetch(`${GEETEST_API}/register.php?gt=${GT3_ID}&json_format=1`);
		const result = (await res.json()) as { challenge?: string };

		if (result.challenge && result.challenge.length === 32) {
			const challenge = await md5(result.challenge + GT3_KEY);

			return jsonResponse({ code: 1, data: [{ gt: GT3_ID, challenge, new_captcha: true }] });
		}
	} catch {
		// fall through to offline mode
	}

	// Offline mode
	const bytes = new Uint8Array(16);
	crypto.getRandomValues(bytes);
	const challenge = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
	return jsonResponse({ code: 0, data: { success: 0, gt: GT3_ID, challenge, new_captcha: true }, error: null });
}

/**
 * GeeTest GT3 Validate - secondary server-side validation
 */
async function gt3Validate(body: { geetest_challenge: string; geetest_validate: string; geetest_seccode: string }): Promise<Response> {
	const { geetest_challenge, geetest_validate, geetest_seccode } = body;

	if (!geetest_challenge || !geetest_validate || !geetest_seccode) {
		return jsonResponse(
			{ code: 400, data: null, error: 'Missing required fields: geetest_challenge, geetest_validate, geetest_seccode' },
			400,
		);
	}

	try {
		const params = new URLSearchParams({
			seccode: geetest_seccode,
			json_format: '1',
			challenge: geetest_challenge,
			captchaid: GT3_ID,
			sdk: 'cf-worker',
		});

		const res = await fetch(`${GEETEST_API}/validate.php`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: params.toString(),
		});

		const result = (await res.json()) as { seccode?: string };
		const expected = await md5(geetest_seccode);

		if (result.seccode === expected) {
			return jsonResponse({ code: 0, data: { message: 'Captcha validated' }, error: null });
		}

		return jsonResponse({ code: 403, data: null, error: 'Captcha validation failed' }, 403);
	} catch {
		return jsonResponse({ code: 500, data: null, error: 'Validation request failed' }, 500);
	}
}

// ==================== Old proxy implementation (preserved) ====================

/**
 * Forward a request to the upstream captcha server
 */
async function proxyToUpstream(env: Env, method: string, upstreamPath: string, body?: string | null): Promise<Response> {
	const host = env.CAPTCHA_SERVER_HOST.replace(/\/+$/, '');
	const url = `${host}${upstreamPath}`;

	const headers: Record<string, string> = {
		Authorization: env.CAPTCHA_SERVER_TOKEN,
	};

	if (body) {
		headers['Content-Type'] = 'application/json';
	}

	const response = await fetch(url, {
		method,
		headers,
		body: body ?? undefined,
	});

	const data = await response.json();
	return jsonResponse(data as object, response.status);
}

// ==================== Request handler ====================

/**
 * Handle captcha service requests
 */
export async function handleCaptchaRequest(request: Request, env: Env, path: string): Promise<Response> {
	const method = request.method;

	// GET /captcha/reqs - GeeTest GT3 register
	if (path === '/reqs' && method === 'GET') {
		return gt3Register();

		// --- Old: proxy to upstream ---
		// const url = new URL(request.url);
		// const limit = url.searchParams.get('limit');
		// const query = limit ? `?limit=${limit}` : '';
		// return proxyToUpstream(env, 'GET', `/system/captcha/reqs${query}`);
	}

	// POST /captcha/resp - GeeTest GT3 validate
	if (path === '/resp' && method === 'POST') {
		const body = (await request.json()) as {
			geetest_challenge: string;
			geetest_validate: string;
			geetest_seccode: string;
		};
		return gt3Validate(body);

		// --- Old: proxy to upstream ---
		// const body = await request.text();
		// return proxyToUpstream(env, 'POST', '/system/captcha/resp', body);
	}

	return jsonResponse({ code: 404, data: null, error: 'Not found' }, 404);
}
