/**
 * Type definitions for API service
 */

// Task status enum
export type TaskStatus = 'pending' | 'success' | 'failed' | 'timeout' | 'error';

// Captcha types
export type CaptchaType = 'slide' | 'word' | 'icon';

// Provider types
export type Provider = 'geetest_v4' | 'geetest_v3';

// Recognizer names
export type RecognizerName = 'TTShitu' | 'Gemini' | 'Aegir' | 'Cloudflare' | 'Nvidia';

// Bypass types
export type BypassType = 'slide' | 'click';

// Asset types
export type AssetType = 'original' | 'cropped' | 'marked' | 'background';

// Stats view types
export type StatsView = 'overview' | 'by-type' | 'by-recognizer' | 'trend';

// Stats interval
export type StatsInterval = 'hour' | 'day';

/**
 * Point coordinate
 */
export interface Point {
    x: number;
    y: number;
}

/**
 * Task from database
 */
export interface CaptchaTask {
    task_id: string;
    captcha_type: CaptchaType | null;
    provider: Provider;
    geetest_id: string | null;
    challenge: string;
    risk_type: string | null;
    status: TaskStatus;
    lot_number: string | null;
    captcha_output: string | null;
    pass_token: string | null;
    gen_time: string | null;
    error_message: string | null;
    created_at: number;
    started_at: number | null;
    completed_at: number | null;
    duration_ms: number | null;
}

/**
 * Task list item (API response)
 */
export interface TaskListItem {
    taskId: string;
    challenge: string;
    geetestId: string | null;
    provider: Provider;
    riskType: string | null;
    type: CaptchaType | null;
    createdAt: number;
}

/**
 * Create task request
 */
export interface CreateTaskRequest {
    challenge: string;
    provider: Provider;
    geetestId?: string;
    captchaType?: CaptchaType;
    riskType?: string;
}

/**
 * Recognition attempt data
 */
export interface RecognitionData {
    recognizerName: RecognizerName;
    attemptSeq?: number;
    success: boolean;
    captchaId?: string;
    points?: Point[];
    message?: string;
    elapsedMs?: number;
    errorReported?: boolean;
}

/**
 * Bypass attempt data
 */
export interface BypassData {
    bypassType: BypassType;
    success: boolean;
    message?: string;
    configJson?: string;
    targetX?: number;
    actualSteps?: number;
}

/**
 * Asset data
 */
export interface AssetData {
    assetType: AssetType;
    r2Key: string;
    fileSize?: number;
    width?: number;
    height?: number;
}

/**
 * GeeTest result credentials
 */
export interface GeetestResult {
    lot_number: string;
    captcha_output: string;
    pass_token: string;
    gen_time: string;
}

/**
 * Submit result request
 */
export interface SubmitResultRequest {
    taskId: string;
    status: TaskStatus;
    result?: GeetestResult;
    duration?: number;
    errorMessage?: string;
    recognition?: RecognitionData;
    recognitions?: RecognitionData[];
    bypass?: BypassData;
    assets?: AssetData[];

    // Task origin info (for when task is not pre-created in D1)
    challenge?: string;
    geetestId?: string;
    provider?: Provider;
    captchaType?: CaptchaType;
    riskType?: string;
}

/**
 * Stats query params
 */
export interface StatsParams {
    view: StatsView;
    from?: number;
    to?: number;
    interval?: StatsInterval;
}

/**
 * Overview stats response
 */
export interface OverviewStats {
    total: number;
    success: number;
    failed: number;
    timeout: number;
    error: number;
    successRate: number;
    avgDurationMs: number | null;
}

/**
 * By-type stats item
 */
export interface TypeStats {
    captchaType: CaptchaType;
    total: number;
    success: number;
    successRate: number;
    avgDurationMs: number | null;
}

/**
 * By-recognizer stats item
 */
export interface RecognizerStats {
    recognizerName: RecognizerName;
    total: number;
    success: number;
    successRate: number;
    avgElapsedMs: number | null;
}

/**
 * Trend stats item
 */
export interface TrendStats {
    time: string;
    total: number;
    success: number;
    successRate: number;
}
