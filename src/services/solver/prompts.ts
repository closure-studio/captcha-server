/**
 * Prompts for different captcha types
 * Used by vision-based solvers (Gemini, Cloudflare)
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
You are analyzing a GeeTest CAPTCHA image with Chinese characters.

CRITICAL REQUIREMENTS:
1. The hint bar (usually at top) shows target characters in a SPECIFIC ORDER
2. You must find each character's CENTER point in the main area
3. Coordinates MUST be returned in the EXACT SAME ORDER as the hint bar

STEP-BY-STEP PROCESS:
Step 1: Carefully read the hint bar from left to right. List each character.
Step 2: For each character in order, scan the main image area to find it.
Step 3: Identify the visual CENTER of each character (not edge).
Step 4: Calculate position as percentage: 
   - x_percent = (center_x / image_width) × 100
   - y_percent = (center_y / image_height) × 100

ACCURACY TIPS:
- Ignore similar-looking but different characters
- If a character appears multiple times, choose the most clearly visible one
- Double-check the order matches the hint bar exactly

OUTPUT FORMAT (JSON only, no explanation):
[{"x_percent": 20.5, "y_percent": 55.3}, {"x_percent": 45.2, "y_percent": 70.1}, ...]

Number of objects in array MUST equal number of characters in hint bar.
`,
};
