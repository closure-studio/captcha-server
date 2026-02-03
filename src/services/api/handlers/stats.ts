/**
 * Statistics handlers
 */

import { jsonResponse } from '../../../utils';
import { parseStatsParams } from '../validation';
import {
    overviewStatsQuery,
    byTypeStatsQuery,
    byRecognizerStatsQuery,
    trendStatsQuery,
} from '../queries';
import type {
    OverviewStats,
    TypeStats,
    RecognizerStats,
    TrendStats,
} from '../types';

/**
 * Handle GET /api/stats - Unified statistics endpoint
 */
export async function handleStats(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const params = parseStatsParams(url);

    if (!params) {
        return jsonResponse({ success: false, error: 'Invalid stats parameters' }, 400);
    }

    switch (params.view) {
        case 'overview':
            return handleOverviewStats(env, params.from, params.to);
        case 'by-type':
            return handleByTypeStats(env, params.from, params.to);
        case 'by-recognizer':
            return handleByRecognizerStats(env, params.from, params.to);
        case 'trend':
            return handleTrendStats(env, params.from, params.to, params.interval);
        default:
            return jsonResponse({ success: false, error: 'Unknown stats view' }, 400);
    }
}

async function handleOverviewStats(
    env: Env,
    from?: number,
    to?: number
): Promise<Response> {
    const row = await overviewStatsQuery(env.DB, from, to).first();

    if (!row) {
        return jsonResponse({
            success: true,
            data: {
                total: 0,
                success: 0,
                failed: 0,
                timeout: 0,
                error: 0,
                successRate: 0,
                avgDurationMs: null,
            } as OverviewStats,
        });
    }

    const data: OverviewStats = {
        total: row.total as number,
        success: row.success as number,
        failed: row.failed as number,
        timeout: row.timeout as number,
        error: row.error as number,
        successRate: row.success_rate as number ?? 0,
        avgDurationMs: row.avg_duration_ms as number | null,
    };

    return jsonResponse({ success: true, data });
}

async function handleByTypeStats(
    env: Env,
    from?: number,
    to?: number
): Promise<Response> {
    const result = await byTypeStatsQuery(env.DB, from, to).all();

    const data: TypeStats[] = result.results.map((row: Record<string, unknown>) => ({
        captchaType: row.captcha_type as TypeStats['captchaType'],
        total: row.total as number,
        success: row.success as number,
        successRate: row.success_rate as number ?? 0,
        avgDurationMs: row.avg_duration_ms as number | null,
    }));

    return jsonResponse({ success: true, data });
}

async function handleByRecognizerStats(
    env: Env,
    from?: number,
    to?: number
): Promise<Response> {
    const result = await byRecognizerStatsQuery(env.DB, from, to).all();

    const data: RecognizerStats[] = result.results.map((row: Record<string, unknown>) => ({
        recognizerName: row.recognizer_name as RecognizerStats['recognizerName'],
        total: row.total as number,
        success: row.success as number,
        successRate: row.success_rate as number ?? 0,
        avgElapsedMs: row.avg_elapsed_ms as number | null,
    }));

    return jsonResponse({ success: true, data });
}

async function handleTrendStats(
    env: Env,
    from?: number,
    to?: number,
    interval?: 'hour' | 'day'
): Promise<Response> {
    const result = await trendStatsQuery(env.DB, from, to, interval).all();

    const data: TrendStats[] = result.results.map((row: Record<string, unknown>) => ({
        time: row.time as string,
        total: row.total as number,
        success: row.success as number,
        successRate: row.success_rate as number ?? 0,
    }));

    return jsonResponse({ success: true, data });
}
