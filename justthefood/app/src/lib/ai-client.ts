/**
 * Multi-provider AI client abstraction
 * Supports: OpenAI, Google Gemini, Anthropic Claude
 */

import { getAddonConfig, type AIProvider } from './addon-config';

interface AICompletionOptions {
    systemPrompt: string;
    userPrompt: string;
    maxTokens?: number;
    temperature?: number;
    jsonMode?: boolean;
}

interface AICompletionResult {
    content: string;
    success: boolean;
    error?: string;
}

/**
 * Get the default model for each provider
 */
function getDefaultModel(provider: AIProvider): string {
    switch (provider) {
        case 'openai':
            return 'gpt-4o-mini';
        case 'gemini':
            return 'gemini-1.5-flash';
        case 'claude':
            return 'claude-3-haiku-20240307';
        default:
            return 'gpt-4o-mini';
    }
}

/**
 * Get the default base URL for each provider
 */
function getDefaultBaseUrl(provider: AIProvider): string {
    switch (provider) {
        case 'openai':
            return 'https://api.openai.com/v1';
        case 'gemini':
            return 'https://generativelanguage.googleapis.com/v1beta';
        case 'claude':
            return 'https://api.anthropic.com/v1';
        default:
            return 'https://api.openai.com/v1';
    }
}

/**
 * Check if AI is available and configured
 */
export function isAIEnabled(): boolean {
    const config = getAddonConfig();
    return config.aiEnabled && !!config.aiApiKey;
}

/**
 * Complete a prompt using the configured AI provider
 */
export async function completeAI(options: AICompletionOptions): Promise<AICompletionResult> {
    const config = getAddonConfig();

    if (!config.aiEnabled) {
        return { content: '', success: false, error: 'AI is disabled' };
    }

    if (!config.aiApiKey) {
        return { content: '', success: false, error: 'AI API key not configured' };
    }

    const provider = config.aiProvider;
    const model = config.aiModel || getDefaultModel(provider);
    const baseUrl = config.aiBaseUrl || getDefaultBaseUrl(provider);

    try {
        switch (provider) {
            case 'openai':
                return await completeOpenAI(config.aiApiKey, baseUrl, model, options);
            case 'gemini':
                return await completeGemini(config.aiApiKey, baseUrl, model, options);
            case 'claude':
                return await completeClaude(config.aiApiKey, baseUrl, model, options);
            default:
                return { content: '', success: false, error: `Unknown provider: ${provider}` };
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error(`AI completion error (${provider}):`, message);
        return { content: '', success: false, error: message };
    }
}

/**
 * OpenAI-compatible completion (also works with compatible APIs)
 */
async function completeOpenAI(
    apiKey: string,
    baseUrl: string,
    model: string,
    options: AICompletionOptions
): Promise<AICompletionResult> {
    const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model,
            messages: [
                { role: 'system', content: options.systemPrompt },
                { role: 'user', content: options.userPrompt },
            ],
            max_tokens: options.maxTokens || 1000,
            temperature: options.temperature ?? 0.1,
            ...(options.jsonMode && { response_format: { type: 'json_object' } }),
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    return { content, success: true };
}

/**
 * Google Gemini completion
 */
async function completeGemini(
    apiKey: string,
    baseUrl: string,
    model: string,
    options: AICompletionOptions
): Promise<AICompletionResult> {
    const response = await fetch(
        `${baseUrl}/models/${model}:generateContent?key=${apiKey}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [
                            { text: `${options.systemPrompt}\n\n${options.userPrompt}` }
                        ]
                    }
                ],
                generationConfig: {
                    maxOutputTokens: options.maxTokens || 1000,
                    temperature: options.temperature ?? 0.1,
                    ...(options.jsonMode && { responseMimeType: 'application/json' }),
                },
            }),
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return { content, success: true };
}

/**
 * Anthropic Claude completion
 */
async function completeClaude(
    apiKey: string,
    baseUrl: string,
    model: string,
    options: AICompletionOptions
): Promise<AICompletionResult> {
    const response = await fetch(`${baseUrl}/messages`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
            model,
            max_tokens: options.maxTokens || 1000,
            system: options.systemPrompt,
            messages: [
                { role: 'user', content: options.userPrompt }
            ],
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Claude API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const content = data.content?.[0]?.text || '';

    return { content, success: true };
}
