/**
 * Addon configuration from Home Assistant
 */

export type AIProvider = 'openai' | 'gemini' | 'claude';

export interface AddonConfig {
    timerMode: 'home_assistant' | 'built_in';
    timerEntity: string;
    notificationService: string;
    ttsEnabled: boolean;
    ttsService: string;
    ttsEntity: string;
    // AI Configuration
    aiEnabled: boolean;
    aiProvider: AIProvider;
    aiApiKey: string;
    aiBaseUrl: string;
    aiModel: string;
}

/**
 * Get addon configuration from environment variables
 * These are set by run.sh from /data/options.json
 */
export function getAddonConfig(): AddonConfig {
    return {
        timerMode: (process.env.TIMER_MODE as 'home_assistant' | 'built_in') || 'built_in',
        timerEntity: process.env.TIMER_ENTITY || 'timer.cooking_timer',
        notificationService: process.env.NOTIFICATION_SERVICE || '',
        ttsEnabled: process.env.TTS_ENABLED === 'true',
        ttsService: process.env.TTS_SERVICE || 'tts.google_translate_say',
        ttsEntity: process.env.TTS_ENTITY || '',
        // AI Configuration
        aiEnabled: process.env.AI_ENABLED === 'true',
        aiProvider: (process.env.AI_PROVIDER as AIProvider) || 'openai',
        aiApiKey: process.env.AI_API_KEY || '',
        aiBaseUrl: process.env.AI_BASE_URL || '',
        aiModel: process.env.AI_MODEL || '',
    };
}
