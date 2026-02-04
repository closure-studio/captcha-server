/**
 * Captcha Proxy Service - Forwards requests to upstream captcha server
 *
 * Routes:
 * - GET  /captcha/reqs?limit={limit}  - Get pending captcha requests
 * - POST /captcha/resp                - Submit captcha result
 */

import { jsonResponse } from '../../utils';

/**
 * Forward a request to the upstream captcha server
 */
async function proxyToUpstream(
	env: Env,
	method: string,
	upstreamPath: string,
	body?: string | null,
): Promise<Response> {
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

/**
 * Handle captcha proxy service requests
 */
export async function handleCaptchaRequest(
	request: Request,
	env: Env,
	path: string,
): Promise<Response> {
	const method = request.method;
	const url = new URL(request.url);

	// GET /captcha/reqs - Get pending captcha requests
	if (path === '/reqs' && method === 'GET') {
		const limit = url.searchParams.get('limit');
		const query = limit ? `?limit=${limit}` : '';
		return proxyToUpstream(env, 'GET', `/system/captcha/reqs${query}`);
	}

	// POST /captcha/resp - Submit captcha result
	if (path === '/resp' && method === 'POST') {
		const body = await request.text();
		return proxyToUpstream(env, 'POST', '/system/captcha/resp', body);
	}

	return jsonResponse({ success: false, error: 'Not found' }, 404);
}
