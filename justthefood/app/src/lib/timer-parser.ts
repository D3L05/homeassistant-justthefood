import type { TimerInfo } from './types';

/**
 * Parse time expressions from recipe instructions
 * Examples:
 * - "Bake for 25 minutes" → { durationSeconds: 1500 }
 * - "Let rest for 10-15 min" → { durationSeconds: 600 } (uses lower bound)
 * - "Simmer for 1 hour and 30 minutes" → { durationSeconds: 5400 }
 * - "Cook for about 45 seconds" → { durationSeconds: 45 }
 */
export function parseTimers(instruction: string): TimerInfo[] {
    const timers: TimerInfo[] = [];

    // Pattern to match time expressions
    // Matches: "for X minutes", "X min", "X-Y minutes", "X hour(s) and Y minute(s)"
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const patterns = [
        // Combined hours and minutes: "1 hour and 30 minutes", "1h 30min", "1 hora y 30 minutos"
        /(\d+)\s*(?:hours?|hrs?|h|horas?)\s*(?:and|y|\s)?\s*(\d+)\s*(?:minutes?|mins?|m|minutos?)(?!\w)/gi,
        // Hours only: "2 hours", "1 hr", "2 horas"
        /(\d+)\s*(?:hours?|hrs?|h|horas?)(?!\w)/gi,
        // Range of minutes: "10-15 minutes", "10-15 minutos" (use lower bound)
        /(\d+)\s*[-–]\s*\d+\s*(?:minutes?|mins?|m|minutos?)(?!\w)/gi,
        // Minutes only: "25 minutes", "30 min", "30 minutos"
        /(\d+)\s*(?:minutes?|mins?|m|minutos?)(?!\w)/gi,
        // Seconds: "45 seconds", "30 sec", "30 segundos"
        /(\d+)\s*(?:seconds?|secs?|s|segundos?)(?!\w)/gi,
    ];

    // Track what we've already matched to avoid duplicates
    const matchedRanges: [number, number][] = [];

    // Combined hours and minutes
    const combinedPattern = /(\d+)\s*(?:hours?|hrs?|h|horas?)\s*(?:and|y|\s)?\s*(\d+)\s*(?:minutes?|mins?|m|minutos?)(?!\w)/gi;
    let match;
    while ((match = combinedPattern.exec(instruction)) !== null) {
        const hours = parseInt(match[1], 10);
        const minutes = parseInt(match[2], 10);
        const durationSeconds = hours * 3600 + minutes * 60;

        if (durationSeconds > 0 && !isOverlapping(match.index, match.index + match[0].length, matchedRanges)) {
            matchedRanges.push([match.index, match.index + match[0].length]);
            timers.push({
                durationSeconds,
                label: extractLabel(instruction, match.index),
                originalText: match[0],
            });
        }
    }

    // Hours only
    const hoursPattern = /(\d+)\s*(?:hours?|hrs?|h|horas?)(?!\w)/gi;
    while ((match = hoursPattern.exec(instruction)) !== null) {
        if (isOverlapping(match.index, match.index + match[0].length, matchedRanges)) continue;

        const hours = parseInt(match[1], 10);
        const durationSeconds = hours * 3600;

        if (durationSeconds > 0) {
            matchedRanges.push([match.index, match.index + match[0].length]);
            timers.push({
                durationSeconds,
                label: extractLabel(instruction, match.index),
                originalText: match[0],
            });
        }
    }

    // Range of minutes (use lower bound)
    const rangePattern = /(\d+)\s*[-–]\s*\d+\s*(?:minutes?|mins?|m|minutos?)(?!\w)/gi;
    while ((match = rangePattern.exec(instruction)) !== null) {
        if (isOverlapping(match.index, match.index + match[0].length, matchedRanges)) continue;

        const minutes = parseInt(match[1], 10);
        const durationSeconds = minutes * 60;

        if (durationSeconds > 0) {
            matchedRanges.push([match.index, match.index + match[0].length]);
            timers.push({
                durationSeconds,
                label: extractLabel(instruction, match.index),
                originalText: match[0],
            });
        }
    }

    // Minutes only
    const minutesPattern = /(\d+)\s*(?:minutes?|mins?|m|minutos?)(?!\w)/gi;
    while ((match = minutesPattern.exec(instruction)) !== null) {
        if (isOverlapping(match.index, match.index + match[0].length, matchedRanges)) continue;

        const minutes = parseInt(match[1], 10);
        const durationSeconds = minutes * 60;

        if (durationSeconds > 0) {
            matchedRanges.push([match.index, match.index + match[0].length]);
            timers.push({
                durationSeconds,
                label: extractLabel(instruction, match.index),
                originalText: match[0],
            });
        }
    }

    // Seconds
    const secondsPattern = /(\d+)\s*(?:seconds?|secs?|s|segundos?)(?!\w)/gi;
    while ((match = secondsPattern.exec(instruction)) !== null) {
        if (isOverlapping(match.index, match.index + match[0].length, matchedRanges)) continue;

        const seconds = parseInt(match[1], 10);

        if (seconds > 0) {
            matchedRanges.push([match.index, match.index + match[0].length]);
            timers.push({
                durationSeconds: seconds,
                label: extractLabel(instruction, match.index),
                originalText: match[0],
            });
        }
    }

    return timers;
}

