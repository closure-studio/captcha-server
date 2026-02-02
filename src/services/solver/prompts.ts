/**
 * Prompts for different captcha types
 * Used by vision-based solvers (Gemini, Meta)
 */

import type { CaptchaType } from './types';

export const DEFAULT_PROMPTS: Record<CaptchaType, string> = {
	slider: `
Find the puzzle gap in this slider CAPTCHA.

Return the gap's LEFT EDGE position as a percentage of image width.
Return the gap's vertical center as a percentage of image height.

Think step by step:
1. The image width is 100% (left edge = 0%, right edge = 100%)
2. Locate where the gap starts horizontally
3. Express as percentage

Example: If gap starts 65% across from left and centered at 48% from top:
{"x_percent": 65, "y_percent": 48}

Format: {"x_percent": number, "y_percent": number}
Only JSON.
`,

	icon: `
You are solving a GeeTest icon-click CAPTCHA.

The image has a hint bar at the top (or bottom) showing target icons/objects in a specific order.
Those same icons appear scattered across the main image area.

Your task:
1. Identify the target icons from the hint bar (left to right).
2. Locate each target icon's CENTER position in the main image area.
3. Return their positions IN THE SAME ORDER as the hint, as percentages of image width and height.

Return a JSON array of objects, one per icon, in order:
[{"x_percent": number, "y_percent": number}, ...]

Example for 3 icons:
[{"x_percent": 25, "y_percent": 60}, {"x_percent": 70, "y_percent": 45}, {"x_percent": 50, "y_percent": 80}]

Only JSON. No explanation.
`,

	word: `
You are solving a GeeTest word-click CAPTCHA.

The image has a hint bar showing Chinese characters/words in a specific order.
Those same characters appear scattered across the main image area.

Your task:
1. Identify the target characters from the hint bar (left to right).
2. Locate each target character's CENTER position in the main image area.
3. Return their positions IN THE SAME ORDER as the hint, as percentages of image width and height.

Return a JSON array of objects, one per character, in order:
[{"x_percent": number, "y_percent": number}, ...]

Example for 4 characters:
[{"x_percent": 20, "y_percent": 55}, {"x_percent": 45, "y_percent": 70}, {"x_percent": 65, "y_percent": 45}, {"x_percent": 80, "y_percent": 60}]

Only JSON. No explanation.
`,
};
