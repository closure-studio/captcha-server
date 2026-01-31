/**
 * Captcha Server - Unified Cloudflare Worker
 *
 * This worker consolidates multiple services under a single deployment:
 *
 * Routes:
 * - /store/*                              - R2 file storage service
 * - /solver/{provider}/{vendor}/{type}/*  - Captcha solver proxy
 * - /                                     - Health check
 *
 * Example solver URLs:
 * - /solver/aegir/geetest/icon
 * - /solver/aegir/geetest/slider
 * - /solver/gemini/recaptcha/word
 *
 * Add new services by:
 * 1. Creating a new service module in src/services/
 * 2. Adding a route prefix in this router
 */

import { jsonResponse, corsPreflightResponse } from './utils';
import { handleStoreRequest, handleSolverRequest } from './services';

/**
 * Service route configuration
 */
const SERVICE_ROUTES = {
    STORE: '/store',
    SOLVER: '/solver',
} as const;

/**
 * Main router - dispatches requests to appropriate services
 */
export default {
    async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
        const url = new URL(request.url);
        const pathname = url.pathname;
        const method = request.method;

        // Handle CORS preflight at root level
        if (method === 'OPTIONS') {
            return corsPreflightResponse();
        }

        // Health check endpoint
        if (pathname === '/' || pathname === '/health') {
            return jsonResponse({
                status: 'healthy',
                service: 'captcha-server',
                timestamp: new Date().toISOString(),
                availableServices: Object.keys(SERVICE_ROUTES).map(k => SERVICE_ROUTES[k as keyof typeof SERVICE_ROUTES]),
            });
        }

        // Route to Store service: /store/*
        if (pathname.startsWith(SERVICE_ROUTES.STORE)) {
            const servicePath = pathname.substring(SERVICE_ROUTES.STORE.length) || '/';
            return handleStoreRequest(request, env, servicePath);
        }

        // Route to Solver service: /solver/{provider}/{vendor}/{type}/*
        if (pathname.startsWith(SERVICE_ROUTES.SOLVER)) {
            const servicePath = pathname.substring(SERVICE_ROUTES.SOLVER.length) || '/';
            return handleSolverRequest(request, env, servicePath);
        }

        return jsonResponse({ success: false, error: 'Not found' }, 404);
    },
} satisfies ExportedHandler<Env>;