function isOverlapping(start: number, end: number, ranges: [number, number][]): boolean {
    return ranges.some(([s, e]) => start < e && end > s);
}

/**
 * Extract a meaningful label from the text before the time expression
 * E.g., "Bake for 25 minutes" → "Bake"
 */
function extractLabel(instruction: string, matchIndex: number): string {
    // Get text before the time expression
    const textBefore = instruction.slice(0, matchIndex).trim();

    // Common cooking verbs to look for (English and Spanish)
    const cookingVerbs = [
        // English
        'bake', 'cook', 'simmer', 'boil', 'roast', 'grill', 'fry', 'sauté', 'saute',
        'steam', 'broil', 'poach', 'braise', 'toast', 'brown', 'heat', 'warm',
        'let rest', 'rest', 'cool', 'chill', 'refrigerate', 'freeze', 'marinate',
        'rise', 'proof', 'ferment', 'set', 'wait', 'stand', 'sit', 'soak',
        // Spanish
        'hornear', 'cocinar', 'cocer', 'hervir', 'asar', 'freír', 'freir', 'saltear',
        'dorar', 'calentar', 'reposar', 'descansar', 'enfriar', 'refrigerar', 'congelar',
        'marinar', 'leudar', 'fermentar', 'esperar', 'dejar reposar', 'dejar enfriar',
        'remojar', 'remojo', 'hidratar', 'ablandar', 'sofreír', 'sofreir', 'guisar',
        'estofar', 'reducir', 'infusionar', 'macerar', 'blanquear'
    ];

    // Look for a cooking verb in the text before
    const lowerText = textBefore.toLowerCase();
    for (const verb of cookingVerbs) {
        if (lowerText.includes(verb)) {
            // Capitalize first letter
            return verb.charAt(0).toUpperCase() + verb.slice(1);
        }
    }

    // Default: use generic timer label
    return 'Timer';
}

/**
 * Format seconds to human-readable time string
 */
export function formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    const parts: string[] = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0 && hours === 0) parts.push(`${secs}s`);

    return parts.join(' ') || '0s';
}

/**
 * AI-powered timer extraction fallback
 * Uses configured AI provider to extract time expressions when regex fails
 */
export async function parseTimersWithAI(instruction: string): Promise<TimerInfo[]> {
    // First try regex
    const regexTimers = parseTimers(instruction);
    if (regexTimers.length > 0) {
        return regexTimers;
    }

    // Use AI client for fallback
    const { isAIEnabled, completeAI } = await import('./ai-client');

    if (!isAIEnabled()) {
        return []; // AI not enabled or not configured
    }

    try {
        const result = await completeAI({
            systemPrompt: `Extract cooking timer information from recipe instructions.
Return a JSON object with a "timers" array. Each timer should have:
- durationSeconds: total seconds (integer)
- label: short action label like "Cook", "Bake", "Rest" (in the same language as the instruction)

Examples:
"Bake for 25 minutes" → {"timers": [{"durationSeconds": 1500, "label": "Bake"}]}
"Cocinar por 30 minutos" → {"timers": [{"durationSeconds": 1800, "label": "Cocinar"}]}
"Let it rest a couple of hours" → {"timers": [{"durationSeconds": 7200, "label": "Rest"}]}
"Dejar reposar unos 20 minutos" → {"timers": [{"durationSeconds": 1200, "label": "Reposar"}]}

If no time is found, return {"timers": []}.
Return ONLY valid JSON.`,
            userPrompt: instruction,
            maxTokens: 200,
            temperature: 0.1,
            jsonMode: true,
        });

        if (!result.success || !result.content) {
            return [];
        }

        const parsed = JSON.parse(result.content);
        const timers = parsed.timers || parsed;

        if (!Array.isArray(timers)) return [];

        return timers.map((t: any) => ({
            durationSeconds: parseInt(t.durationSeconds, 10) || 0,
            label: t.label || 'Timer',
            originalText: instruction.slice(0, 50)
        })).filter((t: TimerInfo) => t.durationSeconds > 0);

    } catch (error) {
        console.warn('AI timer extraction failed:', error);
        return [];
    }
}
