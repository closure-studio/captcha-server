/**
 * Validation utilities for API service
 */

import type {
    CreateTaskRequest,
    SubmitResultRequest,
    StatsParams,
    RecognitionData,
    BypassData,
    AssetData,
    StatsView,
    StatsInterval,
} from './types';

const VALID_PROVIDERS = ['geetest_v4', 'geetest_v3'];
const VALID_STATUSES = ['pending', 'success', 'failed', 'timeout', 'error'];
const VALID_CAPTCHA_TYPES = ['slide', 'word', 'icon'];
const VALID_RECOGNIZERS = ['TTShitu', 'Gemini', 'Aegir', 'Cloudflare', 'Nvidia'];
const VALID_BYPASS_TYPES = ['slide', 'click'];
const VALID_ASSET_TYPES = ['original', 'cropped', 'marked', 'background'];
const VALID_STATS_VIEWS = ['overview', 'by-type', 'by-recognizer', 'trend'];
const VALID_INTERVALS = ['hour', 'day'];

/**
 * Validate create task request
 */
export function validateCreateTaskRequest(data: unknown): data is CreateTaskRequest {
    if (!data || typeof data !== 'object') {
        return false;
    }
    const req = data as Record<string, unknown>;

    if (typeof req.challenge !== 'string' || req.challenge.trim() === '') {
        return false;
    }
    if (typeof req.provider !== 'string' || !VALID_PROVIDERS.includes(req.provider)) {
        return false;
    }
    if (req.geetestId !== undefined && typeof req.geetestId !== 'string') {
        return false;
    }
    if (req.captchaType !== undefined && !VALID_CAPTCHA_TYPES.includes(req.captchaType as string)) {
        return false;
    }
    if (req.riskType !== undefined && typeof req.riskType !== 'string') {
        return false;
    }
    return true;
}

/**
 * Validate recognition data
 */
export function validateRecognitionData(data: unknown): data is RecognitionData {
    if (!data || typeof data !== 'object') {
        return false;
    }
    const rec = data as Record<string, unknown>;

    if (typeof rec.recognizerName !== 'string' || !VALID_RECOGNIZERS.includes(rec.recognizerName)) {
        return false;
    }
    if (typeof rec.success !== 'boolean') {
        return false;
    }
    if (rec.attemptSeq !== undefined && typeof rec.attemptSeq !== 'number') {
        return false;
    }
    if (rec.points !== undefined && !Array.isArray(rec.points)) {
        return false;
    }
    return true;
}

/**
 * Validate bypass data
 */
export function validateBypassData(data: unknown): data is BypassData {
    if (!data || typeof data !== 'object') {
        return false;
    }
    const bp = data as Record<string, unknown>;

    if (typeof bp.bypassType !== 'string' || !VALID_BYPASS_TYPES.includes(bp.bypassType)) {
        return false;
    }
    if (typeof bp.success !== 'boolean') {
        return false;
    }
    return true;
}

/**
 * Validate asset data
 */
export function validateAssetData(data: unknown): data is AssetData {
    if (!data || typeof data !== 'object') {
        return false;
    }
    const asset = data as Record<string, unknown>;

    if (typeof asset.assetType !== 'string' || !VALID_ASSET_TYPES.includes(asset.assetType)) {
        return false;
    }
    if (typeof asset.r2Key !== 'string' || asset.r2Key.trim() === '') {
        return false;
    }
    return true;
}

/**
 * Validate submit result request
 */
export function validateSubmitResultRequest(data: unknown): data is SubmitResultRequest {
    if (!data || typeof data !== 'object') {
        return false;
    }
    const req = data as Record<string, unknown>;

    if (typeof req.taskId !== 'string' || req.taskId.trim() === '') {
        return false;
    }
    if (typeof req.status !== 'string' || !VALID_STATUSES.includes(req.status)) {
        return false;
    }

    // Validate recognition if present
    if (req.recognition !== undefined && !validateRecognitionData(req.recognition)) {
        return false;
    }

    // Validate recognitions array if present
    if (req.recognitions !== undefined) {
        if (!Array.isArray(req.recognitions)) {
            return false;
        }
        if (!req.recognitions.every(validateRecognitionData)) {
            return false;
        }
    }

    // Validate bypass if present
    if (req.bypass !== undefined && !validateBypassData(req.bypass)) {
        return false;
    }

    // Validate assets if present
    if (req.assets !== undefined) {
        if (!Array.isArray(req.assets)) {
            return false;
        }
        if (!req.assets.every(validateAssetData)) {
            return false;
        }
    }

    return true;
}

/**
 * Parse and validate stats params from URL
 */
export function parseStatsParams(url: URL): StatsParams | null {
    const view = url.searchParams.get('view') || 'overview';
    if (!VALID_STATS_VIEWS.includes(view)) {
        return null;
    }

    const params: StatsParams = { view: view as StatsView };

    const from = url.searchParams.get('from');
    if (from) {
        const fromNum = parseInt(from, 10);
        if (isNaN(fromNum)) return null;
        params.from = fromNum;
    }

    const to = url.searchParams.get('to');
    if (to) {
        const toNum = parseInt(to, 10);
        if (isNaN(toNum)) return null;
        params.to = toNum;
    }

    const interval = url.searchParams.get('interval');
    if (interval) {
        if (!VALID_INTERVALS.includes(interval)) return null;
        params.interval = interval as StatsInterval;
    }

    return params;
}
