/**
 * Statistics-related database queries
 */

import type { StatsInterval } from '../types';

/**
 * Default time range: last 24 hours
 */
function getDefaultTimeRange(): { from: number; to: number } {
    const now = Date.now();
    return {
        from: now - 24 * 60 * 60 * 1000,
        to: now,
    };
}

/**
 * Query for overview statistics
 */
export function overviewStatsQuery(db: D1Database, from?: number, to?: number) {
    const range = from !== undefined && to !== undefined ? { from, to } : getDefaultTimeRange();
    return db
        .prepare(
            `SELECT
                COUNT(*) as total,
                SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success,
                SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
                SUM(CASE WHEN status = 'timeout' THEN 1 ELSE 0 END) as timeout,
                SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as error,
                ROUND(100.0 * SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 2) as success_rate,
                ROUND(AVG(duration_ms)) as avg_duration_ms
             FROM captcha_tasks
             WHERE created_at >= ? AND created_at <= ?`
        )
        .bind(range.from, range.to);
}

/**
 * Query for by-type statistics
 */
export function byTypeStatsQuery(db: D1Database, from?: number, to?: number) {
    const range = from !== undefined && to !== undefined ? { from, to } : getDefaultTimeRange();
    return db
        .prepare(
            `SELECT
                captcha_type,
                COUNT(*) as total,
                SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success,
                ROUND(100.0 * SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 2) as success_rate,
                ROUND(AVG(duration_ms)) as avg_duration_ms
             FROM captcha_tasks
             WHERE created_at >= ? AND created_at <= ? AND captcha_type IS NOT NULL
             GROUP BY captcha_type`
        )
        .bind(range.from, range.to);
}

/**
 * Query for by-recognizer statistics
 */
export function byRecognizerStatsQuery(db: D1Database, from?: number, to?: number) {
    const range = from !== undefined && to !== undefined ? { from, to } : getDefaultTimeRange();
    return db
        .prepare(
            `SELECT
                recognizer_name,
                COUNT(*) as total,
                SUM(success) as success,
                ROUND(100.0 * SUM(success) / NULLIF(COUNT(*), 0), 2) as success_rate,
                ROUND(AVG(elapsed_ms)) as avg_elapsed_ms
             FROM recognition_attempts
             WHERE created_at >= ? AND created_at <= ?
             GROUP BY recognizer_name`
        )
        .bind(range.from, range.to);
}

/**
 * Query for trend statistics
 */
export function trendStatsQuery(
    db: D1Database,
    from?: number,
    to?: number,
    interval: StatsInterval = 'hour'
) {
    const range = from !== undefined && to !== undefined ? { from, to } : getDefaultTimeRange();

    // Time format based on interval
    const timeFormat = interval === 'hour' ? '%Y-%m-%d %H:00' : '%Y-%m-%d';

    return db
        .prepare(
            `SELECT
                strftime('${timeFormat}', datetime(created_at / 1000, 'unixepoch')) as time,
                COUNT(*) as total,
                SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success,
                ROUND(100.0 * SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 2) as success_rate
             FROM captcha_tasks
             WHERE created_at >= ? AND created_at <= ?
             GROUP BY time
             ORDER BY time ASC`
        )
        .bind(range.from, range.to);
}
