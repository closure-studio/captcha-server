/**
 * Types for Solver services
 */

/** Solver provider configuration */
export interface SolverProviderConfig {
    /** Base URL of the solver API */
    baseUrl: string;
    /** Optional custom headers */
    headers?: Record<string, string>;
}

/** Available solver providers */
export type SolverProvider = 'aegir' | 'gemini';

/** Available captcha vendors */
export type CaptchaVendor = 'geetest' | 'recaptcha';

/** Available captcha types */
export type CaptchaType = 'icon' | 'slider' | 'word';
